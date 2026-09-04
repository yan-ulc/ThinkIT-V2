from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Sum
from .models import Document, DocumentChunk
from .serializers import DocumentSerializer, DocumentUploadSerializer
from .tasks import process_document_task
from core.storage import StorageClient
import uuid

class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user).order_by('-created_at')

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

        total_chunks = DocumentChunk.objects.filter(user=user).count()

        status_counts = {
            'ready': user_docs.filter(status=Document.StatusChoices.READY).count(),
            'processing': user_docs.filter(status=Document.StatusChoices.PROCESSING).count(),
            'queued': user_docs.filter(status=Document.StatusChoices.QUEUED).count(),
            'failed': user_docs.filter(status=Document.StatusChoices.FAILED).count(),
            'uploading': user_docs.filter(status=Document.StatusChoices.UPLOADING).count(),
        }

        return Response({
            'error': False,
            'message': 'Document analytics retrieved successfully',
            'data': {
                'total_documents': total_documents,
                'total_storage_bytes': total_storage_bytes,
                'storage_used_mb': storage_used_mb,
                'total_chunks': total_chunks,
                'status_counts': status_counts,
            }
        }, status=status.HTTP_200_OK)
