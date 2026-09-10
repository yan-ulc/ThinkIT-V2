from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'email_verified_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'email_verified_at', 'created_at', 'updated_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['email', 'name', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            password=validated_data['password']
        )
        return user

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class GoogleAuthSerializer(serializers.Serializer):
    credential = serializers.CharField(required=False, allow_blank=False)
    id_token = serializers.CharField(required=False, allow_blank=False)
    token = serializers.CharField(required=False, allow_blank=False)

    def validate(self, attrs):
        token = attrs.get('credential') or attrs.get('id_token') or attrs.get('token')
        if not token:
            raise serializers.ValidationError({"credential": "A Google token or credential is required."})
        attrs['credential'] = token
        return attrs

