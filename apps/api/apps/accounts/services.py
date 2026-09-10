import secrets
import datetime
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
from rest_framework.exceptions import AuthenticationFailed
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
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


def verify_and_authenticate_google_user(credential: str, user_agent=None, ip_address=None):
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', None) or None
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            client_id
        )
    except Exception as e:
        raise AuthenticationFailed(f'Invalid Google credential: {str(e)}')

    email = idinfo.get('email')
    if not email:
        raise AuthenticationFailed('Google token does not contain an email')

    email_verified = idinfo.get('email_verified', False)
    if not email_verified:
        raise AuthenticationFailed('Google email is not verified')

    name = idinfo.get('name') or email.split('@')[0]

    user = User.objects.filter(email=email).first()
    if user:
        needs_save = False
        if not user.email_verified_at:
            user.email_verified_at = timezone.now()
            needs_save = True
        if not user.name and name:
            user.name = name
            needs_save = True
        if needs_save:
            user.save()
    else:
        user = User.objects.create_user(
            email=email,
            name=name,
            email_verified_at=timezone.now()
        )
        user.set_unusable_password()
        user.save()

    access_token, refresh_token_string = generate_auth_tokens(
        user,
        user_agent=user_agent,
        ip_address=ip_address
    )

    return user, access_token, refresh_token_string


