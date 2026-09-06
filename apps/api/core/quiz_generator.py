import os
import json
import urllib.request
import urllib.error
import logging
from django.conf import settings
from apps.documents.models import Document, Quiz, QuizQuestion

logger = logging.getLogger(__name__)

class QuizGeneratorService:
    DEFAULT_MODEL = "gemini-3.5-flash"
    FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"]

    def __init__(self, api_key: str = None, model_name: str = None):
        self.api_key = (
            api_key
            or getattr(settings, 'GEMINI_API_KEY', None)
            or getattr(settings, 'GOOGLE_API_KEY', None)
            or os.getenv('GEMINI_API_KEY')
            or os.getenv('GOOGLE_API_KEY')
        )
        self.model_name = model_name or self.DEFAULT_MODEL

    def generate_quiz_for_document(self, document: Document, user) -> Quiz:
        """
        Generates a comprehensive Quiz (MCQ + Flashcards) from document chunks using Gemini 2.5 Flash
        and persists them into the database.
        """
        if document.user_id != user.id:
            raise PermissionError("User does not have permission to generate a quiz for this document.")

        if document.status != Document.StatusChoices.READY:
            raise ValueError(f"Document status is {document.status}. Only READY documents can be used to generate a quiz.")

        # Fetch document chunks
        chunks = document.chunks.order_by('chunk_index')[:15]
        if not chunks.exists():
            raise ValueError("Dokumen belum memiliki teks yang diekstrak untuk membuat kuis.")

        # Aggregate context (limit to ~12,000 characters to keep generation prompt fast and focused)
        context_parts = []
        char_count = 0
        for chunk in chunks:
            text = chunk.content.strip()
            if char_count + len(text) > 12000:
                context_parts.append(text[:12000 - char_count])
                break
            context_parts.append(text)
            char_count += len(text)

        context_text = "\n\n---\n\n".join(context_parts)

        # Call Gemini API
        quiz_data = self._call_gemini_api(document.name, context_text)

        # Persist Quiz
        quiz_title = quiz_data.get('title') or f"Kuis: {document.name}"
        quiz = Quiz.objects.create(
            document=document,
            user=user,
            title=quiz_title
        )

        questions_to_create = []

        # 1. Multiple Choice Questions
        mcq_list = quiz_data.get('questions', [])
        for idx, item in enumerate(mcq_list, start=1):
            q_text = item.get('question', '').strip()
            if not q_text:
                continue
            options = item.get('options', [])
            correct_ans = item.get('correct_answer', '').strip()
            explanation = item.get('explanation', '').strip()

            questions_to_create.append(
                QuizQuestion(
                    quiz=quiz,
                    question_type=QuizQuestion.QuestionType.MULTIPLE_CHOICE,
                    question_text=q_text,
                    options=options,
                    correct_answer=correct_ans,
                    explanation=explanation,
                    order=idx
                )
            )

        # 2. Flashcards
        flashcard_list = quiz_data.get('flashcards', [])
        for idx, item in enumerate(flashcard_list, start=len(questions_to_create) + 1):
            front = item.get('front', '').strip()
            back = item.get('back', '').strip()
            if not front or not back:
                continue

            questions_to_create.append(
                QuizQuestion(
                    quiz=quiz,
                    question_type=QuizQuestion.QuestionType.FLASHCARD,
                    question_text=front,
                    options=[],
                    correct_answer=back,
                    explanation=back,
                    order=idx
                )
            )

        if questions_to_create:
            QuizQuestion.objects.bulk_create(questions_to_create)

        return quiz

    def _call_gemini_api(self, doc_name: str, context: str) -> dict:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        # Candidate models to try in cascading order
        models_to_try = [self.model_name]
        for m in self.FALLBACK_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        prompt = f"""
Anda adalah pakar pembuat materi ujian dan kartu belajar profesional (Quiz & Flashcard Generator) untuk ThinkIT AI Document Workspace.
Berdasarkan materi dari dokumen "{doc_name}" berikut, buatlah kuis dan kartu belajar yang komprehensif, menguji pemahaman konsep kunci, dan edukatif.

Konteks Dokumen:
{context}

Tugas:
1. Buat judul kuis ("title") yang relevan dan menarik berdasarkan topik dokumen.
2. Buat tepat 5 pertanyaan pilihan ganda ("questions"):
   - "question": Pertanyaan berbobot yang menguji pemahaman konsep (bukan cuma menghafal kata acak).
   - "options": Array berisi 4 opsi jawaban berformat ["A. ...", "B. ...", "C. ...", "D. ..."].
   - "correct_answer": Kunci jawaban yang tepat lengkap dengan opsi (contoh: "A. ...").
   - "explanation": Penjelasan rinci mengapa jawaban tersebut benar dan referensi pembahasannya dari dokumen.
3. Buat tepat 5 kartu belajar flashcard ("flashcards"):
   - "front": Istilah penting, rumus, atau konsep kunci yang perlu diingat.
   - "back": Definisi esensial, fungsi, atau rangkuman penjelasan yang padat dan jelas.

Format output WAJIB JSON murni tanpa pembuka/penutup markdown dengan struktur berikut:
{{
  "title": "Judul Kuis",
  "questions": [
    {{
      "question": "Pertanyaan",
      "options": ["A. Opsi 1", "B. Opsi 2", "C. Opsi 3", "D. Opsi 4"],
      "correct_answer": "A. Opsi 1",
      "explanation": "Penjelasan lengkap"
    }}
  ],
  "flashcards": [
    {{
      "front": "Konsep / Istilah",
      "back": "Penjelasan / Definisi"
    }}
  ]
}}
"""

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        last_error = None
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )

            try:
                logger.info(f"Attempting quiz generation with Gemini model: {model}")
                with urllib.request.urlopen(req, timeout=30) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    text_content = data['candidates'][0]['content']['parts'][0]['text']
                    logger.info(f"Successfully generated quiz using model: {model}")
                    return json.loads(text_content)
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode('utf-8', errors='replace')
                last_error = f"Gemini API ({model}) error HTTP {e.code}: {err_msg}"
                logger.warning(f"Model {model} failed with HTTP {e.code}. Attempting fallback...")
                if e.code in (404, 503, 429):
                    continue
                raise RuntimeError(f"Gagal memanggil Gemini API ({e.code}): {err_msg}")
            except Exception as e:
                last_error = f"Model {model} error: {str(e)}"
                logger.warning(f"Model {model} failed with error: {e}. Attempting fallback...")
                continue

        logger.error(f"All Gemini candidate models failed: {last_error}")
        raise RuntimeError(f"Gagal memanggil Gemini API setelah mencoba model {models_to_try}: {last_error}")

