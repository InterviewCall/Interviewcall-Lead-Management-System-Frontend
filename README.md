# InterviewCall CRM — web app

Next.js 16 (App Router) front end for the in-house CRM. Talks to the NestJS API with axios and TanStack Query.

## Run it

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, default http://localhost:3000/api/v1
npm run dev                  # http://localhost:3002
```

The API must allow this origin: set `CRM_WEB_ORIGIN=http://localhost:3002` there (that is its default).
Sign-in uses HttpOnly cookies plus a CSRF header, so the browser and API must be reachable from each other
with credentials; do not point the app at the API from another origin without updating CORS.

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## What is connected to the real API

| Screen | Status |
| --- | --- |
| Login, change password, sign out, session refresh | Live (`/auth/*`) |
| Team and roles | Live (`/staff*`) |
| My day, Leads, Lead detail, Log call | Sample data |
| Pipeline, Assignment, Imports, Intake monitor, Reports | Sample data |

Sample-data screens read from `src/mock/*` through `src/features/*/api.ts`. Each function returns a Promise,
so connecting an endpoint means replacing the function body with an `api.get/post(...)` call from
`src/lib/api/client.ts`; the screens do not change. See `src/mock/README.md`.

Imports parses and checks the CSV in the browser for real (mapping, dry run, error download); only the final
write goes to sample data.

## Layout

- `src/lib/api` axios client (CSRF header, single-flight silent refresh, normalised `ApiError`)
- `src/features/<name>` screen, hooks and API functions per area
- `src/components/ui` design-system pieces; `src/components/shell` sidebar, top bar, phone tab bar
- `src/app/globals.css` design tokens from the Figma file
