from rest_framework import serializers
from .models import Document, DocumentChunk

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'name', 'mime_type', 'size', 'status', 'error_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'error_message', 'created_at', 'updated_at']

class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)
