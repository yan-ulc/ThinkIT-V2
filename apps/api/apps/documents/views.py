from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Sum
from django.http import FileResponse
from .models import Document, Quiz, QuizQuestion
from .serializers import DocumentSerializer, DocumentUploadSerializer, QuizSerializer
from .tasks import process_document_task
from core.storage import StorageClient
from core.quiz_generator import QuizGeneratorService
import uuid

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        queryset = Document.objects.filter(user=self.request.user).order_by('-created_at')
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search.strip())
        return queryset

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        
        # Validasi format PDF
        if not uploaded_file.name.lower().endswith('.pdf'):
            return Response({'error': True, 'message': 'Only PDF files are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

        # Upload ke storage via S3/R2
        storage_client = StorageClient()
        try:
            file_key = storage_client.upload_file_obj(uploaded_file, uploaded_file.name)
        except Exception as e:
            return Response({'error': True, 'message': f'Failed to upload to storage: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Buat record Document
        doc = Document.objects.create(
            user=request.user,
            name=uploaded_file.name,
            storage_key=file_key,
            mime_type=uploaded_file.content_type,
            size=uploaded_file.size,
            status=Document.StatusChoices.QUEUED
        )
        
        # Trigger Celery Task
        process_document_task.delay(str(doc.id))
        
        return Response({
            'error': False,
            'message': 'Document uploaded and queued for processing.',
            'data': DocumentSerializer(doc).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        doc = self.get_object()
        storage_client = StorageClient()
        try:
            url = storage_client.generate_presigned_url(doc.storage_key)
            return Response({
                'error': False,
                'message': 'Presigned URL generated',
                'data': {'url': url}
            })
        except Exception as e:
            return Response({'error': True, 'message': f'Failed to generate URL: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def file(self, request, pk=None):
        doc = self.get_object()
        storage_client = StorageClient()
        try:
            s3_response = storage_client.s3_client.get_object(
                Bucket=storage_client.bucket,
                Key=doc.storage_key
            )
            response = FileResponse(s3_response['Body'], content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{doc.name}"'
            return response
        except Exception as e:
            return Response({'error': True, 'message': f'Failed to retrieve document file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def stream(self, request):
        import redis
        import json
        from django.conf import settings
        from django.http import StreamingHttpResponse

        def event_stream():
            user = request.user
            # First send the current state
            docs = Document.objects.filter(user=user).order_by('-created_at')
            initial_data = DocumentSerializer(docs, many=True).data
            yield f"data: {json.dumps(initial_data)}\n\n"

            # Connect to Redis to listen for updates
            r = redis.from_url(settings.CELERY_RESULT_BACKEND)
            pubsub = r.pubsub()
            pubsub.subscribe(f"user_{user.id}_docs")

            try:
                for message in pubsub.listen():
                    if message['type'] == 'message':
                        docs = Document.objects.filter(user=user).order_by('-created_at')
                        new_data = DocumentSerializer(docs, many=True).data
                        yield f"data: {json.dumps(new_data)}\n\n"
            except Exception:
                pass
            finally:
                pubsub.close()

        return StreamingHttpResponse(event_stream(), content_type='text/event-stream')

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        user = request.user
        user_docs = Document.objects.filter(user=user)

        total_documents = user_docs.count()
        storage_agg = user_docs.aggregate(total_bytes=Sum('size'))
        total_storage_bytes = storage_agg['total_bytes'] or 0
        storage_used_mb = round(total_storage_bytes / (1024 * 1024), 2)

        from apps.chat.models import ChatMessage
        ai_queries_used = ChatMessage.objects.filter(
            session__user=user,
            sender=ChatMessage.SenderChoices.USER
        ).count()

        return Response({
            'error': False,
            'message': 'Document analytics retrieved successfully',
            'data': {
                'total_documents': total_documents,
                'total_storage_bytes': total_storage_bytes,
                'storage_used_mb': storage_used_mb,
                'ai_queries_used': ai_queries_used,
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='generate-quiz')
    def generate_quiz(self, request, pk=None):
        doc = self.get_object()
        if doc.status != Document.StatusChoices.READY:
            return Response({
                'error': True,
                'message': f'Cannot generate quiz. Document status is {doc.status}. Document must be READY.'
            }, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title')
        if title and isinstance(title, str):
            title = title.strip()
            if not title:
                title = None
        else:
            title = None

        num_questions = request.data.get('num_questions', 5)
        try:
            num_questions = int(num_questions)
            if num_questions not in [5, 10, 15, 20]:
                return Response({
                    'error': True,
                    'message': 'Jumlah pertanyaan (num_questions) harus salah satu dari: 5, 10, 15, atau 20.'
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                'error': True,
                'message': 'num_questions harus berupa bilangan bulat (5, 10, 15, atau 20).'
            }, status=status.HTTP_400_BAD_REQUEST)

        generator = QuizGeneratorService()
        try:
            quiz = generator.generate_quiz_for_document(doc, request.user, title=title, num_questions=num_questions)
            return Response({
                'error': False,
                'message': 'Quiz generated successfully',
                'data': QuizSerializer(quiz).data
            }, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({
                'error': True,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'error': True,
                'message': f'Failed to generate quiz: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], url_path='quizzes')
    def quizzes(self, request, pk=None):
        doc = self.get_object()
        quizzes = Quiz.objects.filter(document=doc, user=request.user).prefetch_related('questions').order_by('-created_at')
        return Response({
            'error': False,
            'message': 'Quizzes retrieved successfully',
            'data': QuizSerializer(quizzes, many=True).data
        }, status=status.HTTP_200_OK)


class QuizViewSet(viewsets.GenericViewSet, mixins.RetrieveModelMixin, mixins.ListModelMixin, mixins.DestroyModelMixin):
    permission_classes = [IsAuthenticated]
    serializer_class = QuizSerializer

    def get_queryset(self):
        return Quiz.objects.filter(user=self.request.user).prefetch_related('questions').order_by('-created_at')

    def destroy(self, request, *args, **kwargs):
        quiz = self.get_object()
        quiz.delete()
        return Response({
            'error': False,
            'message': 'Quiz deleted successfully'
        }, status=status.HTTP_200_OK)

