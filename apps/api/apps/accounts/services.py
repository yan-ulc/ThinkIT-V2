import secrets
import datetime
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.exceptions import AuthenticationFailed
from core.jwt import generate_access_token
from .models import RefreshToken, User

def generate_auth_tokens(user, user_agent=None, ip_address=None):
    access_token = generate_access_token(user)
    
    # Generate refresh token components
    raw_token = secrets.token_urlsafe(64)
    expires_at = timezone.now() + datetime.timedelta(days=settings.JWT_REFRESH_EXPIRES_DAYS)
    
    # Store token in DB
    refresh_token = RefreshToken.objects.create(
        user=user,
        token_hash=make_password(raw_token),
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=expires_at
    )
    
    # The string given to the user contains the token ID and the raw secret
    token_string = f"{refresh_token.id}:{raw_token}"
    
    return access_token, token_string

def verify_refresh_token(token_string):
    try:
        token_id, raw_token = token_string.split(':')
    except ValueError:
        raise AuthenticationFailed('Invalid refresh token format')
        
    try:
        refresh_token = RefreshToken.objects.get(id=token_id)
    except RefreshToken.DoesNotExist:
        raise AuthenticationFailed('Invalid refresh token')
        
    if refresh_token.revoked_at:
        # Token reuse detected! Revoke ALL tokens for this user as a security measure.
        RefreshToken.objects.filter(user=refresh_token.user).update(revoked_at=timezone.now())
        raise AuthenticationFailed('Token reuse detected. All sessions revoked.')
        
    if refresh_token.expires_at < timezone.now():
        raise AuthenticationFailed('Refresh token expired')
        
    if not check_password(raw_token, refresh_token.token_hash):
        raise AuthenticationFailed('Invalid refresh token')
        
    return refresh_token

def revoke_refresh_token(refresh_token):
    refresh_token.revoked_at = timezone.now()
    refresh_token.save(update_fields=['revoked_at'])

