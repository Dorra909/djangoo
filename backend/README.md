# EduLearn backend

Django REST API for the EduLearn React application. API root: `/api/`; Swagger UI: `/api/docs/`; OpenAPI JSON: `/api/schema/`.

## Run locally

Requirements: Python 3.12 and pip.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 8000
```

Set a private, strong `SECRET_KEY` in `.env` for non-local use. The default database is SQLite. PostgreSQL can be selected with `DATABASE_URL`, for example `postgres://edulearn:password@localhost:5432/edulearn`. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list for additional frontend origins.

Groq is used for quiz generation, short-answer grading, and course chat. Configure `GROQ_API_KEY`, `GROQ_MODEL` (default: `qwen/qwen3.8-27b`), and `GROQ_TIMEOUT` in `.env`; an empty key enables clearly marked mock responses for local development. The RAG pipeline uses `pypdf` for text extraction, local `sentence-transformers` embeddings (`RAG_EMBEDDING_MODEL`), and persistent ChromaDB collections (`RAG_VECTORSTORE_PATH`), one collection per course. The embedding model is downloaded locally the first time it is used; no Groq embedding API is used.

### Using SQL Server with SSMS

The project can use SQL Server with Windows Authentication. Create an empty database named `EduLearnDB` in SSMS, set `DATABASE_ENGINE=sqlserver` in `backend/.env`, and set `DATABASE_NAME=EduLearnDB` plus `DATABASE_HOST=DESKTOP-4V3M1LD\SQLEXPRESS`. The default ODBC Driver 18 setting uses a trusted Windows connection. Install the Python dependencies and ensure Microsoft ODBC Driver 18 for SQL Server is installed, then run `python manage.py migrate` from `backend`; the Django tables will appear under the database's **Tables** node in SSMS. Existing SQLite data is not copied automatically. To switch back to SQLite, clear `DATABASE_ENGINE`.

If SQL Server rejects SimpleJWT migrations `0008_migrate_to_bigautofield` or `0010_fix_migrate_to_bigautofield` because of the unique constraint on `token_id`, use `python manage.py migrate token_blacklist 0010 --fake` and then `python manage.py migrate`. This keeps the existing SQL Server `int` identity columns for token IDs (the related FK and uniqueness constraints remain intact); Django's Python integer handling is compatible, but the IDs retain SQL Server's `int` range rather than `bigint`. Use this workaround only if those migrations fail with the constraint error.

## Demo accounts

`seed_demo` is safe to run repeatedly. It creates five published courses with five lessons each, four quizzes, student enrollments/progress/attempts, complaints, notifications, and a chat session.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@demo.com` | `demo1234` |
| Teacher | `teacher@demo.com` | `demo1234` |
| Student | `student@demo.com` | `demo1234` |

## API contract

All responses use camelCase field names compatible with the frontend types. List endpoints use PageNumberPagination (10 records; `{count,next,previous,results}`). Authentication uses a JWT bearer token. Unless marked Public, endpoints require authentication. The API error envelope is `{ "detail": "...", "errors": { ... } }`.

| Area | Method and URL | Allowed roles | Request / response |
| --- | --- | --- | --- |
| Auth | `POST /api/auth/register/` | Public; `ENSEIGNANT` or `ETUDIANT` only | `{fullName,email,password,role}` → `{user}` |
| Auth | `POST /api/auth/login/` | Public, throttled | `{email,password}` → `{access,refresh,user}` |
| Auth | `POST /api/auth/token/refresh/` | Public | `{refresh}` → rotated token pair |
| Auth | `POST /api/auth/logout/` | Any authenticated user | `{refresh}` → confirmation; blacklists token |
| Auth | `GET/PATCH /api/auth/me/` | Any authenticated user | User object; PATCH accepts `fullName,email,bio,avatar,notificationPreferences` |
| Auth | `POST /api/auth/change-password/` | Any authenticated user | `{currentPassword,newPassword}` |
| Users | `GET/POST /api/users/` | Admin | List/filter/search users; create with `{fullName,email,role,password}` |
| Users | `GET/PATCH/DELETE /api/users/{id}/` | Admin | Read, edit, or delete a teacher/student |
| Users | `PATCH /api/users/{id}/active/` | Admin | `{isActive}` → updated user |
| Dashboard | `GET /api/dashboard/admin/` | Admin | `{stats,recentComplaints}` |
| Dashboard | `GET /api/dashboard/teacher/` | Teacher | `{courses,quizzes,attempts}` scoped to the authenticated teacher |
| Dashboard | `GET /api/dashboard/student/` | Student | `{progress,attempts,courses,quizzes}` scoped to the authenticated student |
| Courses | `GET/POST /api/courses/` | Authenticated; create is teacher-only | List/search/filter; create with course fields and nested `lessons` |
| Courses | `GET/PATCH/DELETE /api/courses/{id}/` | Admin; teacher owner; students can read published courses | Course fields include `teacherId,teacherName,lessons,enrolledCount,isPublished` |
| Courses | `POST /api/courses/{id}/enroll/` | Student | Enroll in a published course |
| Courses | `GET /api/courses/enrollments/mine/` | Student | Current user's enrollments |
| Courses | `POST /api/courses/{courseId}/lessons/{lessonId}/complete/` | Enrolled student | → course progress |
| Quizzes | `GET/POST /api/quizzes/` | Authenticated; create is teacher-only | List/search/filter; teacher writes nested questions/options/correct-answer indexes |
| Quizzes | `GET/PATCH/DELETE /api/quizzes/{id}/` | Admin; teacher owner; enrolled students see safe quiz data | Student responses omit answer keys and explanations |
| Quizzes | `POST /api/quizzes/{id}/attempts/` | Student enrolled in quiz course | Start → `{id,quizId,startedAt,questions}` (no answers) |
| Quizzes | `GET /api/quizzes/{id}/attempts/` | Quiz owner or admin | Paginated attempt results |
| Quizzes | `GET /api/quizzes/attempts/mine/` | Student | Paginated own completed attempts |
| Quizzes | `GET /api/quizzes/attempts/teacher/` | Teacher | Paginated completed attempts for own quizzes |
| Quizzes | `POST /api/attempts/{id}/submit/` | Attempt owner | `{answers:[choice indexes or -1],textAnswers:[{questionId,textAnswer}],timeTaken}` → server-graded result and answer review; legacy `/api/quizzes/attempts/{id}/submit/` is also supported |
| Quizzes | `GET /api/quizzes/{id}/results/` | Quiz owner or admin | Counts, average/pass rate, score distribution, attempts |
| Quizzes | `GET /api/quizzes/{id}/results-csv/` | Quiz owner or admin | Download CSV export |
| Progress | `GET /api/progress/mine/` | Student | Progress rows with course, completion counts, percentage, last activity |
| Complaints | `GET/POST /api/complaints/` | Authenticated; create is teacher/student; list is own except admin | Create multipart fields `subject,category,message,attachment` |
| Complaints | `PATCH /api/complaints/{id}/` | Admin | `{status,adminReply}` |
| Notifications | `GET /api/notifications/` | Any authenticated user | Own notifications |
| Notifications | `PATCH /api/notifications/{id}/read/` | Notification owner | Marks the notification as read |
| Chat | `GET/POST /api/chat/sessions/` | Teacher or student | List own sessions or create a session |
| Chat | `GET/POST /api/chat/sessions/{id}/messages/` | Session owner, teacher/student | Read history or post `{content}`; send is throttled |
| Chat | `DELETE /api/chat/sessions/{id}/` | Session owner, teacher/student | Delete session and its messages |

## Quiz generation, grading, course documents, and RAG chat

All UI labels are in French. The API accepts and returns the existing camelCase quiz fields, plus the fields described below. AI endpoints use the `ai` throttle scope (10 requests/minute by default). A `429` response means the caller should wait before retrying.

| Area | Method and URL | Allowed roles | Request / response |
| --- | --- | --- | --- |
| Course documents | `POST /api/courses/{courseId}/documents/` | Owning teacher | Multipart `{file}` (PDF, max 20 MiB) → document with `PENDING` status (`202`) |
| Course documents | `GET /api/courses/{courseId}/documents/` | Owning teacher | List documents and indexing status |
| Course documents | `GET /api/documents/{id}/status/` | Owning teacher | Poll document status, page count, and any error |
| Course documents | `DELETE /api/documents/{id}/` | Owning teacher | Delete uploaded file, chunks, and vector entries |
| Quiz generation | `POST /api/quizzes/generate/` | Teacher | `{topic?,course_id?,lesson_ids?,document_ids?,num_questions,difficulty,types,language}` → editable, unsaved `draft`; `document_ids` selects RAG mode |
| Quiz review | `GET /api/quizzes/{id}/attempts/pending/` | Owning teacher | Answers awaiting manual review |
| Answer review | `PATCH /api/attempts/{attemptId}/answers/{answerId}/override/` | Owning teacher | `{score,feedback?}` → updated answer and recalculated attempt score |
| RAG chatbot | `POST /api/chatbot/message/` | Teacher or enrolled student | `{session_id?,course_id?,message}` → session, messages, sources, optional `quiz_draft` |
| Chat sessions | `GET /api/chatbot/sessions/` | Teacher or student | List the current user's sessions |
| Chat session | `GET/DELETE /api/chatbot/sessions/{id}/` | Session owner | Read a session with messages, or delete it |

Quiz drafts are never saved or published by generation. Teachers edit a draft and save it through `POST /api/quizzes/`. Question types are multiple choice, true/false, and short answer. `gradingMode` supports `AUTO`, `AI`, and `MANUAL`; objective questions are graded on the server, AI grading is only used for short answers, and failed AI grading is flagged for teacher review. Answer keys and explanations are withheld from students until submission.

PDF indexing runs in a daemon thread, not Celery. This keeps local setup simple, but the indexing job is not durable across a process restart and is not coordinated across multiple application workers. Use a persistent task queue such as Celery with Redis before deploying a multi-worker production service. Text-only PDFs are supported; scanned PDFs are marked `FAILED` with an explanatory message because OCR is not included. Students can query RAG content only for courses in which they are enrolled; PDF contents are treated as reference data, not instructions.

## Class-diagram domain model

The Django domain models expose the diagram's French class/attribute/method names as compatibility aliases while retaining the existing English model fields and API contract. `Utilisateur` maps to the custom `User` model; `Administrateur`, `Etudiant`, and `Enseignant` are role-filtered proxy subclasses, so authentication and existing user records continue to use the same table. `Cours`, `Inscription`, `Reclamation`, `Reponse`, and `Resultat` likewise map to their existing persisted models. Diagram fields missing from the original schema (including course content/duration, enrollment status/final grade/progression, quiz description/deadline/max score/status, complaint priority, and per-course progression) are persisted as Django fields. Existing lesson progress and quiz-attempt data remain available.

## Tests and schema checks

```powershell
python -m pytest
python manage.py check
python manage.py spectacular --validate --fail-on-warn --file NUL
```

## Current scope notes

- Course ratings are read-only fields because the frontend has no review workflow.
- A missing Groq key activates the local mock mode; configure the key privately in `backend/.env` for real AI responses. Never put a real key in `.env.example` or source control.
- The frontend catalog filters the loaded published course list client-side. Attachment uploads accept PDF/JPEG/PNG up to 5 MB; profile images accept JPEG/PNG with the same limit.
