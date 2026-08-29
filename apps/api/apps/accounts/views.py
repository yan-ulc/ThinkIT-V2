import time
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import Throttled, AuthenticationFailed
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer
from .services import generate_auth_tokens, verify_refresh_token, revoke_refresh_token
from .models import RefreshToken

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')

def check_login_rate_limit(ip):
    key = f"login_attempts_{ip}"
    attempts = cache.get(key, 0)
    if attempts >= 5:
        raise Throttled(detail="Too many login attempts. Please try again later.", wait=300)
    cache.set(key, attempts + 1, 300) # 5 minutes

def clear_login_rate_limit(ip):
    key = f"login_attempts_{ip}"
    cache.delete(key)

def set_auth_cookies(response, refresh_token_string):
    response.set_cookie(
        'refresh_token',
        refresh_token_string,
        max_age=settings.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite='Lax', # Or None if cross-domain with secure=True
        domain=settings.COOKIE_DOMAIN,
        secure=not settings.DEBUG,
    )

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        access_token, refresh_token_string = generate_auth_tokens(
            user, 
            user_agent=request.META.get('HTTP_USER_AGENT'),
            ip_address=get_client_ip(request)
        )
        
        response = Response({
            'error': False,
            'message': 'Registration successful',
            'data': {
                'user': UserSerializer(user).data,
                'access_token': access_token
            }
        }, status=status.HTTP_201_CREATED)
        set_auth_cookies(response, refresh_token_string)
        return response

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ip = get_client_ip(request)
        check_login_rate_limit(ip)
        
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = authenticate(email=serializer.validated_data['email'], password=serializer.validated_data['password'])
        if not user:
            raise AuthenticationFailed('Invalid email or password')
            
        clear_login_rate_limit(ip)
        
        access_token, refresh_token_string = generate_auth_tokens(
            user,
            user_agent=request.META.get('HTTP_USER_AGENT'),
            ip_address=ip
        )
        
        response = Response({
            'error': False,
            'message': 'Login successful',
            'data': {
                'user': UserSerializer(user).data,
                'access_token': access_token
            }
        })
        set_auth_cookies(response, refresh_token_string)
        return response

class RefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token_string = request.COOKIES.get('refresh_token')
        if not refresh_token_string:
            raise AuthenticationFailed('Refresh token missing')
            
        old_refresh_token = verify_refresh_token(refresh_token_string)
        revoke_refresh_token(old_refresh_token)
        
        access_token, new_refresh_token_string = generate_auth_tokens(
            old_refresh_token.user,
            user_agent=request.META.get('HTTP_USER_AGENT'),
            ip_address=get_client_ip(request)
        )
        
        response = Response({
            'error': False,
            'message': 'Token refreshed',
            'data': {
                'access_token': access_token
            }
        })
        set_auth_cookies(response, new_refresh_token_string)
        return response

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token_string = request.COOKIES.get('refresh_token')
        if refresh_token_string:
            try:
                refresh_token = verify_refresh_token(refresh_token_string)
                revoke_refresh_token(refresh_token)
            except Exception:
                pass # ignore if already revoked or invalid
                
        response = Response({
            'error': False,
            'message': 'Logged out successfully'
        })
        response.delete_cookie('refresh_token', domain=settings.COOKIE_DOMAIN)
        return response

from django.utils import timezone

class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        RefreshToken.objects.filter(user=request.user, revoked_at__isnull=True).update(revoked_at=timezone.now())
        
        response = Response({
            'error': False,
            'message': 'Logged out from all devices'
        })
        response.delete_cookie('refresh_token', domain=settings.COOKIE_DOMAIN)
        return response

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'error': False,
            'message': 'Current user profile',
            'data': UserSerializer(request.user).data
        })
