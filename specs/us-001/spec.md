# Spec: US-001 — Redirect Unauthenticated Users to Login

## User Story
> **As an** unauthenticated visitor,
> **When** I attempt to navigate directly to `/profile`,
> **Then** I am immediately redirected to `/login`,
> **And** I see a notification informing me that authentication is required to access the page I requested.

## Background & Motivation
The `/profile` page displays sensitive user account information. Without an authentication gate at the routing layer, any user who knows or guesses the URL can land on the page (even if the API calls subsequently fail). This story closes that gap by adding a declarative route guard on the frontend so unauthenticated users are never shown the profile UI — they are redirected to `/login` with a clear notification explaining why.

## Acceptance Criteria

| # | Given | When | Then |
|---|-------|------|------|
| AC-1 | A user is **not authenticated** (no valid session/token) | They navigate to `/profile` (direct URL, bookmark, or link) | They are **redirected to `/login`** without rendering the profile page |
| AC-2 | AC-1 fires | The redirect completes | A **notification is displayed** on the `/login` page (e.g., toast or inline alert) with a message such as *"You must be logged in to view that page."* |
| AC-3 | A user **is authenticated** (valid session/token present) | They navigate to `/profile` | They see the profile page as normal — **no redirect** |
| AC-4 | An unauthenticated user is redirected to `/login` | They successfully authenticate | Any previously displayed notification is **dismissed** after login |
| AC-5 | The `/profile` route guard fires | The redirect occurs | The originally requested path (`/profile`) is optionally preserved as a `redirect` query param (e.g., `/login?redirect=%2Fprofile`) so post-login navigation can restore it |

## Notification Requirements
- Message must clearly communicate that authentication is required.
- Must use the existing shadcn/ui toast or alert component — no new notification library.
- Must meet WCAG 2.1 AA accessibility requirements (role, aria-live, or equivalent).
- Must auto-dismiss or allow manual dismissal.

## Out of Scope
- Backend changes to the `/api/v1/users/profile` endpoint (it already enforces session auth).
- Changes to the login page UI other than rendering the notification triggered by the redirect.
- Remember-me / persistent session logic.
- Redirecting other unauthenticated routes (only `/profile` is in scope for this story).
- Mobile app or non-browser clients.

## Cross-Service / Cross-Component Dependencies
| Dependency | Nature |
|------------|--------|
| Frontend auth state (session/token context) | Read-only — the guard reads existing auth state; it does not modify it |
| React Router (already in use) | Route guard wraps the `/profile` route definition |
| shadcn/ui Toast or Alert component | Used for the notification; must already exist in the component library |
| `/login` page component | Receives and renders the notification triggered by the redirect query param or route state |