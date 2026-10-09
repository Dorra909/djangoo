# Implementation checklist

- [ ] Phase 1 — Scaffold Django, implement custom email user and JWT authentication, admin user management and auth tests.
- [x] Phase 2 — Implement courses, nested lessons, publishing, enrollment and lesson completion.
- [x] Phase 3 — Implement quizzes, safe student reads, server-side grading, results and CSV export.
- [x] Phase 4 — Implement progress and role-specific dashboards.
- [x] Phase 5 — Implement complaints, attachment validation and notifications.
- [x] Phase 6 — Implement chatbot sessions, history and provider-agnostic replies.
- [ ] Phase 7 — Seed demo data, connect frontend, run backend and frontend tests, browser verification and final documentation.

## Phase 1 progress

- [x] Create Django project and install requested backend dependencies.
- [x] Configure environment-based settings, SQLite/PostgreSQL, CORS, DRF, pagination and API documentation.
- [x] Implement custom user, role permissions, registration/login/refresh/logout/profile/password endpoints.
- [x] Implement admin user CRUD, role filter and active toggle.
- [x] Add focused pytest coverage and run migrations/tests.
- [x] Commit Phase 1 changes.

## Phase 6 progress

- [x] Persist owner-scoped chat sessions and messages, support history and deletion.
- [x] Add provider-agnostic LLM integration with a clean no-key fallback and scoped throttling.
- [x] Add chatbot API/provider tests, create migration, and verify Django checks.
- [x] Validate OpenAPI schema and commit Phase 6 changes.
