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
        assert response.status_code == status.HTTP_403_FORBIDDEN

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
        
        # Mock RAGService
        mock_rag = mocker.patch('core.rag.RAGService.generate_answer')
        mock_rag.return_value = ("Mocked AI Response", [{"page": 1, "content": "Mocked reference"}])
        
        response = authenticated_client.post('/api/v1/chat/message/', {
            'session_id': str(session.id),
            'message': 'Hello AI'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['ai_message']['content'] == "Mocked AI Response"
        assert len(response.data['data']['ai_message']['references']) == 1
