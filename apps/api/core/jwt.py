import jwt
import datetime
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

def generate_access_token(user):
    payload = {
        'user_id': str(user.id),
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=settings.JWT_ACCESS_EXPIRES_MINUTES),
        'iat': datetime.datetime.now(datetime.timezone.utc)
    }
    token = jwt.encode(payload, settings.JWT_ACCESS_SECRET, algorithm='HS256')
    return token

def verify_access_token(token):
    try:
        payload = jwt.decode(token, settings.JWT_ACCESS_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed('Access token expired')
    except jwt.InvalidTokenError:
        raise AuthenticationFailed('Invalid access token')
