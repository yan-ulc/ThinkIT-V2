import uuid
from django.db import models
from django.conf import settings
from pgvector.django import VectorField, HnswIndex

class Document(models.Model):
    class StatusChoices(models.TextChoices):
        UPLOADING = 'UPLOADING', 'Uploading'
        QUEUED = 'QUEUED', 'Queued'
        PROCESSING = 'PROCESSING', 'Processing'
        READY = 'READY', 'Ready'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    storage_key = models.CharField(max_length=1024)
    mime_type = models.CharField(max_length=100)
    size = models.BigIntegerField()
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.UPLOADING)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return self.name

class DocumentChunk(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    chunk_index = models.IntegerField()
    content = models.TextField()
    embedding = VectorField(dimensions=1536)
    token_count = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            HnswIndex(
                name="idx_chunks_embedding",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} of {self.document.name}"

import json
import redis
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Document)
def broadcast_document_update(sender, instance, **kwargs):
    try:
        r = redis.from_url(settings.CELERY_RESULT_BACKEND) # Using the existing redis url
        # Just send a ping to the user's channel to trigger a refetch in the SSE view
        r.publish(f"user_{instance.user_id}_docs", "updated")
    except Exception as e:
        pass # Best effort
