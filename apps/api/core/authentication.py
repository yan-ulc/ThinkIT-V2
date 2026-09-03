from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
from .jwt import verify_access_token

User = get_user_model()

class JWTAuthentication(BaseAuthentication):
    # Declaring a realm makes DRF include WWW-Authenticate: Bearer realm="api"
    # in 401 responses. Without this, DRF downgrades AuthenticationFailed to 403.
    www_authenticate_realm = 'api'

    def authenticate_header(self, request):
        return f'Bearer realm="{self.www_authenticate_realm}"'

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
            
        token = parts[1]
        payload = verify_access_token(token)
        
        try:
            user = User.objects.get(id=payload['user_id'])
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')
            
        if not user.is_active:
            raise AuthenticationFailed('User is inactive')
            
        return (user, token)
