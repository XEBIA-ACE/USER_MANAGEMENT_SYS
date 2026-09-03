# Quality Principles & Architecture Guardrails

## Coding Standards

### TypeScript / Backend (BACKEND/)
- Strict TypeScript (`strict: true`, `esModuleInterop: true`) — no `any` unless absolutely justified with a comment.
- All new source files must include a JSDoc header block describing purpose, design rules, and relevant requirement references (e.g., `US-001`).
- Follow the existing config-pattern: fail-fast at module load for required env vars using `requireEnvString`; numeric env vars via `parsePositiveInt`.
- Controllers must never throw — catch all domain errors and map to HTTP status codes.
- NEVER log sensitive data (tokens, passwords, session IDs, API keys).
- Error responses must use the `{ errorCode, message }` shape already established in `app.ts`.

### React / Frontend (FRONTEND/)
- Use React functional components with hooks; no class components.
- State management via React context or lightweight local state — do not introduce a new global state library without an ADR.
- Route guards / redirect logic must be implemented as a reusable component (e.g., `ProtectedRoute`) so other future protected pages can reuse it.
- Notification/toast messages must use the existing UI component system (shadcn/ui) — do not introduce an additional notification library.
- All new frontend files must be under `FRONTEND/src/`.

## Architecture Guardrails
- The backend is an Express application wired in `BACKEND/src/app.ts`; new middleware must be registered there, not in `server.ts`.
- Authentication state on the frontend is determined by the presence of a valid session (cookie or token) — the frontend must not persist raw credentials.
- The `/profile` route protection is a **frontend routing concern** (React Router guard). The backend `/api` user-profile endpoint already enforces authentication via session middleware.
- Do not introduce new npm dependencies without justification; prefer libraries already present in `package.json`.

## Non-Functional Requirements
- Redirect must be instantaneous — no loading spinner delay before the redirect fires.
- The notification message must be human-readable and accessible (ARIA-compliant toast or alert).
- Unit tests are mandatory for the `ProtectedRoute` component and any new auth-check utility.
- All changes must pass existing CI (`ci-build.yml`) — `npm run build` and `npm test` must succeed.
- No regressions to existing routes or auth flows.

## Test Standards
- Jest config (`BACKEND/jest.config.ts`) is already set up for unit and integration projects; follow the existing `*.test.ts` naming convention.
- Frontend tests should use React Testing Library patterns consistent with the project.