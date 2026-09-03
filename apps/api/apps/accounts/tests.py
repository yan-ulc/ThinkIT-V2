import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user(db):
    def make_user(email="test@example.com", password="password123"):
        return User.objects.create_user(
            email=email,
            password=password,
            name="Test User"
        )
    return make_user

@pytest.mark.django_db
class TestAuthentication:
    def test_user_registration(self, api_client):
        response = api_client.post('/api/v1/auth/register/', {
            'email': 'newuser@example.com',
            'password': 'StrongPassword123!',
            'name': 'New User'
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['error'] is False
        assert 'access_token' in response.data['data']
        
        # Check if cookie is set
        assert 'refresh_token' in response.cookies

    def test_user_login(self, api_client, create_user):
        create_user(email='login@example.com', password='StrongPassword123!')
        
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'login@example.com',
            'password': 'StrongPassword123!'
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.cookies

    def test_invalid_login(self, api_client, create_user):
        create_user(email='login@example.com', password='StrongPassword123!')
        
        response = api_client.post('/api/v1/auth/login/', {
            'email': 'login@example.com',
            'password': 'WrongPassword123!'
        }, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['error'] is True

    def test_get_me_authenticated(self, api_client, create_user):
        user = create_user(email='me@example.com', password='StrongPassword123!')
        
        # Login to get token
        login_res = api_client.post('/api/v1/auth/login/', {
            'email': 'me@example.com',
            'password': 'StrongPassword123!'
        }, format='json')
        access_token = login_res.data['data']['access_token']
        
        # Use token to access /me
        api_client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)
        response = api_client.get('/api/v1/auth/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['data']['email'] == 'me@example.com'

    def test_get_me_unauthenticated(self, api_client):
        response = api_client.get('/api/v1/auth/me/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
