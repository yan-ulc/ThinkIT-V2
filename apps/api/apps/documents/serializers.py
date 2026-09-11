from django.db.models import Max
from rest_framework import serializers
from .models import Document, DocumentChunk, Quiz, QuizQuestion, QuizAttempt

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

class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = [
            'id',
            'quiz',
            'user',
            'score',
            'total_questions',
            'percentage',
            'answers',
            'completed_at',
        ]
        read_only_fields = fields

class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    document_name = serializers.CharField(source='document.name', read_only=True)
    total_questions = serializers.SerializerMethodField()
    total_flashcards = serializers.SerializerMethodField()
    highest_score = serializers.SerializerMethodField()
    highest_percentage = serializers.SerializerMethodField()
    total_attempts = serializers.SerializerMethodField()

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
            'total_flashcards',
            'highest_score',
            'highest_percentage',
            'total_attempts',
            'questions',
        ]
        read_only_fields = fields

    def get_total_questions(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'questions' in obj._prefetched_objects_cache:
            return sum(1 for q in obj.questions.all() if q.question_type == QuizQuestion.QuestionType.MULTIPLE_CHOICE)
        return obj.questions.filter(question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE).count()

    def get_total_flashcards(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'questions' in obj._prefetched_objects_cache:
            return sum(1 for q in obj.questions.all() if q.question_type == QuizQuestion.QuestionType.FLASHCARD)
        return obj.questions.filter(question_type=QuizQuestion.QuestionType.FLASHCARD).count()

    def get_highest_score(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else getattr(obj, 'user', None)
        if not user:
            return None
        attempts = obj.attempts.filter(user=user)
        if not attempts.exists():
            return None
        return attempts.aggregate(Max('score'))['score__max']

    def get_highest_percentage(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else getattr(obj, 'user', None)
        if not user:
            return None
        attempts = obj.attempts.filter(user=user)
        if not attempts.exists():
            return None
        return attempts.aggregate(Max('percentage'))['percentage__max']

    def get_total_attempts(self, obj):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else getattr(obj, 'user', None)
        if not user:
            return 0
        return obj.attempts.filter(user=user).count()


