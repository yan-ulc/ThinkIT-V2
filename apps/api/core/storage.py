import os
import boto3
import uuid
from django.conf import settings
from botocore.exceptions import NoCredentialsError

class StorageClient:
    def __init__(self):
        self.bucket = getattr(settings, 'R2_BUCKET_NAME', 'thinkit')
        
        endpoint_url = getattr(settings, 'R2_ENDPOINT_URL', None)

        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=getattr(settings, 'R2_ACCESS_KEY_ID', ''),
            aws_secret_access_key=getattr(settings, 'R2_SECRET_ACCESS_KEY', ''),
            region_name='auto'  # R2 requires region to be 'auto'
        )

        # Ensure bucket exists (for MinIO local development)
        try:
            self.s3_client.head_bucket(Bucket=self.bucket)
        except Exception:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket)
            except Exception:
                pass

    def upload_file_obj(self, file_obj, original_filename):
        """Uploads a file object to R2 and returns the storage key."""
        # Generate a unique key to prevent overwriting
        extension = original_filename.split('.')[-1] if '.' in original_filename else ''
        file_key = f"documents/{uuid.uuid4().hex}.{extension}"
        
        self.s3_client.upload_fileobj(
            file_obj,
            self.bucket,
            file_key
        )
        return file_key

    def download_file(self, file_key, download_path):
        """Downloads a file from R2 to a local path."""
        self.s3_client.download_file(
            self.bucket,
            file_key,
            download_path
        )
        return download_path
        
    def generate_presigned_url(self, file_key, expires_in=3600):
        """Generates a pre-signed URL for temporary access to a file."""
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': file_key},
            ExpiresIn=expires_in
        )
