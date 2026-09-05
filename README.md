# ThinkIT — Personal AI Document Workspace

> Blueprint & Project Plan — "software production beneran", bukan tutorial CRUD.

Dokumen ini adalah **single source of truth** untuk arsitektur, keputusan teknis, dan roadmap pengembangan ThinkIT: aplikasi personal di mana user upload dokumen sendiri, dokumen diproses AI di background, lalu user bisa chat dengan AI berdasarkan isi dokumennya sendiri (RAG). **Tidak ada fitur multi-user/workspace/grup** — murni per-akun individual, fokus untuk belajar system design end-to-end.

---

## Daftar Isi

1. [Ringkasan Project](#1-ringkasan-project)
2. [Prinsip & Filosofi Development](#2-prinsip--filosofi-development)
3. [Tech Stack](#3-tech-stack)
4. [Arsitektur Sistem](#4-arsitektur-sistem)
5. [Struktur Repository (Monorepo)](#5-struktur-repository-monorepo)
6. [Struktur Backend Django (Modular)](#6-struktur-backend-django-modular)
7. [Desain Database](#7-desain-database)
8. [Desain Queue & Background Job (Celery)](#8-desain-queue--background-job-celery)
9. [Retry Mechanism & Dead Letter Queue](#9-retry-mechanism--dead-letter-queue)
10. [Idempotency](#10-idempotency)
11. [Pemakaian Redis](#11-pemakaian-redis)
12. [API Design & Contract](#12-api-design--contract)
13. [Authentication System (Custom, di atas Django)](#13-authentication-system-custom-di-atas-django)
14. [Request Lifecycle & Observability](#14-request-lifecycle--observability)
15. [Logging Strategy](#15-logging-strategy)
16. [Local Development (Docker Compose)](#16-local-development-docker-compose)
17. [Environment & Konfigurasi](#17-environment--konfigurasi)
18. [Testing Strategy](#18-testing-strategy)
19. [CI/CD Pipeline](#19-cicd-pipeline)
20. [Arsitektur Production & Scaling](#20-arsitektur-production--scaling)
21. [Roadmap Implementasi (Sprint by Sprint)](#21-roadmap-implementasi-sprint-by-sprint)
22. [Definition of Done](#22-definition-of-done)
23. [Keputusan Terbuka / Open Decisions](#23-keputusan-terbuka--open-decisions)

---

## 1. Ringkasan Project

**Nama:** ThinkIT (Personal AI Document Workspace)

**Konsep:**
User register/login (sistem auth buatan sendiri, dibangun di atas Django) → upload dokumen milik sendiri (PDF, dsb) → dokumen diproses di background (extract → chunk → embed) → user chat dengan AI yang menjawab berdasarkan isi dokumen-dokumennya sendiri (RAG).

**Scope sengaja dibatasi personal-only** — tidak ada workspace, tidak ada invite member, tidak ada role/permission antar user. Satu akun = satu ruang dokumen privat miliknya sendiri.

Tujuan project ini bukan cuma "bikin fitur jalan", tapi memahami dan mempraktikkan konsep-konsep production-grade:

- **Authentication system dari nol di atas Django** (password hashing, JWT custom, refresh token rotation, session revocation) — bukan pakai `django-allauth` instan, tapi paham *bagaimana* Django memfasilitasi ini di level fundamental.
- Asynchronous processing dengan **Celery** (queue & worker)
- Retry, backoff, idempotency
- Caching yang disiplin (bukan cache semua hal)
- Observability (request id, structured logging, error tracking)
- Testing bertingkat (unit → integration → e2e)
- CI/CD dengan quality gate
- Containerization & path menuju horizontal scaling

**Target akhir:** Full-stack AI app starter yang bisa didemokan sebagai portofolio *system design* + *backend engineering* berbasis Python, bukan sekadar "another Next.js CRUD app".

---

## 2. Prinsip & Filosofi Development

Kita **tidak** membangun semuanya sekaligus. Aturan mainnya:

```
1. Kenapa kita butuh ini?
2. Masalah apa yang diselesaikan?
3. Bagaimana arsitekturnya?
4. Implementasi
5. Test
6. Commit Git
```

Prinsip tambahan:

- **View ≠ Service.** Di Django/DRF, `views.py` (atau ViewSet) hanya urus HTTP request/response + memanggil serializer untuk validasi. Business logic murni ditaruh di `services.py`, bukan menumpuk di view — supaya bisa ditest tanpa perlu HTTP client.
- **Jangan percaya frontend.** Semua ownership check (dokumen ini milik user yang login atau bukan) wajib di backend, lewat `permissions.py` DRF atau query filter eksplisit (`queryset.filter(user=request.user)`).
- **Consistency > cleverness.** Format response API harus konsisten dari hari pertama (pakai custom exception handler DRF).
- **Idempotency itu default, bukan fitur tambahan** untuk endpoint yang membuat resource (create document).
- **Cache adalah keputusan sadar**, bukan refleks.
- **Auth jangan pernah "sepertinya aman"** — setiap keputusan (hashing algorithm, token expiry, storage token) harus punya alasan eksplisit, bukan asumsi.
- **Fat services, thin views, dumb serializers.** Serializer fokus ke shape data & validasi field, bukan tempat business rule kompleks.
- **Setiap Sprint harus punya deliverable yang bisa didemo**, bukan cuma "code jalan di local".

---

## 3. Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| Frontend | Next.js (App Router) + React | SSR/CSR hybrid, ekosistem besar |
| UI | Tailwind CSS + shadcn/ui | Cepat, konsisten, customizable |
| **Backend API** | **Django + Django REST Framework (DRF)** | Batteries-included, ORM matang, ekosistem Python kuat untuk AI/ML tooling |
| Validation | DRF Serializers | Validasi input + serialisasi output, terintegrasi native dengan Django |
| Database | PostgreSQL | Relational, robust, mendukung pgvector |
| ORM | **Django ORM** (native) | Migration system bawaan (`makemigrations`/`migrate`), sudah battle-tested |
| Cache & Broker | Redis (via `django-redis` untuk cache, `redis-py` untuk broker Celery) | Cache, rate limiting, Celery broker, refresh-token store |
| **Queue & Background Job** | **Celery** (worker) + **Celery Beat** (opsional, scheduled task) + **Flower** (monitoring dashboard) | Standar de-facto async task di ekosistem Python, native retry/backoff |
| Auth | **Custom-built di atas Django** — Argon2id (`django.contrib.auth.hashers.Argon2PasswordHasher`, via `argon2-cffi`) + JWT custom (`PyJWT`) untuk access token + Refresh Token (httpOnly cookie, di-hash & disimpan di tabel sendiri, revocable) | Belajar auth dari nol: hashing, token lifecycle, revocation, rate limiting login — Django menyediakan primitif (hasher, ORM, middleware), tapi flow token dan endpoint kita bangun sendiri, **tanpa** `djangorestframework-simplejwt` atau `django-allauth` |
| Object Storage | Cloudflare R2 (via `boto3`, S3-compatible) | Murah, tanpa egress fee |
| Vector Search | **pgvector** (extension PostgreSQL) via `pgvector-python` (`pgvector.django.VectorField`) | Tidak perlu infra tambahan (Pinecone/Qdrant) di awal, terintegrasi langsung ke Django model |
| AI Provider | Anthropic API (Claude) — chat & reasoning + embedding | Dipanggil via `anthropic` Python SDK dari dalam Celery task & view chat |
| Container | Docker | Konsistensi environment |
| Local Orchestration | Docker Compose | Mudah untuk local dev |
| Testing | `pytest` + `pytest-django` + `factory_boy` (backend) — Playwright (e2e, frontend) | Idiomatik untuk ekosistem Django |
| Error Tracking | Sentry (`sentry-sdk` dengan integrasi Django & Celery) | Production error visibility |
| CI/CD | GitHub Actions | Terintegrasi langsung dengan repo |
| Dependency Management (Python) | `uv` | Reproducible environment, lock file |
| Package Manager (JS, untuk `apps/web`) | pnpm | Efisien, cepat |

> **Catatan penting #1:** kita memilih **pgvector**, bukan vector DB terpisah. PostgreSQL menyimpan semuanya: users, documents, chunks, dan embeddings — dan karena backend-nya Django, kita bisa pakai `VectorField` dari `pgvector-python` langsung sebagai field model, jadi query vector search tetap lewat Django ORM/QuerySet (dengan sedikit raw SQL untuk operator jarak vektor).
>
> **Catatan penting #2 (queue):** karena backend Python, kita pakai **Celery** (bukan BullMQ — itu library Node.js). Konsepnya sama persis (queue, worker, retry, backoff, dead letter), Celery bahkan sudah punya dukungan retry & exponential backoff bawaan yang lebih matang.
>
> **Catatan penting #3 (auth):** kita sengaja **tidak pakai** `django-allauth`, `dj-rest-auth`, atau `djangorestframework-simplejwt` sebagai black box. Django tetap dipakai untuk primitif-primitif dasarnya (Custom User Model, password hasher, ORM), tapi **flow register/login/refresh/logout dan endpoint-nya kita tulis sendiri** supaya benar-benar paham mekanismenya.

---

## 4. Arsitektur Sistem

```
                         INTERNET
                             │
                             ▼
                    ┌─────────────────┐
                    │  Next.js Web    │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
                    ┌─────────────────┐
                    │  Django + DRF   │
                    │   API Server    │
                    │  + Auth Module  │
                    │ (Gunicorn/ASGI) │
                    └────────┬────────┘
                             │
             ┌───────────────┼────────────────┐
             ▼               ▼                ▼
      ┌────────────┐  ┌────────────┐  ┌─────────────┐
      │ PostgreSQL │  │   Redis    │  │ Object      │
      │ (+pgvector)│  │(cache/rt/  │  │ Storage(R2) │
      │            │  │ celery bkr)│  │             │
      └────────────┘  └──────┬─────┘  └─────────────┘
                             │
                             ▼
                       ┌──────────┐
                       │  Celery  │
                       │  Queue   │
                       └────┬─────┘
                             │
                    ┌────────▼────────┐
                    │  Celery Worker  │
                    │ PDF Processing  │
                    │ Chunking        │
                    │ Embedding (AI)  │
                    └─────────────────┘
```

**Alur data utama (document processing):**

```
User Upload → Django API (save metadata, status=QUEUED) → Celery Task (.delay())
     → Worker (download → extract → clean → chunk → embed)
     → Save ke pgvector (Django ORM) → status=READY
```

**Alur data chat (RAG, scoped ke user sendiri):**

```
User Question → Django API → Embed Query → Vector Search (pgvector, filter user=request.user)
     → Ambil Top-K Chunks Relevan (hanya dari dokumen milik user itu)
     → Kirim ke LLM sebagai context
     → LLM Answer → Response ke user
```

---

## 5. Struktur Repository (Monorepo)

Karena backend sekarang Django (Python) dan frontend Next.js (JavaScript/TypeScript), monorepo ini bersifat **polyglot** — dua ekosistem package manager berjalan berdampingan tapi tetap dalam satu repo untuk kemudahan koordinasi (satu `docker-compose.yml`, satu CI pipeline, satu README).

```
thinkit/
│
├── apps/
│   ├── web/                    → Next.js frontend
│   │   ├── package.json
│   │   └── ...
│   │
│   └── api/                    → Django project (API + Celery worker, satu codebase)
│       ├── manage.py
│       ├── pyproject.toml      → dependency management (uv)
│       ├── config/             → Django project settings
│       │   ├── settings/
│       │   │   ├── base.py
│       │   │   ├── development.py
│       │   │   ├── staging.py
│       │   │   └── production.py
│       │   ├── urls.py
│       │   ├── celery.py       → Celery app instance & config
│       │   ├── asgi.py
│       │   └── wsgi.py
│       │
│       ├── apps/                → Django "apps" (modul domain, lihat §6)
│       │   ├── accounts/
│       │   ├── documents/
│       │   └── chat/
│       │
│       ├── core/                 → shared utilities lintas app
│       │   ├── middleware/
│       │   ├── exceptions.py
│       │   ├── pagination.py
│       │   ├── jwt.py
│       │   ├── redis_client.py
│       │   └── storage.py
│       │
│       └── tests/                → integration/e2e test level project
│
├── packages/
│   └── shared-types/            → TypeScript types untuk kontrak API (opsional: digenerate dari OpenAPI schema DRF, atau ditulis manual dan disinkronkan)
│
├── docker/
│   ├── api.Dockerfile            → dipakai juga untuk image worker (entrypoint beda)
│   └── web.Dockerfile
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── pnpm-workspace.yaml           → hanya mencakup apps/web & packages/shared-types
└── README.md
```

> **Kenapa `apps/api` isinya Django project, bukan cuma "1 service"?** Karena Celery worker **berbagi codebase yang sama** dengan API (models, tasks, config) — ini pola standar di dunia Django. Worker dan API adalah proses berbeda (`python manage.py runserver` vs `celery -A config worker`) yang dijalankan dari kode yang sama, bukan dua aplikasi terpisah seperti di arsitektur Node.js sebelumnya.

**Kenapa tetap disebut monorepo?**

```
        apps/api (Django models & DRF serializers = source of truth skema data)
               │
               ▼
   OpenAPI schema (drf-spectacular) ──generate──▶ packages/shared-types
               │                                          │
               ▼                                          ▼
          apps/web (Next.js) ◀────────── import types ────┘
```

`apps/web` tetap bisa mendapat type-safety terhadap kontrak API, hanya saja sumber kebenarannya sekarang Django/DRF (lewat OpenAPI schema), bukan file TypeScript yang di-share langsung seperti pada arsitektur Node.js.

---

## 6. Struktur Backend Django (Modular)

**Anti-pattern yang dihindari:** semua logic ditumpuk di `views.py` (fat views, fat models tanpa batas).

Setiap domain jadi satu **Django app** dengan struktur konsisten:

```
apps/api/apps/documents/
│
├── __init__.py
├── apps.py                 → DocumentsConfig (App registry)
├── models.py                → Document, DocumentChunk (Django ORM models)
├── serializers.py            → DocumentSerializer, DocumentCreateSerializer (DRF)
├── services.py                → business logic murni: create_document(), delete_document()
├── views.py                    → ViewSet/APIView, tipis, panggil services.py
├── permissions.py               → IsOwner (cek document.user == request.user)
├── urls.py                       → routing khusus app ini
├── tasks.py                       → Celery tasks: process_document_task
├── admin.py                        → Django Admin registration (berguna untuk debug manual)
├── migrations/                      → auto-generated oleh `makemigrations`
└── tests/
    ├── test_models.py
    ├── test_services.py
    └── test_views.py
```

Struktur yang sama diterapkan untuk `apps/accounts` (user, auth) dan `apps/chat`.

**`config/` (project-level, bukan per-app):**

```
config/
├── settings/
│   ├── base.py          → setting umum (INSTALLED_APPS, MIDDLEWARE, DATABASES, dst)
│   ├── development.py   → DEBUG=True, override untuk local
│   ├── staging.py
│   └── production.py    → DEBUG=False, security headers ketat
├── urls.py               → root urlconf, include semua apps/*/urls.py
├── celery.py              → inisialisasi Celery app, autodiscover tasks
├── asgi.py                 → untuk kebutuhan async (kalau nanti pakai Channels/SSE)
└── wsgi.py                  → untuk Gunicorn (sync, default)
```

**Alur tanggung jawab per layer:**

```
urls.py         → routing
views.py        → parsing request (via serializer), panggil service, bentuk response
services.py     → business logic murni (testable tanpa HTTP, tanpa request object)
serializers.py  → validasi & shape data (input/output)
models.py       → struktur data & constraint tingkat database
permissions.py  → aturan akses per-request (DRF permission classes)
tasks.py        → unit kerja async yang dijalankan Celery worker
```

**Custom middleware (`core/middleware/`):**

```
request_id_middleware.py   → generate & attach X-Request-ID ke setiap request
logging_middleware.py       → log incoming/outgoing request terstruktur
```

**Custom exception handler (`core/exceptions.py`):**

Override `EXCEPTION_HANDLER` DRF supaya semua error (validasi, 404, 403, unhandled exception) selalu keluar dalam format konsisten (lihat §12).

---

## 7. Desain Database

### Entity Relationship (high level)

```
User (Custom User Model)
 └── Document
       └── DocumentChunk (+ embedding vector)

User
 └── RefreshToken   (untuk sesi login, bisa lebih dari satu — multi-device)
```

Tidak ada entitas Workspace/Member — semua langsung terikat ke `user`.

### Model: `accounts.User` (Custom User Model)

Django **wajib** pakai Custom User Model sejak awal project (mengganti `AbstractBaseUser`), supaya fleksibel — kita tidak pakai username, cukup email.

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| email | `EmailField(unique=True)` | dipakai untuk login, jadi `USERNAME_FIELD` |
| password | `CharField` (bawaan `AbstractBaseUser`) | disimpan dalam bentuk hash Argon2id lewat Django password hasher |
| name | `CharField` | |
| email_verified_at | `DateTimeField(null=True)` | untuk fitur verifikasi email (opsional) |
| is_active | `BooleanField(default=True)` | bawaan Django, dipakai untuk soft-disable akun |
| created_at | `DateTimeField(auto_now_add=True)` | |
| updated_at | `DateTimeField(auto_now=True)` | |

### Model: `accounts.RefreshToken`

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| user | `ForeignKey(User, on_delete=CASCADE, related_name="refresh_tokens")` | |
| token_hash | `CharField` | refresh token **di-hash** sebelum disimpan (jangan simpan plaintext) |
| user_agent | `CharField(null=True)` | untuk tampilkan "device yang login" |
| ip_address | `GenericIPAddressField(null=True)` | |
| expires_at | `DateTimeField` | misal 7–30 hari |
| revoked_at | `DateTimeField(null=True)` | diisi saat logout/revoke manual |
| created_at | `DateTimeField(auto_now_add=True)` | |

> Kenapa refresh token disimpan di DB (bukan cuma stateless JWT)? Supaya bisa **di-revoke** (logout paksa, logout semua device, atau saat terdeteksi reuse token yang mencurigakan — tanda pencurian token).

### Model: `accounts.PasswordResetToken` (opsional, sprint lanjutan)

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| user | `ForeignKey(User, on_delete=CASCADE)` | |
| token_hash | `CharField` | |
| expires_at | `DateTimeField` | biasanya pendek, 15–30 menit |
| used_at | `DateTimeField(null=True)` | token sekali pakai |

### Model: `documents.Document`

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| user | `ForeignKey(User, on_delete=CASCADE, related_name="documents")` | pemilik dokumen — **tidak ada workspace** |
| name | `CharField` | |
| storage_key | `CharField` | path di R2 |
| mime_type | `CharField` | |
| size | `BigIntegerField` | bytes |
| status | `CharField(choices=StatusChoices)` | `UPLOADING`, `QUEUED`, `PROCESSING`, `READY`, `FAILED` |
| error_message | `TextField(null=True)` | diisi kalau status FAILED |
| created_at | `DateTimeField(auto_now_add=True)` | |
| updated_at | `DateTimeField(auto_now=True)` | |

**Lifecycle status dokumen:**

```
UPLOADING → QUEUED → PROCESSING → READY
                              └──→ FAILED
```

### Model: `documents.DocumentChunk`

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| document | `ForeignKey(Document, on_delete=CASCADE, related_name="chunks")` | |
| user | `ForeignKey(User, on_delete=CASCADE)` (denormalized, untuk filter vector search cepat & aman) | |
| chunk_index | `IntegerField` | urutan chunk dalam dokumen |
| content | `TextField` | isi teks chunk |
| embedding | `VectorField(dimensions=1536)` (dari `pgvector.django`) | disesuaikan dengan dimensi model embedding yang dipakai |
| token_count | `IntegerField` | |
| created_at | `DateTimeField(auto_now_add=True)` | |

Index penting (didefinisikan lewat `Meta.indexes` di model, dieksekusi via migration):

```python
# documents/models.py (cuplikan)
from pgvector.django import VectorField, HnswIndex

class DocumentChunk(models.Model):
    ...
    embedding = VectorField(dimensions=1536)

    class Meta:
        indexes = [
            HnswIndex(
                name="idx_chunks_embedding",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
            models.Index(fields=["user"]),
        ]
```

```sql
-- otomatis dibuat lewat Django migration, ditulis di sini untuk gambaran konsep:
CREATE INDEX idx_documents_user ON documents_document (user_id);
CREATE INDEX idx_refresh_tokens_user ON accounts_refreshtoken (user_id);
```

> **Kenapa `user` didenormalisasi ke `DocumentChunk`?** Supaya query vector search bisa langsung `.filter(user=request.user)` tanpa join ke `Document` dulu — penting untuk memastikan user A tidak pernah bisa mengambil chunk milik user B, sekaligus mempercepat query.

### Model: `core.IdempotencyKey`

| Field | Tipe Django | Keterangan |
|---|---|---|
| id | `UUIDField` (PK) | |
| key | `CharField(unique=True)` | dikirim client via header `Idempotency-Key` |
| user | `ForeignKey(User, on_delete=CASCADE)` | idempotency key discope per-user |
| response_body | `JSONField` | hasil response yang di-cache |
| status_code | `IntegerField` | |
| created_at | `DateTimeField(auto_now_add=True)` | |
| expires_at | `DateTimeField` | TTL, misal 24 jam |

---

## 8. Desain Queue & Background Job (Celery)

**Nama task:** `apps.documents.tasks.process_document_task`

**Cara pemanggilan dari view (producer):**

```python
# apps/documents/services.py
def create_document(user, uploaded_file_meta) -> Document:
    document = Document.objects.create(
        user=user,
        status=Document.StatusChoices.QUEUED,
        ...
    )
    process_document_task.delay(document_id=str(document.id))
    return document
```

**Task (consumer), didefinisikan di `apps/documents/tasks.py`:**

```python
@shared_task(
    bind=True,
    autoretry_for=(TransientProcessingError,),
    retry_backoff=5,        # mulai dari 5 detik, exponential
    retry_backoff_max=60,
    max_retries=3,
)
def process_document_task(self, document_id: str):
    ...
```

**Flow lengkap:**

```
API (Django view)
 ├── Upload file ke R2
 ├── Insert row `Document` (status = QUEUED)
 └── process_document_task.delay(document_id)
         │
         ▼
     Celery Worker
         │
         ├── status = PROCESSING
         ├── Download file dari R2
         ├── Extract text (pypdf / unstructured)
         ├── Clean text (hapus whitespace berlebih, header/footer noise)
         ├── Chunking (misal 500–800 token per chunk, overlap 50–100 token)
         ├── Generate embedding per chunk (batch request ke AI provider)
         ├── Bulk insert ke `DocumentChunk` (sertakan user)
         └── status = READY
```

Jika gagal di tahap manapun → `status = FAILED` + `error_message` diisi + task masuk retry mechanism (lihat §9).

**Progress tracking (opsional, Sprint 5):**

Gunakan `self.update_state(state="PROGRESS", meta={"percent": 50})` di dalam task, lalu expose ke frontend lewat endpoint `GET /api/v1/jobs/:id` (query task result via Celery result backend / AsyncResult), atau simpan progress manual ke Redis untuk polling yang lebih murah.

**Monitoring:** **Flower** (dashboard web untuk Celery) dipasang sebagai service tambahan di Docker Compose untuk melihat task yang berjalan, gagal, dan antrian — setara dengan Bull Board di ekosistem Node.js.

---

## 9. Retry Mechanism & Dead Letter Queue

Task AI processing bisa gagal karena hal yang **transient** (503, timeout, rate limit) — bukan berarti harus gagal permanen.

**Konfigurasi Celery (per-task, lihat contoh di §8):**

```python
retry_backoff=5         # delay awal 5 detik
retry_backoff_max=60    # cap maksimum delay antar retry
max_retries=3
```

```
Attempt 1 → gagal → tunggu ~5s (+ jitter)
Attempt 2 → gagal → tunggu ~30s
Attempt 3 → gagal → task dianggap gagal permanen
```

**Dead Letter Queue (DLQ) ala Celery:** Celery tidak punya DLQ bawaan seperti BullMQ, jadi kita implementasikan manual:

- Task yang habis retry-nya di-catch di `on_failure` handler → status `Document` diubah jadi `FAILED` + `error_message` diisi.
- (Opsional) publish event ke queue terpisah (`document-processing-failed`) atau catat ke tabel `FailedJob` untuk investigasi manual & bisa di-reprocess manual dari Django Admin.

**Klasifikasi error (dibedakan lewat custom exception class):**

```python
class TransientProcessingError(Exception):
    """Network timeout, 503, rate limit — layak di-retry."""

class PermanentProcessingError(Exception):
    """File corrupt, format tidak didukung — jangan retry, buang-buang biaya API."""
```

`autoretry_for` di task hanya menangkap `TransientProcessingError`; `PermanentProcessingError` langsung menandai dokumen `FAILED` tanpa retry.

---

## 10. Idempotency

**Masalah:** client retry request yang sebenarnya sudah sukses (misal karena timeout jaringan) → menyebabkan duplikasi resource dan double billing ke AI API.

**Solusi:** endpoint yang bersifat *mutating* dan mahal (create document) menerima header:

```
Idempotency-Key: <uuid yang di-generate client>
```

**Implementasi sebagai DRF middleware/decorator:**

```
Request masuk dengan Idempotency-Key (+ request.user dari auth)
        │
        ▼
Cek IdempotencyKey.objects.filter(key=..., user=request.user).first()
        │
   ┌────┴────┐
   │         │
 ADA       TIDAK ADA
   │         │
Return    Proses request normal
cached    → simpan response ke IdempotencyKey
response  → return response
```

Endpoint yang wajib idempotent di project ini:

- `POST /api/v1/documents`
- `POST /api/v1/chat` (opsional, tergantung kebutuhan)

---

## 11. Pemakaian Redis

Redis dipakai untuk **beberapa keperluan berbeda**, bukan cuma cache:

```
Redis
├── Celery broker (queue & task state)
├── Django cache backend (django-redis) untuk API response cache
├── Rate limiting (login/register attempt, per user/IP)
├── Blacklist/denylist access token (opsional, untuk instant-revoke sebelum token expired)
└── Temporary/ephemeral data (misal: OTP, progress task)
```

**Aturan cache:**

- Cache hanya untuk data yang **read-heavy** dan **tidak sering berubah** (contoh: `GET /documents/:id`), pakai `django-redis` sebagai `CACHES` backend Django.
- Selalu ada **TTL** — tidak ada cache tanpa expiry (`cache.set(key, value, timeout=...)`).
- Wajib ada **cache invalidation** saat data terkait di-update (`cache.delete(key)` di `services.py` setelah update/delete).

**Contoh flow cache:**

```
GET /documents/123
      │
      ▼
Django Cache (Redis)
   ┌──┴──┐
  HIT   MISS
   │      │
Return  Query PostgreSQL (Django ORM) → cache.set() → Return
```

**Rate limiting login (krusial untuk auth custom, mencegah brute force):**

Diimplementasikan manual pakai Redis (`INCR` + `EXPIRE`), bukan library pihak ketiga, supaya konsisten dengan filosofi "auth dibangun sendiri":

```
Key: rate-limit:login:{email atau IP}
Limit: 5 percobaan gagal / 15 menit → lock sementara (429)
```

---

## 12. API Design & Contract

### Konvensi Umum

- Base path: `/api/v1`
- Semua response **konsisten** — dipaksa lewat custom `EXCEPTION_HANDLER` DRF + custom response wrapper:

**Success:**

```json
{
  "data": { "id": "123", "name": "My Document" }
}
```

**Error:**

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found"
  },
  "requestId": "req_8f29ab"
}
```

**List/pagination** (custom `PageNumberPagination` DRF yang di-override formatnya):

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 134 }
}
```

### Endpoint List

**Auth**

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh          → tukar refresh token dengan access token baru
POST   /api/v1/auth/logout           → revoke refresh token
POST   /api/v1/auth/logout-all       → revoke semua refresh token milik user (semua device)
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password  (opsional, sprint lanjutan)
POST   /api/v1/auth/reset-password   (opsional, sprint lanjutan)
```

**Documents** (semua otomatis di-scope ke `request.user` — tidak ada `workspaceId` di path)

```
POST   /api/v1/documents             (Idempotency-Key wajib)
GET    /api/v1/documents
GET    /api/v1/documents/:id
DELETE /api/v1/documents/:id
```

**Chat / RAG**

```
POST   /api/v1/chat
GET    /api/v1/chat/:conversationId/messages
```

**Jobs**

```
GET    /api/v1/jobs/:id     → wrapper di atas Celery AsyncResult
```

**Misc**

```
GET    /health
GET    /api/v1/schema/       → OpenAPI schema (drf-spectacular), untuk generate types frontend
```

> **Catatan:** kita pakai DRF `APIView`/`ViewSet` sesuai kebutuhan tiap endpoint — endpoint sederhana (auth) pakai `APIView`, resource CRUD (documents) bisa pakai `ModelViewSet` supaya routing lebih ringkas lewat `DefaultRouter`.

---

## 13. Authentication System (Custom, di atas Django)

Django menyediakan primitif (Custom User Model, password hasher, ORM) tapi **flow lengkapnya kita bangun sendiri** — tanpa `django-allauth`/`dj-rest-auth`/`djangorestframework-simplejwt`.

### 13.1 Password Hashing

- Algoritma: **Argon2id**, diaktifkan lewat setting Django:

```python
# config/settings/base.py
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]
```

- Butuh dependency `argon2-cffi` terpasang. Django otomatis memakai hasher ini untuk `user.set_password()` dan `user.check_password()` — kita tetap yang menentukan *kapan* dan *bagaimana* dipanggil dalam flow register/login kita sendiri.
- Password **tidak pernah** di-log, tidak pernah dikembalikan di response apapun.

### 13.2 Token Strategy: Access Token + Refresh Token

```
Access Token (JWT, dibuat manual pakai PyJWT — bukan simplejwt)
  - Umur pendek: 15 menit
  - Isi payload: user_id, iat, exp (jangan taruh data sensitif)
  - Dikirim di header: Authorization: Bearer <token>
  - Diverifikasi lewat DRF custom Authentication class (core/authentication.py)
  - Stateless — tidak query DB setiap request (cukup verifikasi signature)

Refresh Token
  - Umur panjang: 7–30 hari
  - Disimpan di httpOnly + Secure cookie (tidak bisa diakses JavaScript → mitigasi XSS)
  - Di-hash (pakai Django hasher juga, atau SHA-256 sederhana) sebelum disimpan ke model RefreshToken
  - Setiap dipakai untuk refresh → di-rotate (token lama direvoke, token baru diterbitkan)
```

**Custom DRF Authentication class** (`core/authentication.py`):

```python
class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = self.get_token_from_header(request)
        if not token:
            return None
        payload = verify_access_token(token)  # dari core/jwt.py, pakai PyJWT
        user = User.objects.get(id=payload["user_id"])
        return (user, None)
```

Class ini didaftarkan di `DEFAULT_AUTHENTICATION_CLASSES` setting DRF, sehingga `request.user` otomatis terisi di semua view tanpa perlu ditulis ulang di tiap endpoint.

### 13.3 Flow Register

```
POST /auth/register
      │
      ▼
Validasi input (Serializer): email format, password minimal strength
      │
      ▼
Cek email sudah terdaftar? (User.objects.filter(email=...).exists())
   ┌──┴──┐
  YES    NO
   │      │
409    user.set_password(raw_password)  → Argon2id
        → User.objects.create(...)
        → Generate access + refresh token
        → Response: access token + set-cookie refresh token
```

### 13.4 Flow Login

```
POST /auth/login
      │
      ▼
Rate limit check (Redis) → terlalu banyak percobaan gagal? → 429
      │
      ▼
Cari user by email (User.objects.filter(email=...).first())
      │
      ▼
user.check_password(raw_password)
   ┌──┴──┐
 SALAH   BENAR
   │      │
Increment  Reset counter rate limit
failed     → Generate access + refresh token
counter    → RefreshToken.objects.create(token_hash=..., user=user, ...)
   │        → Response: access token + set-cookie refresh token
 401
```

### 13.5 Flow Refresh Token (dengan Rotation & Reuse Detection)

```
POST /auth/refresh (cookie refresh token disertakan otomatis)
      │
      ▼
Cari RefreshToken WHERE token_hash = hash(incoming) AND revoked_at IS NULL
      │
   ┌──┴──┐
 TIDAK   ADA
 KETEMU   │
   │      ▼
   │   Expired?
   │  ┌──┴──┐
   │ YES    NO
   │  │      │
   │ 401   Revoke token ini (rotation)
   │       → Generate refresh token baru + access token baru
   │       → Simpan yang baru, response ke client
   ▼
Kemungkinan token dicuri/reuse
→ Revoke SEMUA refresh token user ini (safety measure)
→ 401 + log security event
```

> **Reuse detection** ini penting: kalau ada refresh token yang sudah di-rotate tapi dipakai lagi, itu indikasi token dicuri (misal disalin attacker) — respons defensifnya adalah revoke semua sesi user tsb.

### 13.6 Flow Logout

```
POST /auth/logout
      │
      ▼
Revoke refresh token yang sedang dipakai (set revoked_at = now())
      │
      ▼
Clear cookie
```

`POST /auth/logout-all` → revoke semua `RefreshToken` milik `request.user`, berguna untuk fitur "logout dari semua device".

### 13.7 Otorisasi Level Resource (DRF Permission Class)

Karena tidak ada role/workspace, otorisasi jadi sederhana tapi **tetap wajib dicek eksplisit**, lewat custom permission class:

```python
# apps/documents/permissions.py
class IsOwner(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id
```

```
Request GET/DELETE /documents/:id
      │
      ▼
JWTAuthentication → dapat request.user
      │
      ▼
get_object() → Document.objects.get(id=:id)
      │
   ┌──┴──┐
 TIDAK   ADA
 KETEMU   │
   │      ▼
  404   IsOwner.has_object_permission()
        ┌──┴──┐
       YES    NO
        │      │
       200    403/404 (pilih 404 supaya tidak bocorkan keberadaan resource orang lain)
```

> **Tips ekstra:** selain permission class, filter queryset di level awal juga (`Document.objects.filter(user=request.user)`) sehingga user lain bahkan tidak akan pernah muncul di hasil list — defense in depth, bukan mengandalkan satu lapis saja.

### 13.8 Checklist Keamanan Auth

- [ ] Password di-hash dengan Argon2id (`PASSWORD_HASHERS` Django), tidak pernah plaintext di log/response.
- [ ] Refresh token di-hash sebelum disimpan di DB.
- [ ] Refresh token di cookie: `httpOnly`, `Secure`, `SameSite=Strict/Lax`.
- [ ] Access token umur pendek (15 menit), refresh token di-rotate setiap dipakai.
- [ ] Reuse detection untuk refresh token yang sudah direvoke.
- [ ] Rate limiting untuk endpoint login/register (mitigasi brute force), berbasis Redis manual.
- [ ] Validasi kekuatan password minimal (panjang, tidak boleh password umum) — bisa manfaatkan Django's `AUTH_PASSWORD_VALIDATORS` bawaan.
- [ ] CORS dikonfigurasi ketat (`django-cors-headers`, hanya origin frontend yang diizinkan).
- [ ] `CSRF_TRUSTED_ORIGINS` & security middleware Django (`SecurityMiddleware`) dikonfigurasi benar untuk production.
- [ ] Semua endpoint sensitif pakai HTTPS di production (`SECURE_SSL_REDIRECT=True`).

---

## 14. Request Lifecycle & Observability

Setiap request melewati pipeline berikut (kombinasi Django middleware + DRF):

```
Request
   ↓
RequestIDMiddleware (generate X-Request-ID)
   ↓
LoggingMiddleware (log incoming)
   ↓
JWTAuthentication (verifikasi access token → request.user)
   ↓
Throttling/Rate Limiting (DRF throttle class / custom Redis check)
   ↓
Serializer Validation
   ↓
Permission Check (IsOwner, dll)
   ↓
View → Service → Django ORM → Database
   ↓
Response (+ requestId disertakan)
```

Request ID ini di-propagate ke semua log terkait request tersebut, termasuk log dari Celery worker jika request tersebut memicu task (misal document upload → task processing) sehingga bisa di-trace end-to-end:

```
[req_8f29ab] POST /documents
[req_8f29ab] Document created, id=doc_123
[req_8f29ab] Task queued, task_id=abc-456
[abc-456]    Worker started processing doc_123
[abc-456]    Embedding generation failed
```

---

## 15. Logging Strategy

**Tidak pakai** `print("MASUK SINI WOI")`. Pakai **structured logging** dengan `structlog` atau konfigurasi `LOGGING` bawaan Django yang di-set ke JSON formatter:

```json
{
  "level": "info",
  "requestId": "req_123",
  "userId": "user_123",
  "message": "Document processing started",
  "timestamp": "2026-08-29T10:00:00Z"
}
```

Error dari worker:

```json
{
  "level": "error",
  "documentId": "doc_123",
  "taskId": "abc-456",
  "message": "Embedding generation failed",
  "stack": "..."
}
```

> **Khusus modul auth:** jangan pernah log password, token mentah, atau header `Authorization`/`Cookie`. Yang boleh dilog cukup event-nya (misal `"login_failed"`, `"refresh_token_reused"`) beserta `user_id`/`email` (tanpa data kredensial).

Error kritis production dikirim ke **Sentry** (`sentry-sdk[django]` + integrasi Celery) dengan context tambahan (requestId, userId) — pastikan `before_send` di-scrub agar tidak menangkap token/password dari request body.

---

## 16. Local Development (Docker Compose)

**Fase awal (disarankan):** hanya infrastruktur yang di-Docker-kan, app tetap jalan local supaya lebih mudah debug:

```
Docker:
  ├── PostgreSQL (+ pgvector extension)
  └── Redis

Local:
  ├── apps/web        → pnpm dev
  ├── apps/api         → python manage.py runserver
  └── Celery worker     → celery -A config worker --loglevel=info (dijalankan terpisah dari runserver, di terminal lain)
```

**Fase akhir (Sprint 9):** semuanya di-containerize:

```
docker compose up
  ├── web
  ├── api        (Gunicorn/Uvicorn)
  ├── worker     (celery worker)
  ├── flower     (celery monitoring, opsional)
  ├── postgres
  └── redis
```

Contoh `docker-compose.dev.yml` (infra only):

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: thinkit
      POSTGRES_USER: thinkit
      POSTGRES_PASSWORD: thinkit
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

Contoh potongan `docker-compose.yml` final untuk service `api` & `worker` (satu image, entrypoint berbeda):

```yaml
  api:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    env_file: apps/api/.env
    depends_on: [postgres, redis]

  worker:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    command: celery -A config worker --loglevel=info
    env_file: apps/api/.env
    depends_on: [postgres, redis]

  flower:
    build:
      context: .
      dockerfile: docker/api.Dockerfile
    command: celery -A config flower --port=5555
    ports: ["5555:5555"]
    depends_on: [redis]
```

---

## 17. Environment & Konfigurasi

`apps/api/.env.example`:

```env
# Django
DJANGO_SETTINGS_MODULE=config.settings.development
DJANGO_SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://thinkit:thinkit@localhost:5432/thinkit

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1

# Auth (custom, bukan simplejwt)
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES_MINUTES=15
JWT_REFRESH_EXPIRES_DAYS=7
COOKIE_DOMAIN=localhost

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# AI
ANTHROPIC_API_KEY=
EMBEDDING_MODEL=

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Semua env var **divalidasi saat startup** — bisa pakai `django-environ` atau `pydantic-settings` untuk memaksa tipe & keberadaan variabel (mirip peran Zod di sisi Node.js sebelumnya). Kalau ada yang kosong/salah tipe, app harus gagal start dengan pesan jelas, bukan error random di tengah runtime. Khusus `JWT_ACCESS_SECRET` dan `DJANGO_SECRET_KEY`, wajib panjang minimal tertentu dan tidak boleh nilai default di production.

**Pemisahan environment (lewat `DJANGO_SETTINGS_MODULE`):**

```
Local       → config.settings.development → Development DB (Docker)
Staging     → config.settings.staging     → Staging DB (managed, misal Neon/Supabase)
Production  → config.settings.production  → Production DB (managed, terpisah total dari staging)
```

---

## 18. Testing Strategy

Tidak semua hal ditest — prioritas berdasarkan risiko dan value.

| Jenis | Cakupan | Tools |
|---|---|---|
| **Unit** | Business logic murni: `accounts/services.py` (hash/verify, token generation), `documents/services.py` (ownership check) | `pytest` + `pytest-django` |
| **Integration** | API + Database + Redis (contoh: `POST /documents` → cek row DB + task masuk Celery queue; `POST /auth/login` gagal 5x → ke-lock) | `pytest-django` + DRF `APIClient` + `factory_boy` untuk test data |
| **E2E** | Full user flow lewat browser: Register → Login → Upload PDF → Tunggu processing → Chat dengan AI → Logout | Playwright |

**Test case auth yang wajib ada:**

- Register dengan email yang sudah dipakai → gagal (409).
- Login dengan password salah → gagal, counter rate limit bertambah.
- Access token expired → request ditolak 401.
- Refresh token yang sudah dipakai (rotated) dipakai lagi → semua sesi user direvoke.
- User A tidak bisa akses/menghapus dokumen milik User B (403/404).

**Konfigurasi test Celery:** gunakan `task_always_eager=True` di settings test, sehingga task Celery dieksekusi secara synchronous saat testing tanpa perlu brok## 21. Roadmap Implementasi & GitHub Sync (Sprint by Sprint)

> **Single Source of Truth:** Roadmap ini disinkronkan secara presisi dengan GitHub Milestones, Issues, dan Merged Pull Requests di repository [`yan-ulc/ThinkIT-V2`](https://github.com/yan-ulc/ThinkIT-V2).

---

### 🟢 Completed Sprints & Selesai (Sprints 1 – 6)

#### 📌 Sprint 1 — Database Architecture & Models
* **Milestone:** [Milestone 1: Project Setup & Database Architecture](https://github.com/yan-ulc/ThinkIT-V2/milestone/1) *(Closed)*
* **Issue:** [Issue #9 - [Sprint 1] Setup Database Architecture and Initial Migrations](https://github.com/yan-ulc/ThinkIT-V2/issues/9) *(Closed)*
* **Pull Request:** [PR #1 - feat: complete Sprint 1 - database models and migrations](https://github.com/yan-ulc/ThinkIT-V2/pull/1) *(Merged)*
- [x] Custom User Model (`apps/accounts/models.py`) dengan `AUTH_USER_MODEL`
- [x] Extension `pgvector` di PostgreSQL & `VectorField` integration
- [x] Model `RefreshToken`, `Document`, dan `DocumentChunk`
- [x] HnswIndex (`vector_cosine_ops`) untuk embedding search cepat
- [x] Migration awal & database schema setup

#### 📌 Sprint 2 — Custom Authentication System dari Nol
* **Milestone:** [Milestone 2: Custom Authentication & User Management](https://github.com/yan-ulc/ThinkIT-V2/milestone/2) *(Closed)*
* **Issue:** [Issue #10 - [Sprint 2] Implement Custom JWT Authentication System](https://github.com/yan-ulc/ThinkIT-V2/issues/10) *(Closed)*
* **Pull Request:** [PR #2 - feat: complete Sprint 2 - custom authentication system](https://github.com/yan-ulc/ThinkIT-V2/pull/2) *(Merged)*
- [x] Hashing password Argon2id (`argon2-cffi`)
- [x] JWT token verification & generation manual (`PyJWT`)
- [x] Endpoint `POST /auth/register` & `POST /auth/login` (+ Redis rate limiting)
- [x] Refresh token rotation, revocation, dan reuse detection
- [x] Custom DRF `JWTAuthentication` class dengan `WWW-Authenticate: Bearer` challenge header

#### 📌 Sprint 3 — Document Upload API & Celery Task
* **Milestone:** [Milestone 3: Document Upload & Asynchronous Processing](https://github.com/yan-ulc/ThinkIT-V2/milestone/3) *(Closed)*
* **Issue:** [Issue #11 - [Sprint 3] Build PDF Document Upload API and Celery Background Tasks](https://github.com/yan-ulc/ThinkIT-V2/issues/11) *(Closed)*
* **Pull Request:** [PR #3 - feat: complete Sprint 3 - Document Upload and Celery Task](https://github.com/yan-ulc/ThinkIT-V2/pull/3) *(Merged)*
- [x] Endpoint upload PDF `POST /api/v1/documents/upload/`
- [x] MinIO / Object storage integration untuk file PDF
- [x] Celery background task `process_document_task` untuk PDF parsing & text chunking
- [x] Document lifecycle tracking (`QUEUED` → `PROCESSING` → `READY` / `FAILED`)

#### 📌 Sprint 4 — RAG Pipeline & Chat Session API
* **Milestone:** [Milestone 4: RAG Pipeline & Conversational AI API](https://github.com/yan-ulc/ThinkIT-V2/milestone/4) *(Closed)*
* **Issues:** [Issue #12](https://github.com/yan-ulc/ThinkIT-V2/issues/12) & [Issue #13](https://github.com/yan-ulc/ThinkIT-V2/issues/13) *(Closed)*
* **Pull Requests:** [PR #4](https://github.com/yan-ulc/ThinkIT-V2/pull/4) & [PR #5](https://github.com/yan-ulc/ThinkIT-V2/pull/5) *(Merged)*
- [x] Embeddings AI provider integration (`GoogleGenerativeAIEmbeddings`)
- [x] LangChain `ChatGroq` (`groq/compound` model) RAG integration
- [x] Scoped vector similarity search per user (`DocumentChunk.objects.filter(user=user)`)
- [x] Persistent chat session & message models (`ChatSession`, `ChatMessage`)
- [x] Citation & page reference tracking per AI answer

#### 📌 Sprint 5 (Part 1) — User Profile & Midtrans Payment Gateway
* **Milestone:** [Milestone 5: Frontend Dashboard & Payment Gateway Integration](https://github.com/yan-ulc/ThinkIT-V2/milestone/5)
* **Issue:** [Issue #15 - [Sprint 5] Integrate User Profile Page and Midtrans Payment Gateway](https://github.com/yan-ulc/ThinkIT-V2/issues/15) *(Closed)*
- [x] Frontend Next.js User Profile page (`/profile`)
- [x] Midtrans payment gateway sandbox integration placeholder
- [x] Real-time Server-Sent Events (SSE) document status streaming

#### 📌 Sprint 6 — CI/CD Pipeline, Dockerization & Test Suite
* **Milestone:** [Milestone 6: CI/CD Pipeline & Infrastructure Stabilization](https://github.com/yan-ulc/ThinkIT-V2/milestone/6) *(Closed)*
* **Issues:** [Issue #14](https://github.com/yan-ulc/ThinkIT-V2/issues/14) & [Issue #16](https://github.com/yan-ulc/ThinkIT-V2/issues/16) *(Closed)*
* **Pull Requests:** [PR #6](https://github.com/yan-ulc/ThinkIT-V2/pull/6) & [PR #8](https://github.com/yan-ulc/ThinkIT-V2/pull/8) *(Merged)*
- [x] Multi-container Docker Compose setup (Django API, Postgres/pgvector, Redis, MinIO, Celery)
- [x] GitHub Actions automated workflow (`deploy.yml`) untuk backend & frontend
- [x] Pytest test suite lengkap (unit & integration tests)
- [x] Zero TypeScript `any` types & ESLint strict rules verification

---

### 🚀 Upcoming Sprints & Future Roadmap (Sprints 5 Upgrade – 9)

#### 🔄 Sprint 5 (Part 2) — Dashboard UI/UX Upgrade & Analytics
* **Milestone:** [Milestone 5: Frontend Dashboard & Payment Gateway Integration](https://github.com/yan-ulc/ThinkIT-V2/milestone/5)
* **Issue:** [Issue #17 - [Sprint 5] Upgrade Dashboard UI](https://github.com/yan-ulc/ThinkIT-V2/issues/17) *(Open)*
- [ ] Upgrade layout struktur utama dashboard
- [ ] Modernization document list view & quick action popovers

* **Issue:** [Issue #25 - [Sprint 5] Implement Document Analytics Feature](https://github.com/yan-ulc/ThinkIT-V2/issues/25) *(Closed)*
- [x] Build summary cards (Total Docs, Storage Used, AI Usage)
- [x] Tampilkan usage metrics di bagian atas dashboard

* **Issue:** [Issue #26 - [Sprint 5] Implement Document Status Filter Feature](https://github.com/yan-ulc/ThinkIT-V2/issues/26) *(Open)*
- [ ] Filter status dokumen interaktif (All, Ready, Processing, Failed)
- [ ] Dynamic empty states per status filter

* **Issue:** [Issue #28 - [Sprint 5] Implement Real-Time Document Search Feature](https://github.com/yan-ulc/ThinkIT-V2/issues/28) *(Closed)*
- [x] Pencarian dokumen real-time berdasarkan judul berkas
- [x] Input pencarian debounced dan feedback hasil pencarian

#### 🎯 Sprint 7 — In-App PDF Document Viewer & Interactive Preview
* **Milestone:** [Milestone 7: In-App PDF Document Viewer & Interactive Preview](https://github.com/yan-ulc/ThinkIT-V2/milestone/7)
* **Issue:** [Issue #18 - [Sprint 7] Implement In-App PDF Document Viewer](https://github.com/yan-ulc/ThinkIT-V2/issues/18) *(Open)*
- [ ] Embed interactive PDF renderer (`react-pdf` / PDF.js) di frontend Next.js
- [ ] Layout side-by-side antara viewer PDF dan chat room AI (`/chat/[id]`) dengan resizable splitter
- [ ] Kontrol navigasi halaman (next/prev, jump to page) dan zoom (in/out/fit width)
- [ ] Endpoint secure presigned URL / file download untuk dokumen PDF

* **Issue:** [Issue #31 - [Sprint 7] Implement Interactive PDF Preview and Citation Highlighting](https://github.com/yan-ulc/ThinkIT-V2/issues/31) *(Open)*
- [ ] Navigasi interaktif langsung ke halaman terkait saat user mengklik citation badge di chat AI
- [ ] Highlighting halaman & kutipan chunk teks dokumen secara visual pada canvas PDF
- [ ] Interactive preview tooltip / drawer untuk melihat ringkasan chunk dan skor relevansi

#### 🎯 Sprint 8 — AI Question & Quiz Generator
* **Milestone:** [Milestone 8: AI Question & Quiz Generator](https://github.com/yan-ulc/ThinkIT-V2/milestone/8)
* **Issue:** [Issue #19 - [Sprint 8] Implement AI Question and Quiz Generator Feature](https://github.com/yan-ulc/ThinkIT-V2/issues/19) *(Open)*
- [ ] Endpoint API backend untuk automatic quiz & question generation dari isi dokumen
- [ ] Komponen UI interaktif untuk latihan soal & flashcard belajar
- [ ] Fitur simpan & ekspor bank soal hasil buatan AI

#### 🎯 Sprint 9 — Full UI Polish, Design System Consistency & Theme System
* **Milestone:** [Milestone 9: UI Polish & Design System Consistency](https://github.com/yan-ulc/ThinkIT-V2/milestone/9)
* **Issue:** [Issue #20 - [Sprint 9] Full UI Polish, Design System Consistency, and Theme System](https://github.com/yan-ulc/ThinkIT-V2/issues/20) *(Open)*
- [ ] Terapkan konsistensi theme system (vibrant glassmorphic dark mode + custom palette)
- [ ] Framer Motion micro-animations untuk seluruh interaksi & transisi halaman
- [ ] Responsiveness audit 100% di perangkat Mobile, Tablet, dan Desktop
- [ ] Final production readiness checklist & release audit

---

## 22. Definition of Done

Sebuah sprint dianggap **selesai** kalau:

1. Semua checklist item tercentang.
2. Fitur bisa didemo end-to-end (bukan cuma "kode ada tapi belum dicoba").
3. Tidak ada `print()` debug tertinggal, sudah pakai structured logger, dan tidak ada data sensitif (password/token) yang ter-log.
4. Ada minimal 1 test (unit atau integration) untuk logic baru yang signifikan.
5. Migration Django sudah dibuat & di-commit (`makemigrations` dijalankan, bukan mengandalkan auto-generate di server lain).
6. Sudah di-commit dengan message yang jelas dan (idealnya) sudah lewat CI.

---

## 23. Keputusan Terbuka / Open Decisions

**Sudah dikunci (per 29 Agustus 2026):**

| Keputusan | Pilihan Final |
|---|---|
| Python version | **3.12** |
| Django version | **5.1** (LTS-track terbaru saat ini) |
| Dependency manager | **`uv`** |
| Verifikasi email | **Opsional/skip di MVP** — ditambah belakangan kalau dibutuhkan |
| Celery result backend | **Redis** (cukup sederhana untuk scope project ini) |

**Masih terbuka:**
- Access token blacklist
- Sync vs Async
- Chunking strategy detail
- Model embedding & dimensinya
- Realtime progress
- Managed Postgres untuk staging/production
