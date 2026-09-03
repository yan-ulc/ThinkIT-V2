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
        assert response.status_code == status.HTTP_403_FORBIDDEN
