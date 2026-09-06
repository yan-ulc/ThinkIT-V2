from rest_framework import serializers
from .models import Document, DocumentChunk, Quiz, QuizQuestion

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'name', 'mime_type', 'size', 'status', 'error_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'error_message', 'created_at', 'updated_at']

class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)

class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = [
            'id',
            'question_type',
            'question_text',
            'options',
            'correct_answer',
            'explanation',
            'order',
            'created_at',
        ]
        read_only_fields = fields

class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    document_name = serializers.CharField(source='document.name', read_only=True)
    total_questions = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id',
            'document',
            'document_name',
            'title',
            'created_at',
            'updated_at',
            'total_questions',
            'questions',
        ]
        read_only_fields = fields

    def get_total_questions(self, obj):
        return obj.questions.count()

