import pytest
import json
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.documents.models import Document, DocumentChunk, Quiz, QuizQuestion

User = get_user_model()

MOCK_GEMINI_QUIZ_RESPONSE = {
    "title": "Kuis: Dasar Pemrograman Python",
    "questions": [
        {
            "question": "Apa tipe data di Python yang bersifat mutable?",
            "options": ["A. Tuple", "B. List", "C. String", "D. Integer"],
            "correct_answer": "B. List",
            "explanation": "List dapat dimodifikasi elemennya setelah dibuat (mutable)."
        },
        {
            "question": "Fungsi apa yang digunakan untuk mengetahui panjang koleksi?",
            "options": ["A. count()", "B. size()", "C. len()", "D. length()"],
            "correct_answer": "C. len()",
            "explanation": "Fungsi built-in len() mengembalikan jumlah item dalam objek."
        },
        {
            "question": "Bagaimana cara membuat fungsi di Python?",
            "options": ["A. func my_func():", "B. function my_func():", "C. def my_func():", "D. define my_func():"],
            "correct_answer": "C. def my_func():",
            "explanation": "Keyword 'def' digunakan untuk mendefinisikan fungsi."
        },
        {
            "question": "Apa output dari bool([])?",
            "options": ["A. True", "B. False", "C. None", "D. Error"],
            "correct_answer": "B. False",
            "explanation": "List kosong dievaluasi sebagai falsy di Python."
        },
        {
            "question": "Keyword apa yang digunakan untuk menangani exception?",
            "options": ["A. try/catch", "B. try/except", "C. catch/finally", "D. handle/error"],
            "correct_answer": "B. try/except",
            "explanation": "Python menggunakan blok try...except untuk error handling."
        }
    ],
    "flashcards": [
        {
            "front": "List Comprehension",
            "back": "Sintaks ringkas untuk membuat list baru dari iterable yang sudah ada."
        },
        {
            "front": "Global Interpreter Lock (GIL)",
            "back": "Mekanisme CPython yang memastikan hanya satu thread yang mengeksekusi bytecode sekaligus."
        },
        {
            "front": "Duck Typing",
            "back": "Filosofi 'if it walks like a duck and quacks like a duck, it is a duck'."
        },
        {
            "front": "PEP 8",
            "back": "Panduan konvensi gaya penulisan kode resmi untuk bahasa pemrograman Python."
        },
        {
            "front": "Virtual Environment",
            "back": "Lingkungan terisolasi untuk dependensi package Python per proyek."
        }
    ]
}

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(db):
    client = APIClient()
    user = User.objects.create_user(
        email='quizuser@example.com',
        password='password123'
    )
    res = client.post('/api/v1/auth/login/', {
        'email': 'quizuser@example.com',
        'password': 'password123'
    }, format='json')
    token = res.data['data']['access_token']
    client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
    client.user = user
    return client

@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email='otherquizuser@example.com',
        password='password123'
    )

@pytest.fixture
def sample_document(authenticated_client):
    user = authenticated_client.user
    doc = Document.objects.create(
        user=user,
        name='python_tutorial.pdf',
        storage_key='k_python',
        mime_type='application/pdf',
        size=4096,
        status=Document.StatusChoices.READY
    )
    # Create chunks
    DocumentChunk.objects.create(
        document=doc,
        user=user,
        chunk_index=0,
        content="Python adalah bahasa pemrograman populer yang mudah dipelajari. Tipe data mencakup List, Tuple, dan Dict.",
        embedding=[0.1] * 1536,
        token_count=100
    )
    DocumentChunk.objects.create(
        document=doc,
        user=user,
        chunk_index=1,
        content="Fungsi didefinisikan dengan kata kunci def. Exception ditangani dengan try dan except.",
        embedding=[0.2] * 1536,
        token_count=120
    )
    return doc

@pytest.mark.django_db
class TestQuizBackend:
    @patch('core.quiz_generator.QuizGeneratorService._call_gemini_api')
    def test_generate_quiz_success(self, mock_gemini, authenticated_client, sample_document):
        mock_gemini.return_value = MOCK_GEMINI_QUIZ_RESPONSE

        response = authenticated_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['error'] is False
        assert 'data' in response.data

        quiz_data = response.data['data']
        assert quiz_data['title'] == "Kuis: Dasar Pemrograman Python"
        assert quiz_data['document'] == sample_document.id
        assert quiz_data['total_questions'] == 10
        assert len(quiz_data['questions']) == 10

        # Verify DB records
        assert Quiz.objects.filter(document=sample_document).count() == 1
        assert QuizQuestion.objects.filter(quiz_id=quiz_data['id']).count() == 10

        # Verify MCQ question
        mcq_q = QuizQuestion.objects.filter(
            quiz_id=quiz_data['id'],
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE
        ).first()
        assert mcq_q is not None
        assert len(mcq_q.options) == 4
        assert mcq_q.correct_answer != ""
        assert mcq_q.explanation != ""

        # Verify Flashcard question
        fc_q = QuizQuestion.objects.filter(
            quiz_id=quiz_data['id'],
            question_type=QuizQuestion.QuestionType.FLASHCARD
        ).first()
        assert fc_q is not None
        assert fc_q.question_text == "List Comprehension"
        assert "Sintaks ringkas" in fc_q.explanation

    def test_generate_quiz_unauthenticated(self, api_client, sample_document):
        response = api_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch('core.quiz_generator.QuizGeneratorService._call_gemini_api')
    def test_generate_quiz_user_isolation(self, mock_gemini, authenticated_client, other_user):
        other_doc = Document.objects.create(
            user=other_user,
            name='private_notes.pdf',
            storage_key='k_private',
            mime_type='application/pdf',
            size=1024,
            status=Document.StatusChoices.READY
        )
        response = authenticated_client.post(f'/api/v1/documents/{other_doc.id}/generate-quiz/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
        mock_gemini.assert_not_called()

    def test_generate_quiz_document_not_ready(self, authenticated_client):
        doc = Document.objects.create(
            user=authenticated_client.user,
            name='processing_file.pdf',
            storage_key='k_proc',
            mime_type='application/pdf',
            size=1024,
            status=Document.StatusChoices.PROCESSING
        )
        response = authenticated_client.post(f'/api/v1/documents/{doc.id}/generate-quiz/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] is True
        assert 'READY' in response.data['message']

    def test_generate_quiz_document_no_chunks(self, authenticated_client):
        doc = Document.objects.create(
            user=authenticated_client.user,
            name='empty_doc.pdf',
            storage_key='k_empty',
            mime_type='application/pdf',
            size=1024,
            status=Document.StatusChoices.READY
        )
        response = authenticated_client.post(f'/api/v1/documents/{doc.id}/generate-quiz/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] is True

    @patch('core.quiz_generator.QuizGeneratorService._call_gemini_api')
    def test_list_document_quizzes(self, mock_gemini, authenticated_client, sample_document):
        mock_gemini.return_value = MOCK_GEMINI_QUIZ_RESPONSE
        authenticated_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')

        response = authenticated_client.get(f'/api/v1/documents/{sample_document.id}/quizzes/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['error'] is False
        assert len(response.data['data']) == 1
        assert response.data['data'][0]['document'] == sample_document.id

    @patch('core.quiz_generator.QuizGeneratorService._call_gemini_api')
    def test_get_quiz_detail(self, mock_gemini, authenticated_client, sample_document):
        mock_gemini.return_value = MOCK_GEMINI_QUIZ_RESPONSE
        create_res = authenticated_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')
        quiz_id = create_res.data['data']['id']

        response = authenticated_client.get(f'/api/v1/documents/quizzes/{quiz_id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == quiz_id
        assert len(response.data['questions']) == 10

    @patch('core.quiz_generator.QuizGeneratorService._call_gemini_api')
    def test_delete_quiz(self, mock_gemini, authenticated_client, sample_document):
        mock_gemini.return_value = MOCK_GEMINI_QUIZ_RESPONSE
        create_res = authenticated_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')
        quiz_id = create_res.data['data']['id']

        assert Quiz.objects.filter(id=quiz_id).count() == 1
        assert QuizQuestion.objects.filter(quiz_id=quiz_id).count() == 10

        del_res = authenticated_client.delete(f'/api/v1/documents/quizzes/{quiz_id}/')
        assert del_res.status_code == status.HTTP_200_OK
        assert del_res.data['error'] is False

        # Verify cascade deletion
        assert Quiz.objects.filter(id=quiz_id).count() == 0
        assert QuizQuestion.objects.filter(quiz_id=quiz_id).count() == 0

    @patch('urllib.request.urlopen')
    def test_gemini_fallback_on_404(self, mock_urlopen, authenticated_client, sample_document):
        import urllib.error
        from io import BytesIO
        import json

        # First model call raises HTTP 404 (model deprecated / unavailable)
        err_fp = BytesIO(b'{"error": {"code": 404, "message": "This model is no longer available to new users."}}')
        http_err_404 = urllib.error.HTTPError(
            url="http://test", code=404, msg="Not Found", hdrs={}, fp=err_fp
        )

        # Second model call (fallback) succeeds with valid structured quiz
        success_body = json.dumps({
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps(MOCK_GEMINI_QUIZ_RESPONSE)}]
                    }
                }
            ]
        }).encode('utf-8')

        class MockResponse:
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def read(self):
                return success_body

        mock_urlopen.side_effect = [http_err_404, MockResponse()]

        response = authenticated_client.post(f'/api/v1/documents/{sample_document.id}/generate-quiz/')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['error'] is False
        assert mock_urlopen.call_count == 2

    @patch('urllib.request.urlopen')
    def test_generate_quiz_custom_title_and_count(self, mock_urlopen, authenticated_client, sample_document):
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps(MOCK_GEMINI_QUIZ_RESPONSE)}]
                    }
                }
            ]
        }).encode('utf-8')
        mock_urlopen.return_value.__enter__.return_value = mock_response

        payload = {
            "title": "Kuis Khusus Artificial Intelligence",
            "num_questions": 10
        }
        response = authenticated_client.post(
            f'/api/v1/documents/{sample_document.id}/generate-quiz/',
            data=payload,
            format='json'
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['error'] is False
        assert response.data['data']['title'] == "Kuis Khusus Artificial Intelligence"

    def test_generate_quiz_invalid_num_questions(self, authenticated_client, sample_document):
        # Only 5, 10, 15, 20 are allowed
        payload = {"num_questions": 7}
        response = authenticated_client.post(
            f'/api/v1/documents/{sample_document.id}/generate-quiz/',
            data=payload,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] is True
        assert "5, 10, 15, atau 20" in response.data['message']

    def test_generate_quiz_non_integer_num_questions(self, authenticated_client, sample_document):
        payload = {"num_questions": "banyak"}
        response = authenticated_client.post(
            f'/api/v1/documents/{sample_document.id}/generate-quiz/',
            data=payload,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] is True
        assert "bilangan bulat" in response.data['message']


