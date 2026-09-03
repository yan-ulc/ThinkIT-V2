# Master Testing Plan - ThinkIT V2

Dokumen ini merangkum seluruh fungsi, metode, dan alur kritikal dalam *codebase* ThinkIT V2 yang **wajib** dites dalam *pipeline* CI/CD.

## 1. Backend (Django REST Framework)

### A. Aplikasi `accounts` (Authentication & Users)
**Lokasi:** `apps/api/apps/accounts/`
- [ ] `views.RegisterView.post`: Validasi format *email*, *password hashing* (Argon2), dan penerbitan *Access & Refresh Token* pertama.
- [ ] `views.LoginView.post`: Login berhasil (200 OK), *password* salah (401 Unauthorized), dan *rate limiter* (maksimal 5x coba).
- [ ] `views.RefreshView.post`: Memastikan *Refresh Token* kedaluwarsa/dicabut tidak bisa dipakai untuk mendapatkan *Access Token* baru.
- [ ] `views.LogoutView.post` & `LogoutAllView.post`: Memastikan *cookies* terhapus dan token masuk ke daftar hitam (*revoked*).
- [ ] `views.MeView.get`: Ekstraksi data `User` dari JWT *Access Token*.
- [ ] `services.generate_auth_tokens`: Unit test untuk memeriksa struktur JWT *payload*.

### B. Aplikasi `documents` (Manajemen PDF & RAG)
**Lokasi:** `apps/api/apps/documents/`
- [ ] `views.DocumentUploadView.post`: 
  - Validasi *MIME type* (hanya menerima `application/pdf`).
  - Validasi ukuran batas (*file size limit*).
  - Memastikan *upload* ke `core.storage.StorageClient` berhasil dan fungsi Celery `process_document_task.delay()` terpanggil.
- [ ] `views.DocumentListView.get`: Memastikan pengguna hanya bisa melihat dokumen miliknya sendiri.
- [ ] `views.DocumentDeleteView.delete`: Memastikan dokumen yang dihapus juga menghapus file fisiknya dari MinIO/S3 dan *chunks*-nya dari *database* pgvector.
- [ ] `views.DocumentStreamView.get`: Ngetes *Server-Sent Events* (SSE) dengan `StreamingHttpResponse`.
- [ ] **`tasks.process_document_task` (CRITICAL)**: 
  - Harus di-*mock* `PyPDFLoader` agar tidak butuh file PDF asli.
  - Harus di-*mock* `GoogleGenerativeAIEmbeddings` agar tidak memanggil API Google sungguhan (hemat biaya tes).
  - Memastikan teks terpecah menjadi *chunks* dan dimensi *vector* di-*truncate* ke 1536 dengan benar sebelum disimpan.

### C. Aplikasi `chat` (AI Chatbot)
**Lokasi:** `apps/api/apps/chat/`
- [ ] `views.ChatSessionListView`: Pembuatan sesi obrolan (*session*) baru dengan referensi ke dokumen spesifik.
- [ ] **`views.ChatMessageView.post` (CRITICAL)**:
  - Ngetes alur RAG (Retrieval-Augmented Generation):
  - *Mock* proses *embedding query* pengguna.
  - Cek algoritma pencarian vektor cosine di `pgvector` apakah mengembalikan *chunks* paling relevan.
  - *Mock* pemanggilan `ChatGoogleGenerativeAI` agar mengembalikan JSON *response* beserta referensi *(page number/content)* dengan format yang sah.

---

## 2. Frontend (Next.js)

### A. Utilitas & API
**Lokasi:** `apps/web/src/lib/`
- [ ] `lib/api.ts (fetchApi)`: 
  - Memastikan fungsi secara otomatis menempelkan *header* `Authorization: Bearer <token>` (kecuali untuk jalur `/auth/`).
  - Memastikan mekanisme intersepsi `401 Unauthorized` berfungsi (menghapus *token* dari `localStorage` dan menendang *user* kembali ke halaman *Login*).

### B. UI & Komponen (Opsional untuk MVP)
**Lokasi:** `apps/web/src/app/`
- [ ] **Dashboard Upload**: Menyimulasikan proses *drag-and-drop* file dan mengecek apakah UI memblokir tipe file non-PDF.
- [ ] **Dashboard SSE**: Memastikan *state* list dokumen berubah saat menerima event `PROCESSING` dan `READY` dari server.
- [ ] **Chat UI**: Menyimulasikan *render* balasan AI dari JSON *response* (mengecek apakah daftar *references/sumber halaman* tampil dengan baik).

---

## Metodologi Uji Coba

1. **Backend:** 
   - Framework utama: `pytest`, `pytest-django`, `pytest-mock`.
   - Menggunakan `APIClient` bawaan DRF.
   - Eksekusi dengan `addopts = --reuse-db` agar proses *migration* CI cepat.
2. **Frontend:**
   - Framework utama: `Jest` dan `React Testing Library` (kalau kelak akan diimplementasikan).
   - Tipe dan struktur: Dikawal ketat oleh `pnpm build` (TypeScript compiler) pada saat CI berjalan.
