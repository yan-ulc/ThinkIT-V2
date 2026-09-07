from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Sum, Max
from django.http import FileResponse
from .models import Document, Quiz, QuizQuestion, QuizAttempt
from .serializers import DocumentSerializer, DocumentUploadSerializer, QuizSerializer, QuizAttemptSerializer
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

    @action(detail=True, methods=['post'], url_path='submit')
    def submit(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        # Fetch only MCQ questions for grading
        mcq_questions = list(quiz.questions.filter(question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE).order_by('order'))
        if not mcq_questions:
            return Response({
                'error': True,
                'message': 'Kuis ini tidak memiliki pertanyaan pilihan ganda untuk dinilai.'
            }, status=status.HTTP_400_BAD_REQUEST)

        answers = request.data.get('answers', {})
        if not isinstance(answers, dict):
            return Response({
                'error': True,
                'message': 'Format answers harus berupa object/dictionary {question_index_or_id: selected_answer}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        unanswered_questions = []
        graded_results = []
        correct_count = 0

        for idx, q in enumerate(mcq_questions):
            q_id_str = str(q.id)
            idx_str = str(idx)

            chosen_answer = answers.get(q_id_str) or answers.get(idx_str)
            if not chosen_answer or not isinstance(chosen_answer, str) or not chosen_answer.strip():
                unanswered_questions.append(idx + 1)
                continue

            chosen_answer = chosen_answer.strip()
            is_correct = (
                chosen_answer == q.correct_answer or
                (len(q.correct_answer) >= 2 and chosen_answer.startswith(q.correct_answer[:2]))
            )
            if is_correct:
                correct_count += 1

            graded_results.append({
                'question_id': str(q.id),
                'order': q.order or (idx + 1),
                'question_text': q.question_text,
                'selected_answer': chosen_answer,
                'correct_answer': q.correct_answer,
                'is_correct': is_correct,
                'explanation': q.explanation
            })

        if unanswered_questions:
            return Response({
                'error': True,
                'message': f'Semua soal wajib dijawab sebelum submit. Soal yang belum dijawab: nomor {", ".join(map(str, unanswered_questions))}.',
                'unanswered_questions': unanswered_questions
            }, status=status.HTTP_400_BAD_REQUEST)

        total_mcq = len(mcq_questions)
        percentage = round((correct_count / total_mcq) * 100, 1)

        prev_highest = quiz.attempts.filter(user=user).aggregate(Max('percentage'))['percentage__max']
        is_new_high_score = prev_highest is None or percentage > prev_highest

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=user,
            score=correct_count,
            total_questions=total_mcq,
            percentage=percentage,
            answers=answers
        )

        all_attempts_count = quiz.attempts.filter(user=user).count()
        current_highest_percentage = max(prev_highest or 0.0, percentage)

        return Response({
            'error': False,
            'message': 'Kuis berhasil diselesaikan dan dinilai.',
            'data': {
                'attempt_id': str(attempt.id),
                'score': correct_count,
                'total_questions': total_mcq,
                'percentage': percentage,
                'is_new_high_score': is_new_high_score,
                'highest_percentage': current_highest_percentage,
                'total_attempts': all_attempts_count,
                'completed_at': attempt.completed_at.isoformat(),
                'results': graded_results
            }
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='attempts')
    def attempts(self, request, pk=None):
        quiz = self.get_object()
        user_attempts = quiz.attempts.filter(user=request.user).order_by('-completed_at')
        highest_score = user_attempts.aggregate(Max('score'))['score__max']
        highest_percentage = user_attempts.aggregate(Max('percentage'))['percentage__max']

        return Response({
            'error': False,
            'message': 'Riwayat attempt berhasil diambil.',
            'data': {
                'quiz_id': str(quiz.id),
                'quiz_title': quiz.title,
                'highest_score': highest_score,
                'highest_percentage': highest_percentage,
                'total_attempts': user_attempts.count(),
                'attempts': QuizAttemptSerializer(user_attempts, many=True).data
            }
        }, status=status.HTTP_200_OK)


