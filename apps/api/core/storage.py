import os
import boto3
import uuid
from django.conf import settings
from botocore.exceptions import NoCredentialsError

class StorageClient:
    def __init__(self):
        self.bucket = settings.R2_BUCKET_NAME
        self.use_local = not bool(self.bucket)
        self.local_storage_path = os.path.join(settings.BASE_DIR, 'media', 'documents')
        
        if self.use_local:
            os.makedirs(self.local_storage_path, exist_ok=True)
        else:
            # Cloudflare R2 specific endpoint URL
            endpoint_url = None
            if settings.R2_ACCOUNT_ID:
                endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

            self.s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                region_name='auto'  # R2 requires region to be 'auto'
            )

    def upload_file_obj(self, file_obj, original_filename):
        """Uploads a file object to R2 or Local Storage and returns the storage key."""
        extension = original_filename.split('.')[-1] if '.' in original_filename else ''
        file_key = f"documents/{uuid.uuid4().hex}.{extension}"
        
        if self.use_local:
            local_path = os.path.join(settings.BASE_DIR, 'media', file_key)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, 'wb+') as destination:
                for chunk in file_obj.chunks():
                    destination.write(chunk)
        else:
            self.s3_client.upload_fileobj(
                file_obj,
                self.bucket,
                file_key
            )
        return file_key

    def download_file(self, file_key, download_path):
        """Downloads a file from R2 or Local Storage to a local path."""
        if self.use_local:
            import shutil
            local_path = os.path.join(settings.BASE_DIR, 'media', file_key)
            shutil.copy2(local_path, download_path)
        else:
            self.s3_client.download_file(
                self.bucket,
                file_key,
                download_path
            )
        return download_path
        
    def generate_presigned_url(self, file_key, expires_in=3600):
        """Generates a pre-signed URL for temporary access to a file."""
        if self.use_local:
            # In a real app, you'd generate a local URL pointing to a media view.
            # For now, just return a dummy URL indicating local storage.
            return f"/media/{file_key}"
            
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': file_key},
            ExpiresIn=expires_in
        )

