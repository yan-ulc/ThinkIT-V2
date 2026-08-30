import os
from django.conf import settings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pgvector.django import L2Distance
from apps.documents.models import DocumentChunk

class RAGService:
    def __init__(self):
        # Initialize Groq LLM
        self.llm = ChatGroq(
            temperature=0,
            model_name="llama3-8b-8192", # Fast and capable
            api_key=os.getenv('GROQ_API_KEY', getattr(settings, 'GROQ_API_KEY', ''))
        )
        
        # Initialize Google Embeddings
        api_key = os.getenv('GOOGLE_API_KEY', getattr(settings, 'GOOGLE_API_KEY', ''))
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
        
        # Define Prompt Template
        self.prompt = ChatPromptTemplate.from_template("""
        Anda adalah asisten cerdas untuk "ThinkIT AI Document Workspace".
        Jawab pertanyaan pengguna berdasarkan konteks dokumen yang diberikan.
        Jika jawabannya tidak ada di konteks, katakan bahwa Anda tidak tahu berdasarkan dokumen yang ada.
        
        Konteks Dokumen:
        {context}
        
        Pertanyaan:
        {question}
        
        Jawaban:
        """)
        
    def generate_answer(self, user, question):
        # 1. Embed the question
        question_embedding = self.embeddings.embed_query(question)
        
        # 2. Vector Search in PostgreSQL using pgvector (L2 Distance)
        # Limit search to the specific user's documents
        chunks = DocumentChunk.objects.filter(
            user=user
        ).annotate(
            distance=L2Distance('embedding', question_embedding)
        ).order_by('distance')[:5]
        
        # 3. Format Context
        context_text = "\n\n---\n\n".join([chunk.content for chunk in chunks])
        
        # 4. Generate Answer using LangChain
        chain = self.prompt | self.llm | StrOutputParser()
        
        answer = chain.invoke({
            "context": context_text,
            "question": question
        })
        
        # Return answer and referenced chunks for transparency
        references = [
            {"document_id": str(chunk.document.id), "document_name": chunk.document.name, "chunk_index": chunk.chunk_index} 
            for chunk in chunks
        ]
        
        return answer, references
