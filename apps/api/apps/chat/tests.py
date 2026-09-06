import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
import uuid

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, db):
    user = User.objects.create_user(
        email='testchat@example.com',
        password='password123'
    )
    res = api_client.post('/api/v1/auth/login/', {
        'email': 'testchat@example.com',
        'password': 'password123'
    }, format='json')
    
    token = res.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    api_client.user = user
    return api_client

@pytest.mark.django_db
class TestChat:
    def test_list_chat_sessions_empty(self, authenticated_client):
        # We need a random UUID for the document_id
        doc_id = str(uuid.uuid4())
        response = authenticated_client.get(f'/api/v1/chat/?document_id={doc_id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert len(response.data['data']) == 0

    def test_unauthenticated_chat_access(self, api_client):
        doc_id = str(uuid.uuid4())
        response = api_client.get(f'/api/v1/chat/?document_id={doc_id}')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_chat_message_success(self, authenticated_client, mocker):
        # Create a dummy chat session
        from apps.chat.models import ChatSession
        from apps.documents.models import Document
        
        doc = Document.objects.create(
            user=authenticated_client.user,
            name="test.pdf",
            storage_key="test-key",
            mime_type="application/pdf",
            size=1024,
            status="READY"
        )
        
        session = ChatSession.objects.create(
            user=authenticated_client.user,
            document=doc,
            title="Test Session"
        )
        
        # Mock the entire RAGService class as imported in views.py.
        # Patching only 'generate_answer' still lets __init__ run, which
        # tries to instantiate ChatGroq and fails without a real GROQ_API_KEY.
        mock_rag_class = mocker.patch('apps.chat.views.RAGService')
        mock_rag_instance = mock_rag_class.return_value
        mock_rag_instance.generate_answer.return_value = (
            "Mocked AI Response",
            [{"page": 1, "content": "Mocked reference"}]
        )
        
        response = authenticated_client.post('/api/v1/chat/message/', {
            'session_id': str(session.id),
            'message': 'Hello AI'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['ai_message']['content'] == "Mocked AI Response"
        assert len(response.data['data']['ai_message']['references']) == 1

    def test_chat_message_with_rich_citations(self, authenticated_client, mocker):
        from apps.chat.models import ChatSession
        from apps.documents.models import Document

        doc = Document.objects.create(
            user=authenticated_client.user,
            name="research_paper.pdf",
            storage_key="test-key-citations",
            mime_type="application/pdf",
            size=2048,
            status="READY"
        )
        session = ChatSession.objects.create(
            user=authenticated_client.user,
            document=doc,
            title="Citation Session"
        )

        rich_citations = [
            {
                "document_id": str(doc.id),
                "document_name": doc.name,
                "chunk_index": 0,
                "page": 1,
                "snippet": "Convolutional Neural Networks achieved 98.4% accuracy...",
                "similarity_score": 0.92,
                "token_count": 140
            },
            {
                "document_id": str(doc.id),
                "document_name": doc.name,
                "chunk_index": 2,
                "page": 2,
                "snippet": "The optimizer utilized AdamW with learning rate 3e-4...",
                "similarity_score": 0.88,
                "token_count": 115
            }
        ]

        mock_rag_class = mocker.patch('apps.chat.views.RAGService')
        mock_rag_instance = mock_rag_class.return_value
        mock_rag_instance.generate_answer.return_value = (
            "Based on the paper, CNNs achieved 98.4% accuracy with AdamW optimizer.",
            rich_citations
        )

        response = authenticated_client.post('/api/v1/chat/message/', {
            'session_id': str(session.id),
            'message': 'What was the accuracy and optimizer?'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        refs = response.data['data']['ai_message']['references']
        assert len(refs) == 2
        assert refs[0]['page'] == 1
        assert refs[0]['chunk_index'] == 0
        assert "Convolutional Neural Networks" in refs[0]['snippet']
        assert refs[0]['similarity_score'] == 0.92
        assert refs[1]['page'] == 2
        assert refs[1]['chunk_index'] == 2

    def test_chat_history_preserves_citations(self, authenticated_client):
        from apps.chat.models import ChatSession, ChatMessage
        from apps.documents.models import Document

        doc = Document.objects.create(
            user=authenticated_client.user,
            name="manual.pdf",
            storage_key="test-manual",
            mime_type="application/pdf",
            size=1024,
            status="READY"
        )
        session = ChatSession.objects.create(
            user=authenticated_client.user,
            document=doc,
            title="Manual Session"
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.USER,
            content="How to calibrate?"
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.AI,
            content="Calibration is done via step 3.",
            references=[
                {
                    "document_id": str(doc.id),
                    "document_name": doc.name,
                    "chunk_index": 4,
                    "page": 3,
                    "snippet": "Step 3: Press calibration dial for 5 seconds.",
                    "similarity_score": 0.95
                }
            ]
        )

        response = authenticated_client.get(f'/api/v1/chat/?document_id={doc.id}')
        assert response.status_code == status.HTTP_200_OK
        sessions = response.data['data'] if 'data' in response.data else response.data
        assert len(sessions) == 1
        messages = sessions[0]['messages']
        assert len(messages) == 2
        ai_msg = messages[1]
        assert ai_msg['sender'] == 'AI'
        assert len(ai_msg['references']) == 1
        assert ai_msg['references'][0]['page'] == 3
        assert ai_msg['references'][0]['chunk_index'] == 4
        assert "Step 3:" in ai_msg['references'][0]['snippet']
