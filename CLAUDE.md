# campus-teacher-web

Teacher Web App (TWA) — part of the Campus Digitalization Platform. Split out of the `Omega`
monorepo; see
[campus-platform/docs/Campus platform architecture.md](https://github.com/Z-Zenith/campus-platform/blob/main/docs/Campus%20platform%20architecture.md)
for the full system architecture and `campus-platform/INTEGRATIONS.md` for compatible versions
of `@campus/api-client`, `@campus/shared-editor-kit`, and `@campus/direct-messaging`.

This repo's history was extracted via `git subtree split`, scoped to `apps/teacher-web/` from
the original monorepo — commits that didn't touch this path appear as no-op entries, a known
cost of the split, not a bug.

## Tech stack

React 19 + Vite + TypeScript, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui, Framer Motion,
TanStack Query, Recharts. Lint via oxlint.

## Build & test

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

## Cross-repo dependencies

`@campus/api-client`, `@campus/direct-messaging`, and `@campus/shared-editor-kit` are pinned via
git tag (`"github:Z-Zenith/campus-<pkg>#0.1.0"` in `package.json`), replacing the monorepo-era
`file:../../packages/...` references that no longer resolve post-split. Bump the pinned tag when
a new version of any of these is cut.

## Code conventions

Match the surrounding code's style and folder layout. Feature IDs referenced in this repo span
TWA-01 through TWA-20 (not every ID in that range has a dedicated page here — see the
architecture doc's Section 2/7 for the full, authoritative feature list).
