# campus-teacher-web

The **Teacher Web App (TWA)** — the browser-based frontend teachers use to run their day-to-day
classroom workflow, part of the **Campus Digitalization Platform**.

## What it does

This app covers the teacher-facing feature set of the platform (feature IDs `TWA-01`..`TWA-20`
in the architecture doc — see below), including:

- **Auth & section context** — TOTP-based login, auto-selection of the section a teacher is
  currently scheduled to teach, and manual section switching.
- **Dashboard** — performance overview for the active section.
- **Timetable** — a teacher's own weekly timetable (`CalendarGrid`), plus, for teachers holding
  the `create_timetable` permission, the same generation/editing engine Admin uses.
- **Attendance** — per-session attendance marking for the active section.
- **Marks** — numeric internal marks entry/publishing (`MarksPage`), grade-based external marks
  submission for holders of a time-limited `add_external_marks` grant, and external-marks
  approval for HoDs.
- **Assignments & Materials** — multi-type assignment creation (code/quiz/essay/file) and
  material uploads, optionally posted into a Community group.
- **Events** — creating college/section events, optionally scoped to specific years/departments.
- **Community & Messages** — group creation/viewing and a Direct Messaging inbox.
- **Reports & feedback** — reporting on a section/student to Admin, and section feedback.
- **Notes** — teacher note-taking via the Shared Editor Kit.

Assignment creation, document annotation, and notes all embed the shared **Shared Editor Kit**
rather than reimplementing an editor; messaging embeds the shared **Direct Messaging** component.
Neither is built from scratch in this repo — see [Cross-repo dependencies](#cross-repo-dependencies).

## Tech stack

React 19 + Vite + TypeScript, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui (`radix-ui` +
`class-variance-authority`), Framer Motion, TanStack Query for server state, Recharts for charts.
Linting via oxlint, tests via Vitest + Testing Library.

## Getting started

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # oxlint
npm run test      # vitest run
npm run test:watch
```

The dev server proxies `/api` to `http://localhost:8080` (see `vite.config.ts`), so a running
`campus-backend` instance is expected for anything beyond static UI work — see
[Backend & running the full platform](#backend--running-the-full-platform).

## Its place in the Campus Digitalization Platform

`campus-teacher-web` is one of several independent repos that together make up the platform;
each was split out of the original `Omega` monorepo (see [History](#history)) and is versioned
and deployed on its own:

| Repo | Role |
|---|---|
| [campus-platform](https://github.com/Z-Zenith/campus-platform) | Orchestrator — architecture docs, `docker-compose.yml`, no app of its own |
| [campus-backend](https://github.com/Z-Zenith/campus-backend) | Backend API + DB this app talks to |
| **campus-teacher-web** | **This repo** — Teacher Web App |
| [campus-admin-web](https://github.com/Z-Zenith/campus-admin-web) | Admin Web App |
| [campus-parent-portal](https://github.com/Z-Zenith/campus-parent-portal) | Parent Portal |
| [campus-student-desktop](https://github.com/Z-Zenith/campus-student-desktop) | Student desktop app (Avalonia/.NET) |
| [campus-ai-services](https://github.com/Z-Zenith/campus-ai-services) | AI-backed services |
| [campus-api-client](https://github.com/Z-Zenith/campus-api-client) | Shared HTTP client/DTOs (npm) |
| [campus-shared-editor-kit](https://github.com/Z-Zenith/campus-shared-editor-kit) | Shared code editor/annotator/notes component (npm) |
| [campus-direct-messaging](https://github.com/Z-Zenith/campus-direct-messaging) | Shared messaging component (npm) |

For the full system architecture, requirements (`TWA-*`, `AWA-*`, `SDA-*`, ...), and diagrams, see
`campus-platform`'s
[Campus platform architecture.md](https://github.com/Z-Zenith/campus-platform/blob/main/Campus%20platform%20architecture.md).
For which tagged version of each repo is known-compatible with which others, see
[campus-platform/INTEGRATIONS.md](https://github.com/Z-Zenith/campus-platform/blob/main/INTEGRATIONS.md).

### Cross-repo dependencies

`@campus/api-client`, `@campus/direct-messaging`, and `@campus/shared-editor-kit` are pinned via
git tag in `package.json` (e.g. `"github:Z-Zenith/campus-api-client#0.1.0"`), replacing the
monorepo-era `file:../../packages/...` references that no longer resolve post-split. When bumping
one of these, cross-check `campus-platform/INTEGRATIONS.md`'s compatibility table first, and
update the pinned tag here to match.

### Backend & running the full platform

This repo only contains the frontend. To exercise it against a real backend, either point the
dev server's `/api` proxy at a `campus-backend` instance you're running separately, or bring up
the full platform (Postgres, OpenFGA, the backend, etc.) via `docker compose up -d` from
`campus-platform` — see that repo's README for the bootstrap/cloning steps for the full sibling
set.

### History

This repo's history was extracted via `git subtree split`, scoped to `apps/teacher-web/` from the
original `Omega` monorepo. Commits that didn't touch that path appear as no-op entries in the
history — a known cost of the split, not a bug.

## Contributing

Match the surrounding code's style and folder layout (`src/pages` for routed pages, `src/components`
for shared UI, `src/lib` for framework-agnostic logic). See `CLAUDE.md` for more detail on
conventions and the cross-repo pin setup.
