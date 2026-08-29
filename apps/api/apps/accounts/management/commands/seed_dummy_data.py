import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.documents.models import Document, DocumentChunk

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with dummy data'

    def handle(self, *args, **kwargs):
        # Create user
        email = 'dummy@thinkit.local'
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'name': 'Dummy User',
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {email}'))
        else:
            self.stdout.write(self.style.WARNING(f'User already exists: {email}'))

        # Create document
        doc, created = Document.objects.get_or_create(
            user=user,
            name='Sample Project Requirements.pdf',
            defaults={
                'storage_key': 'uploads/sample.pdf',
                'mime_type': 'application/pdf',
                'size': 1024500,
                'status': Document.StatusChoices.READY
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created document: {doc.name}'))
            
            # Create chunks
            for i in range(3):
                # Dummy embedding of size 1536
                embedding = [random.uniform(-1, 1) for _ in range(1536)]
                DocumentChunk.objects.create(
                    document=doc,
                    user=user,
                    chunk_index=i,
                    content=f'This is a sample text for chunk {i} from {doc.name}.',
                    embedding=embedding,
                    token_count=15
                )
            self.stdout.write(self.style.SUCCESS(f'Created 3 chunks for document: {doc.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Document already exists: {doc.name}'))
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded dummy data!'))
