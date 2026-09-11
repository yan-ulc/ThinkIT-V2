import pytest
import json
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.documents.models import Document, DocumentChunk, Quiz, QuizQuestion, QuizAttempt

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
        assert quiz_data['total_questions'] == 5
        assert quiz_data.get('total_flashcards') == 5
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

    def test_submit_quiz_full_success(self, authenticated_client, sample_document):
        user = sample_document.user
        quiz = Quiz.objects.create(document=sample_document, user=user, title="Test Exam Quiz")
        q1 = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Apa itu Python?",
            options=["A. Ular", "B. Bahasa Pemrograman", "C. Mobil", "D. Makanan"],
            correct_answer="B. Bahasa Pemrograman",
            explanation="Python adalah bahasa pemrograman tingkat tinggi.",
            order=1
        )
        q2 = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Perintah mencetak teks di Python?",
            options=["A. echo", "B. print()", "C. cout", "D. System.out.println"],
            correct_answer="B. print()",
            explanation="Fungsi print() digunakan untuk output teks ke konsol.",
            order=2
        )
        # Flashcard question should be ignored in grading count
        QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.FLASHCARD,
            question_text="Variable",
            correct_answer="Tempat penyimpanan data",
            order=3
        )

        payload = {
            "answers": {
                str(q1.id): "B. Bahasa Pemrograman",
                str(q2.id): "B. print()"
            }
        }
        res = authenticated_client.post(f'/api/v1/documents/quizzes/{quiz.id}/submit/', data=payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data['error'] is False
        assert res.data['data']['score'] == 2
        assert res.data['data']['total_questions'] == 2
        assert res.data['data']['percentage'] == 100.0
        assert res.data['data']['is_new_high_score'] is True
        assert len(res.data['data']['results']) == 2
        assert QuizAttempt.objects.filter(quiz=quiz, user=user).count() == 1

    def test_submit_quiz_unanswered_rejection(self, authenticated_client, sample_document):
        user = sample_document.user
        quiz = Quiz.objects.create(document=sample_document, user=user, title="Test Incomplete Quiz")
        q1 = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Pertanyaan 1",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            order=1
        )
        QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Pertanyaan 2",
            options=["A", "B", "C", "D"],
            correct_answer="B",
            order=2
        )

        # Only answering Q1, Q2 is missing
        payload = {
            "answers": {
                str(q1.id): "A"
            }
        }
        res = authenticated_client.post(f'/api/v1/documents/quizzes/{quiz.id}/submit/', data=payload, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data['error'] is True
        assert "Semua soal wajib dijawab" in res.data['message']
        assert 2 in res.data['unanswered_questions']
        assert QuizAttempt.objects.filter(quiz=quiz).count() == 0

    def test_submit_quiz_high_score_tracking(self, authenticated_client, sample_document):
        user = sample_document.user
        quiz = Quiz.objects.create(document=sample_document, user=user, title="High Score Quiz")
        q1 = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Q1",
            options=["A", "B"],
            correct_answer="A",
            order=1
        )
        q2 = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Q2",
            options=["A", "B"],
            correct_answer="B",
            order=2
        )

        # Attempt 1: 50%
        res1 = authenticated_client.post(
            f'/api/v1/documents/quizzes/{quiz.id}/submit/',
            data={"answers": {str(q1.id): "A", str(q2.id): "A"}},
            format='json'
        )
        assert res1.status_code == status.HTTP_201_CREATED
        assert res1.data['data']['score'] == 1
        assert res1.data['data']['percentage'] == 50.0
        assert res1.data['data']['is_new_high_score'] is True

        # Attempt 2: 100%
        res2 = authenticated_client.post(
            f'/api/v1/documents/quizzes/{quiz.id}/submit/',
            data={"answers": {str(q1.id): "A", str(q2.id): "B"}},
            format='json'
        )
        assert res2.status_code == status.HTTP_201_CREATED
        assert res2.data['data']['score'] == 2
        assert res2.data['data']['percentage'] == 100.0
        assert res2.data['data']['is_new_high_score'] is True

        # Attempt 3: 0%
        res3 = authenticated_client.post(
            f'/api/v1/documents/quizzes/{quiz.id}/submit/',
            data={"answers": {str(q1.id): "B", str(q2.id): "A"}},
            format='json'
        )
        assert res3.status_code == status.HTTP_201_CREATED
        assert res3.data['data']['score'] == 0
        assert res3.data['data']['percentage'] == 0.0
        assert res3.data['data']['is_new_high_score'] is False
        assert res3.data['data']['highest_percentage'] == 100.0

        # Query attempts list endpoint
        history_res = authenticated_client.get(f'/api/v1/documents/quizzes/{quiz.id}/attempts/')
        assert history_res.status_code == status.HTTP_200_OK
        assert history_res.data['data']['total_attempts'] == 3
        assert history_res.data['data']['highest_percentage'] == 100.0
        assert len(history_res.data['data']['attempts']) == 3

    def test_quiz_attempt_cascade_delete(self, authenticated_client, sample_document):
        user = sample_document.user
        quiz = Quiz.objects.create(document=sample_document, user=user, title="Cascade Delete Quiz")
        q = QuizQuestion.objects.create(
            quiz=quiz,
            question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
            question_text="Q",
            options=["A"],
            correct_answer="A",
            order=1
        )
        QuizAttempt.objects.create(
            quiz=quiz,
            user=user,
            score=1,
            total_questions=1,
            percentage=100.0,
            answers={str(q.id): "A"}
        )
        assert QuizAttempt.objects.filter(quiz=quiz).count() == 1

        del_res = authenticated_client.delete(f'/api/v1/documents/quizzes/{quiz.id}/')
        assert del_res.status_code == status.HTTP_200_OK
        assert QuizAttempt.objects.filter(quiz=quiz).count() == 0

    def test_quiz_question_count_isolation_and_accuracy(self, authenticated_client, sample_document):
        user = authenticated_client.user
        from apps.documents.serializers import QuizSerializer

        for count in [5, 10, 15, 20]:
            quiz = Quiz.objects.create(document=sample_document, user=user, title=f"Test Quiz {count}")
            # Create MCQ questions
            mcqs = [
                QuizQuestion(
                    quiz=quiz,
                    question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
                    question_text=f"MCQ Question {i}",
                    options=["A", "B", "C", "D"],
                    correct_answer="A",
                    order=i
                )
                for i in range(1, count + 1)
            ]
            # Create Flashcards
            flashcards = [
                QuizQuestion(
                    quiz=quiz,
                    question_type=QuizQuestion.QuestionType.FLASHCARD,
                    question_text=f"Flashcard Concept {i}",
                    correct_answer=f"Definition {i}",
                    explanation=f"Definition {i}",
                    order=count + i
                )
                for i in range(1, count + 1)
            ]
            QuizQuestion.objects.bulk_create(mcqs + flashcards)

            # Test through API endpoint
            res = authenticated_client.get(f'/api/v1/documents/quizzes/{quiz.id}/')
            assert res.status_code == status.HTTP_200_OK
            assert res.data['total_questions'] == count, f"Expected {count} questions, got {res.data['total_questions']}"
            assert res.data['total_flashcards'] == count, f"Expected {count} flashcards, got {res.data['total_flashcards']}"

            # Test direct serializer prefetch behavior
            prefetched_quiz = Quiz.objects.filter(id=quiz.id).prefetch_related('questions').first()
            serialized = QuizSerializer(prefetched_quiz).data
            assert serialized['total_questions'] == count
            assert serialized['total_flashcards'] == count



