# E-Learning Platform Backend and API Integration Plan

**Status:** Awaiting approval. This document is the Step 1 analysis only; no backend or frontend implementation has begun.

## 1. Scope and audit basis

The plan is based on the current `src/api`, `src/types`, `src/mocks`, `src/routes`, auth context, shared layout, role pages, forms, and `package.json`. Existing page components and visual design are to be retained. The backend will be the source of truth; mock fixtures and simulated delays will be removed from runtime API paths.

## 2. Existing roles and screens

### Public/shared

| Screen | Route | Current purpose |
|---|---|---|
| Landing page | `/` | Public entry |
| Login | `/login` | Email/password login; includes demo-account buttons |
| Registration | `/register` | Create an `ENSEIGNANT` or `ETUDIANT` account |
| Forbidden | `/403` | Role-guard rejection |

### ADMIN

| Screen | Route | Current purpose / data |
|---|---|---|
| Admin dashboard | `/admin/dashboard` | Platform statistics, monthly registrations, role distribution, recent complaints |
| User management | `/admin/users` | Teacher/student tabs; list, search, create, edit, activate/deactivate, delete |
| Complaint management | `/admin/complaints` | Filter by status, inspect complaint, update status and admin reply |

### ENSEIGNANT

| Screen | Route | Current purpose / data |
|---|---|---|
| Teacher dashboard | `/teacher/dashboard` | Own courses/quizzes, enrollment counts, attempts and average score |
| Courses | `/teacher/courses` | Own course list, search, create, edit, delete |
| Course form | Modal on `/teacher/courses` | Course details and ordered nested lessons |
| Quizzes | `/teacher/quizzes` | Own quiz list, create, edit, delete, open results |
| Quiz form | Modal on `/teacher/quizzes` | Quiz metadata and nested question/choice editing |
| Quiz results | Modal on `/teacher/quizzes` | Attempts, score distribution, average, pass rate, CSV export |
| Chatbot | `/teacher/chatbot` | Assistant conversation |
| Complaints | `/teacher/complaints` | Own complaint list and create form |
| Profile | `/profile` | Edit name/email/bio; password tab; avatar control |

### ETUDIANT

| Screen | Route | Current purpose / data |
|---|---|---|
| Student dashboard | `/student/dashboard` | Course progress, quiz results, score history, available content |
| Course catalog | `/student/courses` | Search, level/category filters, all/my-course tabs |
| Course detail | `/student/courses/:id` | Course and lesson list, completion action, progress |
| Quizzes | `/student/quizzes` | Available quizzes, own attempts, quiz player, result modal |
| Progress | `/student/progress` | Course progress and quiz-attempt history |
| Chatbot | `/student/chatbot` | Assistant conversation |
| Complaints | `/student/complaints` | Same screen/component as teacher complaints, scoped to current user |
| Profile | `/student/profile` | Alias of shared profile page |

### Other visible shared surfaces

The application shell has a floating chatbot for teachers and students. The top navbar has a notification bell, but it currently has no notification behavior. These are included in API integration without changing the visual design.

## 3. Frontend data contracts mapped to Django

Python model field names will use Django conventions; serializers will expose the camelCase JSON keys expected by the existing TypeScript contracts. Relations will remain numeric IDs unless the response contract explicitly includes a related display name. List endpoints will use page-number pagination (`count`, `next`, `previous`, `results`); API wrappers will unwrap `results` where existing components currently expect arrays.

| Frontend type | Django model / source | Fields exposed to frontend and mapping notes |
|---|---|---|
| `Role` | `accounts.User.role` | Exact enum values `ADMIN`, `ENSEIGNANT`, `ETUDIANT`. |
| `User` | `accounts.User` | `id`, `email`, `fullName` ← `full_name`, `role`, `avatar`, `bio`, `isActive` ← `is_active`, `createdAt` ← `date_joined`; optional `notificationPreferences` ← `notification_preferences` (JSON, with `email` and `push`). Never return password/hash. |
| `AuthTokens`, `AuthState` | SimpleJWT response + frontend context | Tokens remain `access` and `refresh`. Login wire response is `{access, refresh, user}`; `authApi` adapts it to the current context shape `{user, tokens:{access,refresh}}`. |
| `Lesson` | `courses.Lesson` | `id`, `title`, `content`, `videoUrl` ← `video_url`, `pdfUrl` ← `pdf_url`, `order`, optional `duration`. Lessons are returned ordered by `order`. |
| `Course` | `courses.Course` + `Lesson` + teacher relation / annotations | `id`, `title`, `description`, `category`, French `level` values (`Débutant`, `Intermédiaire`, `Avancé`), `thumbnail`, `teacherId` ← `teacher`, `teacherName` ← teacher `full_name`, nested `lessons`, `enrolledCount` ← enrollment count, `rating`, `reviewCount`, `createdAt`, `isPublished` ← `is_published`. Rating/review count have no present review workflow; keep as read-only metadata with zero/default values until a review feature is specified. |
| `Question` | `quizzes.Question` + `Choice` | `id`, `text`, `type` (`multiple_choice` / `true_false`), `options` from ordered choice texts, optional `explanation`. `correctAnswer` is the zero-based correct option index in teacher/write and post-submission review representations only. It is omitted from every student quiz/read response before submission. |
| `Quiz` | `quizzes.Quiz` + nested questions | `id`, `title`, `courseId` ← `course`, `courseName` from course title, `teacherId` ← `teacher`, `duration`, `passingScore` ← `passing_score`, nested `questions`, `attemptCount`, `createdAt`. Student read serializers omit correct-answer data. |
| `QuizAttempt` | `quizzes.QuizAttempt` + `AttemptAnswer` | `id`, `quizId`, `quizTitle`, `studentId`, `studentName`, server-computed `score`, `passed`, ordered `answers` as zero-based selected-choice indices, `completedAt`, `timeTaken`. After submission only, return per-question review with selected/correct indices, correctness, and explanation. |
| `Complaint` | `complaints.Complaint` | `id`, `authorId` ← `author`, `authorName`, `authorRole`, `subject`, `category`, `message`, optional `attachment`, `status`, optional `adminReply` ← `admin_reply`, `createdAt`, `updatedAt`. Map DB `OPEN`/`IN_PROGRESS`/`RESOLVED` to the exact current UI strings `Open`/`In progress`/`Resolved`, and accept/map those UI strings in updates. Author identity is derived from authentication, not trusted from request data. |
| `Progress` | `progress.LessonProgress` grouped by enrollment/course | `courseId`, `courseTitle`, `completedLessons`, `totalLessons`, `percentage`, `lastAccessed`. Return a row for every enrolled course, including zero progress, so the existing “Mes cours” tab can work. |
| `ChatMessage` | `chatbot.ChatMessage` | `id` serialized as a string, `role` (`user` / `assistant`), `content`, `timestamp`. |
| `Notification` | `core.Notification` | `id`, `title`, `message`, `read`, `createdAt`; owner is the authenticated user. |
| `DashboardStats` | Computed by `dashboard` views | Exact keys: `totalUsers`, `totalTeachers`, `totalStudents`, `totalCourses`, `totalQuizzes`, `openComplaints`, `newUsersPerMonth[{month,count}]`, `usersByRole[{name,value}]`. Admin dashboard also needs recent complaints, returned beside these stats. |

### Backend models in requested apps

- `accounts.User` (custom email-login user; role, avatar, bio, active flag, and notification preferences).
- `courses.Course`, `Lesson`, `Enrollment`.
- `quizzes.Quiz`, `Question`, `Choice`, `QuizAttempt`, `AttemptAnswer`.
- `progress.LessonProgress`.
- `complaints.Complaint`.
- `chatbot.ChatSession`, `ChatMessage`.
- `core.Notification`.
- `dashboard` contains computed role-specific dashboard views/aggregations rather than duplicate stored statistics.

## 4. Proposed API endpoint table

Base URL: `VITE_API_URL` (planned default `http://localhost:8000/api`); paths below are relative to `/api`. All routes require authentication except registration and login. Refresh is the token-protocol exception: it requires a valid refresh token because the access token may have expired. Responses shown are the useful data shapes, excluding common pagination envelope where relevant.

### Authentication and profile

| Method | URL | Roles allowed | Request body | Response |
|---|---|---|---|---|
| POST | `/auth/register/` | Public; only `ENSEIGNANT` or `ETUDIANT` accepted | `{fullName,email,password,role}` | `201 {user: User}` |
| POST | `/auth/login/` | Public | `{email,password}` | `{access,refresh,user: User}` |
| POST | `/auth/token/refresh/` | Valid refresh token | `{refresh}` | `{access,refresh}` (rotation enabled) |
| POST | `/auth/logout/` | Any authenticated role | `{refresh}` | `{detail}`; blacklist submitted refresh token |
| GET | `/auth/me/` | Any authenticated role | — | `User` |
| PATCH | `/auth/me/` | Any authenticated role | `{fullName?,email?,bio?,avatar?,notificationPreferences?}` | `User` |
| POST | `/auth/change-password/` | Any authenticated role | `{currentPassword,newPassword}` | `{detail}` |

### Admin users and dashboards

| Method | URL | Roles allowed | Request body / query | Response |
|---|---|---|---|---|
| GET | `/users/?role=ENSEIGNANT` | ADMIN | Optional `role` filter, pagination/search | Paginated `User[]` |
| POST | `/users/` | ADMIN | `{fullName,email,role,password}` | `201 User` |
| GET | `/users/{id}/` | ADMIN | — | `User` |
| PATCH | `/users/{id}/` | ADMIN | Editable `User` fields (`fullName`, `email`, `role`, `bio`) | `User` |
| PATCH | `/users/{id}/active/` | ADMIN | `{isActive:boolean}` | `User` |
| DELETE | `/users/{id}/` | ADMIN | — | `204` |
| GET | `/dashboard/admin/` | ADMIN | — | `{stats: DashboardStats, recentComplaints: Complaint[]}` |
| GET | `/dashboard/teacher/` | ENSEIGNANT | — | Teacher summary with own courses/quizzes and attempts/aggregates only |
| GET | `/dashboard/student/` | ETUDIANT | — | Student summary with own progress/attempts only |

### Courses, lessons, enrollments, progress

| Method | URL | Roles allowed | Request body / query | Response |
|---|---|---|---|---|
| GET | `/courses/` | ADMIN, ENSEIGNANT, ETUDIANT | Student: published catalog; supports `search`, `level`, `category`, pagination. Teacher gets only own courses; admin gets all. | Paginated `Course[]` |
| POST | `/courses/` | ENSEIGNANT | Course fields plus nested `lessons:[{title,content,videoUrl?,pdfUrl?,duration?,order}]`; teacher derived from token | `201 Course` |
| GET | `/courses/{id}/` | ADMIN; owner teacher; enrolled student (published catalog detail permitted per policy) | — | `Course` with ordered lessons |
| PATCH | `/courses/{id}/` | ADMIN or owning ENSEIGNANT | Editable course fields and nested lessons | `Course` |
| DELETE | `/courses/{id}/` | ADMIN or owning ENSEIGNANT | — | `204` |
| PATCH | `/courses/{id}/lessons/reorder/` | Owning ENSEIGNANT or ADMIN | `{lessonIds:[number,...]}` | Updated ordered `Lesson[]` |
| POST | `/courses/{id}/enroll/` | ETUDIANT | Empty body | `201 {courseId,enrolled:true}`; idempotent if already enrolled |
| GET | `/enrollments/mine/` | ETUDIANT | Pagination | Paginated enrollment/course data; permits UI to identify enrolled courses |
| GET | `/progress/mine/` | ETUDIANT | — | `Progress[]` (unwrapped for current callers) |
| POST | `/courses/{courseId}/lessons/{lessonId}/complete/` | ETUDIANT enrolled in course | Empty body | Updated `Progress`; idempotent completion |

Nested course/lesson writes and lesson reordering run atomically. Upload URLs are served as absolute media URLs; video/pdf URL fields remain optional as in the current form/type.

### Quizzes, attempts, and results

| Method | URL | Roles allowed | Request body / query | Response |
|---|---|---|---|---|
| GET | `/quizzes/` | ADMIN, ENSEIGNANT, ETUDIANT | `search`, optional course filter, pagination. Student results contain no correct-choice data. | Paginated safe `Quiz[]` |
| POST | `/quizzes/` | ENSEIGNANT | `{title,courseId,duration,passingScore,questions:[{text,type,options,correctAnswer,explanation?}]}` | `201 Quiz` with teacher/write answer metadata |
| GET | `/quizzes/{id}/` | ADMIN; owner teacher; eligible ETUDIANT | — | Teacher serializer with keys for authoring; student-safe serializer without correct answers |
| PATCH | `/quizzes/{id}/` | ADMIN or owning ENSEIGNANT | Quiz fields and nested question/options payload | Updated `Quiz` |
| DELETE | `/quizzes/{id}/` | ADMIN or owning ENSEIGNANT | — | `204` |
| POST | `/quizzes/{id}/attempts/` | ETUDIANT | Empty body | `201 {attemptId,quiz: safe Quiz}`; records a started attempt |
| POST | `/attempts/{attemptId}/submit/` | Owning ETUDIANT | `{answers:number[],timeTaken:number}`; do not accept score/pass/correctness from client | `QuizAttempt` plus post-submit per-question correctness/correct-answer review |
| GET | `/attempts/mine/` | ETUDIANT | Optional quiz filter, pagination | Paginated own `QuizAttempt[]` |
| GET | `/quizzes/{id}/attempts/` | Owning ENSEIGNANT or ADMIN | Pagination | Paginated attempts scoped to that quiz and teacher ownership |
| GET | `/quizzes/{id}/results/` | Owning ENSEIGNANT or ADMIN | — | `{attemptCount,averageScore,passRate,distribution:[{range,count}],attempts:[...]}` |
| GET | `/quizzes/{id}/results.csv` | Owning ENSEIGNANT or ADMIN | — | CSV attachment |

Question-choice validation requires at least one correct choice per question; `TRUE_FALSE` has two fixed choices. Nested quiz writes and grading/submission use database transactions. Students never receive `is_correct` or `correctAnswer` before submit. Student attempt queries are always scoped to the current account; teacher queries are scoped to their own quizzes.

### Complaints, chatbot, notifications

| Method | URL | Roles allowed | Request body / query | Response |
|---|---|---|---|---|
| GET | `/complaints/` | ADMIN, ENSEIGNANT, ETUDIANT | Admin optional status filter; others automatically scoped to author | Paginated `Complaint[]` |
| POST | `/complaints/` | ENSEIGNANT, ETUDIANT | Multipart: `{subject,category,message,attachment?}` | `201 Complaint` |
| GET | `/complaints/{id}/` | ADMIN or complaint author | — | `Complaint` |
| PATCH | `/complaints/{id}/` | ADMIN | `{status,adminReply?}` | Updated `Complaint` |
| POST | `/chat/sessions/` | ENSEIGNANT, ETUDIANT | `{}` | `{id,title,createdAt}` |
| GET | `/chat/sessions/` | ENSEIGNANT, ETUDIANT | — | Own sessions |
| GET | `/chat/sessions/{id}/messages/` | Session owner | — | `ChatMessage[]` |
| POST | `/chat/sessions/{id}/messages/` | Session owner | `{content}` | `{userMessage:ChatMessage,assistantMessage:ChatMessage}` |
| DELETE | `/chat/sessions/{id}/` | Session owner | — | `204` (clear/delete session history) |
| GET | `/notifications/` | Any authenticated role | Pagination; only current user's records | Paginated `Notification[]` |
| PATCH | `/notifications/{id}/read/` | Notification owner | `{read:true}` (or empty body to mark read) | Updated `Notification` |

Chatbot service will be provider-agnostic, read `LLM_API_KEY`, and return a deterministic clean mock response when no key is configured. Login and chatbot endpoints are throttled. Notifications are created by domain signals for relevant events (account/course enrollment, quiz completion, and complaint response/status events); no signal stores duplicate dashboard data.

## 5. Gaps and planned compatibility resolutions

| Finding in current frontend | Resolution in implementation phase |
|---|---|
| All current API modules use local mock data/delays; the Axios client does not perform token refresh and clears auth on any 401. `authApi` and `chatbotApi` also have commented-out real calls. | Replace mock API functions with the shared Axios instance; store/update rotated tokens; retry a failed request once after refresh; clear auth only when refresh fails. Standardize API base URL to `http://localhost:8000/api` unless `VITE_API_URL` overrides it. |
| `AuthContext` only restores cached state and does not check whether it is valid. | During authenticated startup, refresh as needed and fetch `/auth/me/`; keep the existing context-facing `User` and `AuthTokens` shapes. Implement logout against blacklist endpoint. |
| Backend-style snake_case/enums differ from frontend camelCase and UI strings. | Use explicit serializer mapping to retain existing frontend field names, with the complaint status conversion documented above. Do not rename established TypeScript contracts merely to match Django. |
| DRF pagination is an envelope whereas current API wrappers/pages generally expect arrays. | Keep required page-number pagination; normalize list responses in the API service layer to arrays, preserving pagination metadata only where a screen needs it. |
| Student quizzes currently receive `correctAnswer`, and the existing attempt submit sends client-calculated identity fields, answers, and time. The result only shows a score. | Use student-safe quiz serializers; send only selected answers/time to the server; compute score/pass on the server; include correct/incorrect review only in the post-submit response. Make answer choice ordering stable. |
| The catalog has “Mes cours” but no enrollment API/action; lesson completion is being used as a proxy and is callable before enrollment. | Add explicit enrollment endpoint and a minimal enroll/join action in the existing course UI; create zero-progress rows for enrolled courses; require enrollment to mark lessons complete. |
| Teacher course form has no publish control although students should see published courses only. | Add a small publish toggle to the existing form; maintain current unpublished-on-create default unless the user approves another default. |
| Admin user creation submits name/email/role only; no password is collected. Registration does include password. | Add a required password field for admin-created teacher/student accounts (and validation/error display) rather than silently generating credentials that cannot be delivered. |
| Complaint form has no attachment control despite `Complaint.attachment` and the requested upload workflow. | Add an optional file input to the current form and submit multipart data. Validate file type and size on server; show API validation errors. |
| Chat UI currently starts with an in-memory assistant greeting; there is no session id, load history, clear action, or error feedback. | Associate the chat UI with a server session; load/persist messages and expose clear history with minimal controls; retain the existing conversation layout. |
| The navbar bell is decorative and never reads or marks notifications. | Wire the existing bell to the user's notification list and mark-read action without replacing its visual treatment. |
| Admin dashboard uses static stats/recent complaints. Teacher dashboard loads all attempts; student dashboard fetches the full catalog to populate summary cards. | Replace admin mocks with the admin dashboard endpoint; scope teacher attempts server-side; provide role-specific dashboard data and avoid exposing other students' data. |
| Teacher course “Voir” navigates to `/teacher/courses/{id}`, which has no route; StudentCourseDetail is the only course-detail component. | Add a teacher-owned course detail route or change the existing action to a valid teacher route; keep the same components/design and protect ownership. |
| Student profile is only an alias of teacher profile; profile page/password form use artificial delays and the avatar camera button is not wired. | Reuse the same screen; persist profile/password; wire avatar upload if the selected implementation supports a local image upload, otherwise change the control minimally to a URL field consistent with the current course thumbnail pattern. |
| Current `Question` uses numeric option indices and `correctAnswer`; model-based choices have their own IDs and `is_correct`. | Preserve the current index-based UI by mapping stable ordered choices to/from indices in serializers and the API client. Do not accept correctness or scores from clients. |
| Course `rating` and `reviewCount` appear on cards but no review UI/API/model exists. | Include both contract fields as computed/default read-only metadata; do not invent a reviews feature. |

## 6. Implementation sequence after approval

1. Scaffold Django project and requested apps/configuration; custom email User; JWT rotation/blacklist; CORS; auth endpoints/tests.
2. Course, lesson, enrollment models and APIs; nested transactional writes, reorder, publish/search/filter, ownership and upload/static media handling.
3. Quiz/question/choice/attempt models and APIs; safe serializers; server-side grading/review; teacher results/CSV.
4. Progress calculations and admin/teacher/student dashboards.
5. Complaints and notifications; ownership/admin workflow, attachment validation, signals.
6. Chat sessions/messages and provider-agnostic LLM service.
7. Demo seed command, tests, frontend replacement of all mocks, build and browser verification.

The implementation will use Python 3.12, Django 5, DRF, SimpleJWT with rotation/blacklist, django-cors-headers, django-filter, drf-spectacular (`/api/docs/`), django-environ, Pillow, pytest-django, SQLite locally and `DATABASE_URL` for PostgreSQL. It will include `requirements.txt`, `.env.example`, `.gitignore`, and a backend README. List/detail/write serializers, ownership permissions, page-number pagination of 10, consistent `{"detail": "...", "errors": {...}}` validation responses, optimized related-object loading, and `transaction.atomic` around nested writes and submissions are part of the plan.

The requested `seed_demo` command will create the three named demo accounts using `demo1234`, five courses (4–6 lessons each), four quizzes with questions, enrollments, attempts, complaints, and notifications.

## 7. Approval boundary

No implementation or commits have been made for this task. The next action is to start Phase 1 only after approval of this plan. The existing worktree already has a modified `index.html` and an untracked `package-lock.json`; both will be preserved.
