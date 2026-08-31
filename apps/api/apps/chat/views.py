from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ChatSession, ChatMessage
from .serializers import ChatSessionSerializer, ChatRequestSerializer, ChatMessageSerializer
from core.rag import RAGService

class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatSessionSerializer
    
    def get_queryset(self):
        queryset = ChatSession.objects.filter(user=self.request.user).order_by('-updated_at')
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        return queryset

    @action(detail=False, methods=['post'])
    def message(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        session_id = serializer.validated_data.get('session_id')
        document_id = serializer.validated_data.get('document_id')
        user_message = serializer.validated_data['message']
        
        # Get or create session
        if session_id:
            try:
                session = ChatSession.objects.get(id=session_id, user=request.user)
            except ChatSession.DoesNotExist:
                return Response({'error': True, 'message': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Generate a simple title from the first message
            title = user_message[:30] + '...' if len(user_message) > 30 else user_message
            session = ChatSession.objects.create(user=request.user, document_id=document_id, title=title)
            
        # Save user message
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.USER,
            content=user_message
        )
        
        # Run RAG
        try:
            rag_service = RAGService()
            answer, references = rag_service.generate_answer(request.user, user_message)
        except Exception as e:
            # Fallback or generic error handling
            answer = f"Maaf, terjadi kesalahan teknis saat menghubungi AI: {str(e)}"
            references = []
            print(f"RAG Error: {e}")
            
        # Save AI response
        ai_message = ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.AI,
            content=answer,
            references=references
        )
        
        return Response({
            'error': False,
            'message': 'Message processed',
            'data': {
                'session_id': session.id,
                'ai_message': ChatMessageSerializer(ai_message).data
            }
        })
