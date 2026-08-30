import os
import random
from celery import shared_task
from django.conf import settings
from .models import Document, DocumentChunk
from core.storage import StorageClient

# LangChain imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

@shared_task
def process_document_task(document_id):
    try:
        doc = Document.objects.get(id=document_id)
        doc.status = Document.StatusChoices.PROCESSING
        doc.save(update_fields=['status'])
        
        storage_client = StorageClient()
        
        # Download file to local temp path
        temp_path = f"/tmp/{doc.id}.pdf" if not os.name == 'nt' else f"temp_{doc.id}.pdf"
        storage_client.download_file(doc.storage_key, temp_path)
        
        # Load PDF
        loader = PyPDFLoader(temp_path)
        pages = loader.load()
        
        # Split text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        chunks = text_splitter.split_documents(pages)
        
        # Initialize Google Embeddings
        api_key = os.getenv('GOOGLE_API_KEY', getattr(settings, 'GOOGLE_API_KEY', ''))
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        
        # Extract content to embed in batch
        texts = [chunk.page_content for chunk in chunks]
        
        # Call Google API to get embeddings
        embeddings_vectors = embeddings.embed_documents(texts)
        
        # Process and save chunks
        document_chunks = []
        for i, chunk in enumerate(chunks):
            # Simple token count estimation (1 word ~ 1.3 tokens)
            token_count = int(len(chunk.page_content.split()) * 1.3)
            
            document_chunks.append(
                DocumentChunk(
                    document=doc,
                    user=doc.user,
                    chunk_index=i,
                    content=chunk.page_content,
                    embedding=embeddings_vectors[i],
                    token_count=token_count
                )
            )
            
        # Bulk create chunks
        DocumentChunk.objects.bulk_create(document_chunks)
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        doc.status = Document.StatusChoices.READY
        doc.save(update_fields=['status'])
        
    except Exception as e:
        if 'doc' in locals():
            doc.status = Document.StatusChoices.FAILED
            doc.error_message = str(e)
            doc.save(update_fields=['status', 'error_message'])
        # Log error in production
        raise e
