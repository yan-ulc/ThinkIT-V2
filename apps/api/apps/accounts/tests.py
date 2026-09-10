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
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_google_auth_new_user(self, api_client, mocker):
        mock_verify = mocker.patch('google.oauth2.id_token.verify_oauth2_token')
        mock_verify.return_value = {
            'email': 'googlenew@example.com',
            'email_verified': True,
            'name': 'Google New User',
            'sub': 'google-uid-12345'
        }

        response = api_client.post('/api/v1/auth/google/', {
            'credential': 'valid_mock_token'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert 'access_token' in response.data['data']
        assert 'refresh_token' in response.cookies

        user = User.objects.get(email='googlenew@example.com')
        assert user.name == 'Google New User'
        assert user.email_verified_at is not None
        assert not user.has_usable_password()

    def test_google_auth_existing_user(self, api_client, create_user, mocker):
        existing_user = create_user(email='googleexist@example.com', password='Password123!')
        assert existing_user.email_verified_at is None

        mock_verify = mocker.patch('google.oauth2.id_token.verify_oauth2_token')
        mock_verify.return_value = {
            'email': 'googleexist@example.com',
            'email_verified': True,
            'name': 'Updated Google Name',
            'sub': 'google-uid-67890'
        }

        response = api_client.post('/api/v1/auth/google/', {
            'credential': 'valid_mock_token_existing'
        }, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert 'access_token' in response.data['data']

        existing_user.refresh_from_db()
        assert existing_user.email_verified_at is not None

    def test_google_auth_invalid_token(self, api_client, mocker):
        mock_verify = mocker.patch('google.oauth2.id_token.verify_oauth2_token')
        mock_verify.side_effect = ValueError('Token expired or invalid signature')

        response = api_client.post('/api/v1/auth/google/', {
            'credential': 'bad_token'
        }, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['error'] is True

    def test_google_auth_unverified_email(self, api_client, mocker):
        mock_verify = mocker.patch('google.oauth2.id_token.verify_oauth2_token')
        mock_verify.return_value = {
            'email': 'unverified@example.com',
            'email_verified': False,
            'name': 'Unverified User'
        }

        response = api_client.post('/api/v1/auth/google/', {
            'credential': 'token_unverified'
        }, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data['error'] is True

    def test_google_auth_missing_credential(self, api_client):
        response = api_client.post('/api/v1/auth/google/', {}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

