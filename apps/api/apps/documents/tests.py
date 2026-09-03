import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status

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

