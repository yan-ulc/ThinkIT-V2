import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.documents.models import Document
from apps.chat.models import ChatSession, ChatMessage

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, db):
    user = User.objects.create_user(
        email='testdoc@example.com',
        password='password123'
    )
    # Generate token
    res = api_client.post('/api/v1/auth/login/', {
        'email': 'testdoc@example.com',
        'password': 'password123'
    }, format='json')
    
    token = res.data['data']['access_token']
    api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    api_client.user = user
    return api_client

@pytest.mark.django_db
class TestDocuments:
    def test_list_documents_empty(self, authenticated_client):
        response = authenticated_client.get('/api/v1/documents/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert len(response.data['data']) == 0

    def test_unauthenticated_access(self, api_client):
        response = api_client.get('/api/v1/documents/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_search_documents_by_name(self, authenticated_client):
        user = authenticated_client.user
        Document.objects.create(
            user=user,
            name='math_calculus_report.pdf',
            storage_key='k_math',
            mime_type='application/pdf',
            size=1024,
            status=Document.StatusChoices.READY
        )
        Document.objects.create(
            user=user,
            name='biology_genetics_notes.pdf',
            storage_key='k_bio',
            mime_type='application/pdf',
            size=2048,
            status=Document.StatusChoices.READY
        )
        Document.objects.create(
            user=user,
            name='chemistry_organic_quiz.pdf',
            storage_key='k_chem',
            mime_type='application/pdf',
            size=4096,
            status=Document.StatusChoices.READY
        )

        # 1. Exact / substring match
        res = authenticated_client.get('/api/v1/documents/?search=calculus')
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data['data']) == 1
        assert res.data['data'][0]['name'] == 'math_calculus_report.pdf'

        # 2. Case-insensitive match
        res_ci = authenticated_client.get('/api/v1/documents/?search=GENETICS')
        assert res_ci.status_code == status.HTTP_200_OK
        assert len(res_ci.data['data']) == 1
        assert res_ci.data['data'][0]['name'] == 'biology_genetics_notes.pdf'

        # 3. No match found
        res_none = authenticated_client.get('/api/v1/documents/?search=physics')
        assert res_none.status_code == status.HTTP_200_OK
        assert len(res_none.data['data']) == 0

        # 4. Search with whitespace trimming
        res_ws = authenticated_client.get('/api/v1/documents/?search=  organic  ')
        assert res_ws.status_code == status.HTTP_200_OK
        assert len(res_ws.data['data']) == 1
        assert res_ws.data['data'][0]['name'] == 'chemistry_organic_quiz.pdf'

        # 5. Empty search string returns all docs
        res_empty = authenticated_client.get('/api/v1/documents/?search=')
        assert res_empty.status_code == status.HTTP_200_OK
        assert len(res_empty.data['data']) == 3

    def test_upload_invalid_mime_type(self, authenticated_client):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        file_obj = SimpleUploadedFile("test.txt", b"Hello world", content_type="text/plain")
        response = authenticated_client.post('/api/v1/documents/upload/', {
            'file': file_obj,
            'name': 'test.txt'
        }, format='multipart')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Only PDF files are allowed" in str(response.data.get('message', response.data))

    def test_upload_pdf_success(self, authenticated_client, mocker):
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        # Mock StorageClient
        mocker.patch('core.storage.StorageClient.upload_file_obj', return_value='test-key')
        
        # Mock Celery Task
        mock_task = mocker.patch('apps.documents.tasks.process_document_task.delay')
        
        file_obj = SimpleUploadedFile("test.pdf", b"%PDF-1.4 dummy content", content_type="application/pdf")
        response = authenticated_client.post('/api/v1/documents/upload/', {
            'file': file_obj,
            'name': 'test.pdf'
        }, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['error'] is False
        assert mock_task.called

    def test_analytics_empty(self, authenticated_client):
        response = authenticated_client.get('/api/v1/documents/analytics/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        data = response.data['data']
        assert data['total_documents'] == 0
        assert data['total_storage_bytes'] == 0
        assert data['storage_used_mb'] == 0.0
        assert data['ai_queries_used'] == 0

    def test_analytics_with_data(self, authenticated_client):
        user = authenticated_client.user
        doc1 = Document.objects.create(
            user=user,
            name='doc1.pdf',
            storage_key='k1',
            mime_type='application/pdf',
            size=1048576,
            status=Document.StatusChoices.READY
        )
        doc2 = Document.objects.create(
            user=user,
            name='doc2.pdf',
            storage_key='k2',
            mime_type='application/pdf',
            size=2097152,
            status=Document.StatusChoices.PROCESSING
        )
        doc3 = Document.objects.create(
            user=user,
            name='doc3.pdf',
            storage_key='k3',
            mime_type='application/pdf',
            size=524288,
            status=Document.StatusChoices.FAILED
        )

        session = ChatSession.objects.create(user=user, document=doc1, title='Test Session')
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.USER,
            content='What is this document about?'
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.AI,
            content='This document is about...'
        )
        ChatMessage.objects.create(
            session=session,
            sender=ChatMessage.SenderChoices.USER,
            content='Can you summarize it?'
        )

        response = authenticated_client.get('/api/v1/documents/analytics/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        data = response.data['data']
        assert data['total_documents'] == 3
        assert data['total_storage_bytes'] == 1048576 + 2097152 + 524288
        assert data['storage_used_mb'] == 3.5
        assert data['ai_queries_used'] == 2

    def test_analytics_user_isolation(self, authenticated_client):
        other_user = User.objects.create_user(
            email='otherdoc@example.com',
            password='password123'
        )
        other_doc = Document.objects.create(
            user=other_user,
            name='other.pdf',
            storage_key='k_other',
            mime_type='application/pdf',
            size=5000000,
            status=Document.StatusChoices.READY
        )
        other_session = ChatSession.objects.create(user=other_user, document=other_doc, title='Other Session')
        ChatMessage.objects.create(
            session=other_session,
            sender=ChatMessage.SenderChoices.USER,
            content='Other user question'
        )

        response = authenticated_client.get('/api/v1/documents/analytics/')
        assert response.status_code == status.HTTP_200_OK
        data = response.data['data']
        assert data['total_documents'] == 0
        assert data['total_storage_bytes'] == 0
        assert data['ai_queries_used'] == 0

    def test_analytics_unauthenticated(self, api_client):
        response = api_client.get('/api/v1/documents/analytics/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

