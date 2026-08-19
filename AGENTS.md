# AGENTS.md — User Management Service

> **Purpose:** Scaffold and implementation guide for the User Management Service. This document is the single source of truth for any AI agent working on this codebase. Follow every section precisely and in order.

---

## 1. Stack

| Technology | Role |
|---|---|
| **Node.js 20 LTS** | Runtime environment |
| **Express.js 4.x** | HTTP framework and routing |
| **PostgreSQL 16** | Primary relational data store |
| **node-postgres (`pg`)** | PostgreSQL client and connection pooling |
| **JWT (`jsonwebtoken`)** | Access and refresh token issuance and verification |
| **bcrypt** | Password hashing |
| **nodemailer** | OTP email delivery |
| **Zod** | Request schema validation |
| **dotenv** | Environment variable loading |
| **Winston** | Structured logging |
| **Jest** | Unit and integration test runner |
| **Supertest** | HTTP integration testing against Express app |
| **ESLint + Prettier** | Code style enforcement |
| **Docker + docker-compose** | Local environment containerisation |
| **GitHub Actions** | CI pipeline |

---

## 2. Project Structure

Create the following layout exactly. Do not deviate from this structure.

```
user-management-service/
├── src/
│   ├── config/
│   │   ├── db.js                  # pg Pool initialisation and export
│   │   ├── env.js                 # Validated env vars via Zod (fail fast on missing vars)
│   │   └── logger.js              # Winston logger singleton
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js # Express route handlers for auth endpoints
│   │   │   ├── auth.service.js    # Business logic: login, token issuance, refresh
│   │   │   ├── auth.routes.js     # Express Router for /auth/* routes
│   │   │   └── auth.test.js       # Unit + integration tests for auth module
│   │   ├── users/
│   │   │   ├── users.controller.js # Route handlers for user CRUD/account endpoints
│   │   │   ├── users.service.js    # Business logic: registration, verification, deletion
│   │   │   ├── users.repository.js # All raw SQL queries; no business logic here
│   │   │   ├── users.routes.js     # Express Router for /users/* routes
│   │   │   └── users.test.js       # Unit + integration tests for users module
│   │   └── otp/
│   │       ├── otp.service.js      # OTP generation, storage, expiry, and validation
│   │       ├── otp.mailer.js       # Nodemailer transport and email templates
│   │       └── otp.test.js         # Unit tests for OTP logic
│   ├── middlewares/
│   │   ├── authenticate.js        # JWT verification middleware; attaches req.user
│   │   ├── validate.js            # Zod schema validation middleware factory
│   │   └── errorHandler.js        # Centralised Express error handler (last middleware)
│   ├── utils/
│   │   ├── AppError.js            # Custom error class with statusCode and isOperational
│   │   ├── asyncWrapper.js        # Wraps async route handlers to forward errors
│   │   └── tokenHelpers.js        # signAccessToken, signRefreshToken, verifyToken
│   ├── db/
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_otps.sql
│   │       └── 003_create_refresh_tokens.sql
│   └── app.js                     # Express app factory (no listen call); mounts all routers
├── tests/
│   └── helpers/
│       ├── dbSetup.js             # Test DB pool, truncate helpers, seed functions
│       └── requestAgent.js        # Supertest agent wrapping the Express app
├── .env.example                   # All required env vars with placeholder values
├── .eslintrc.js                   # ESLint config (eslint:recommended + prettier)
├── .prettierrc                    # Prettier formatting rules
├── jest.config.js                 # Jest config: coverage thresholds, test environment
├── Dockerfile                     # Production multi-stage Docker image
├── docker-compose.yml             # Local dev: app + postgres services
├── docker-compose.test.yml        # CI test environment with isolated test DB
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI pipeline definition
├── tasks.md                       # AGENT-GENERATED: task checklist (see §3)
├── package.json
└── README.md
```

---

## 3. Required Workflow

The agent **must** follow these steps in order. Do not skip or reorder steps.

### Step 1 — Read Specifications
- Read all story-level spec documents provided in the repository or task description before writing any code.
- Identify all functional requirements, edge cases, and acceptance criteria.
- If any requirement is ambiguous, insert a `<!-- QUESTION: ... -->` comment in `tasks.md` and proceed with the most conservative interpretation.

### Step 2 — Create `tasks.md`
- Create `tasks.md` at the project root before writing any implementation code.
- Structure it as a Markdown checklist grouped by module (`auth`, `users`, `otp`, `middlewares`, `db`).
- Each task must map to a single function, route, or migration.
- Example format:

```markdown
## tasks.md

### Database
- [ ] Write migration 001_create_users.sql
- [ ] Write migration 002_create_otps.sql
- [ ] Write migration 003_create_refresh_tokens.sql

### Users Module
- [ ] Implement users.repository.js — createUser, findByEmail, deleteUser
- [ ] Implement users.service.js — register, verifyEmail, deleteAccount
- [ ] Implement users.controller.js — POST /users/register, POST /users/verify, DELETE /users/me
- [ ] Write users.test.js

### Auth Module
- [ ] Implement auth.service.js — login, refreshToken, logout
- [ ] Implement auth.controller.js — POST /auth/login, POST /auth/refresh, POST /auth/logout
- [ ] Write auth.test.js

### OTP Module
- [ ] Implement otp.service.js — generateOtp, storeOtp, validateOtp, expireOtp
- [ ] Implement otp.mailer.js — sendVerificationEmail
- [ ] Write otp.test.js

### Middleware
- [ ] Implement authenticate.js
- [ ] Implement validate.js
- [ ] Implement errorHandler.js
```

### Step 3 — Implement
- Implement tasks in this order: **migrations → config → repository → service → controller → routes → middleware → app.js**.
- Check off each task in `tasks.md` as it is completed (`- [x]`).
- Never write a controller that contains SQL. Never write business logic in a repository.
- Every async route handler must be wrapped with `asyncWrapper`.

### Step 4 — Test
- Write tests alongside each module (co-located `*.test.js`).
- Run the full test suite with coverage: `npm test`.
- Do not proceed to Step 5 until all tests pass and coverage thresholds are met.

### Step 5 — Validate
- Run `npm run lint` — zero lint errors permitted.
- Run `docker-compose -f docker-compose.test.yml up --abort-on-container-exit` — all tests must pass inside the container.
- Confirm `tasks.md` has every item checked off.
- Confirm `.env.example` documents every variable used in `src/config/env.js`.

---

## 4. Coding Conventions

### General
- Use **CommonJS** (`require`/`module.exports`) consistently throughout. Do not mix ESM.
- Use `async/await` exclusively. Never use raw Promise chains or callbacks.
- Never use `any`-equivalent patterns. Validate all external input at the boundary with Zod.
- No `console.log` in production code. Use the Winston logger from `src/config/logger.js`.

### Naming
| Construct | Convention | Example |
|---|---|---|
| Files | `camelCase` | `users.service.js` |
| Functions | `camelCase` | `findByEmail()` |
| Classes | `PascalCase` | `AppError` |
| DB tables | `snake_case` | `refresh_tokens` |
| DB columns | `snake_case` | `created_at` |
| Env vars | `UPPER_SNAKE_CASE` | `JWT_ACCESS_SECRET` |
| Routes | `kebab-case` | `/auth/verify-email` |

### Architecture Patterns
- **Controller:** Extract and validate input, call service, return HTTP response. No SQL, no business rules.
- **Service:** Orchestrate business logic, call repository methods, throw `AppError` on domain failures.
- **Repository:** Parameterised SQL queries only. Accept and return plain objects. No `req`/`res` references.
- **Middleware:** Single responsibility. Compose via `app.use()` in `app.js`.

### Error Handling
- Throw `new AppError('message', statusCode)` for all expected operational errors.
- The `errorHandler` middleware distinguishes `isOperational` errors (send structured JSON) from unexpected errors (log full stack, return `500`).
- Never expose stack traces or internal error messages to API consumers.

### Security
- Hash passwords with `bcrypt` at a minimum cost factor of **12**.
- OTPs must be 6-digit numeric codes, stored as bcrypt hashes, and expire after **15 minutes**.
- Access tokens expire in **15 minutes**; refresh tokens expire in **7 days**.
- Refresh tokens must be stored in the database and invalidated on logout or account deletion.
- All routes that mutate user data require the `authenticate` middleware.
- Sanitise all user-supplied strings before interpolation into log messages.

### SQL
- Use parameterised queries exclusively (`$1, $2, ...`). **No string interpolation in SQL.**
- Wrap multi-step operations (register + OTP insert) in a `pg` transaction.
- Define all schema in numbered migration files under `src/db/migrations/`. Do not use an ORM.

---

## 5. Testing

### Framework
- **Jest** for all tests (unit and integration).
- **Supertest** for HTTP-level integration tests via `tests/helpers/requestAgent.js`.

### Configuration — `jest.config.js`
```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/config/logger.js'],
  coverageThresholds: {
    global: {
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
  setupFilesAfterFramework: ['./tests/helpers/dbSetup.js'],
};
```

### Required Test Scripts — `package.json`
```json
"scripts": {
  "test": "jest --coverage --runInBand",
  "test:watch": "jest --watch"
}
```

### Test Rules
- **Unit tests:** Mock the repository layer when testing services. Mock the service layer when testing controllers. Use `jest.mock()`.
- **Integration tests:** Use a real PostgreSQL test database (configured via `DATABASE_URL_TEST`). Never mock the database in integration tests.
- Each test file must include tests for: happy path, validation failure, not-found case, and any auth/permission boundary.
- Use `beforeEach` to truncate affected tables (via `tests/helpers/dbSetup.js`) to ensure test isolation.
- Test file naming: co-located with the module, e.g., `src/modules/users/users.test.js`.

### Coverage Requirement
> **90% minimum** on lines, functions, branches, and statements. The CI pipeline will fail if thresholds are not met. This is non-negotiable.

---

## 6. Docker & CI

### `Dockerfile` (Multi-Stage Production Build)
```dockerfile
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Stage 2: production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
```

> Note: `src/server.js` is the entry point that calls `app.listen()`. It imports the Express app from `src/app.js`. Keep them separate to allow Supertest to import `app.js` without binding a port.

### `docker-compose.yml` (Local Development)
```yaml
version: '3.9'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### `docker-compose.test.yml` (CI / Isolated Test DB)
```yaml
version: '3.9'
services:
  test:
    build: .
    command: npm test
    env_file: .env.test
    depends_on:
      postgres_test:
        condition: service_healthy
  postgres_test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: user_mgmt_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### `.github/workflows/ci.yml`
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Run tests with coverage (Docker)
        run: docker-compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from test

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

---

## 7. Constraints

The agent must **never** violate the following rules. These are hard stops.

1. **No ORM.** Do not install or use Sequelize, Prisma, TypeORM, or any query builder. Raw `pg` only.
2. **No SQL string interpolation.** All queries must use parameterised placeholders (`$1`, `$2`). Any SQL built with template literals or string concatenation is a critical defect.
3. **No plaintext secrets.** Passwords and OTPs must never be stored in plaintext. bcrypt hashes only.
4. **No business logic in controllers or repositories.** Enforce the three-layer boundary strictly.
5. **No `process.exit()` in application code.** Only in `src/server.js` for unhandled rejection/SIGTERM handlers.
6. **No skipping tests.** Do not use `test.skip`, `it.skip`, or `xit` to pass coverage. Fix the code or the test.
7