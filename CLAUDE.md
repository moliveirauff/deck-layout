# SubLift — Subsea Lift Planning Tool

Single-page React app for planning subsea equipment installation operations. Engineers register vessels and equipment, position items on a 2D deck layout, configure crane positions, run DNV-ST-N001 splash zone analysis, and generate PDF reports.

## Documentation

Read the relevant docs before implementing any feature:

- `docs/OVERVIEW.md` — Full project scope and workflow
- `docs/TECH_STACK.md` — Technology choices and project structure
- `docs/ARCHITECTURE.md` — Module map, data flows, calculation engine structure
- `docs/DATA_MODEL.md` — All Supabase tables, fields, relationships
- `docs/UI_SPEC.md` — Screen flow, layout, color palette, component usage
- `docs/CONVENTIONS.md` — Code style, naming, patterns, testing requirements
- `docs/SEED_DATA.md` — Mock data for development and testing
- `docs/modules/module-XX-*.md` — Detailed spec per module (read the relevant one before implementing)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run test         # Run Vitest
npm run test:watch   # Run Vitest in watch mode
npm run lint         # ESLint check
npm run format       # Prettier format
```

## Rules

- Read `docs/CONVENTIONS.md` before writing any code
- Read the specific module doc (`docs/modules/module-XX-*.md`) before implementing that module
- TypeScript strict mode. Never use `any`.
- All functions in `src/lib/calculations/` must have unit tests
- Use realistic engineering values in tests (reference `docs/SEED_DATA.md`)
- Components must stay under 200 lines. Extract sub-components or hooks if larger.
- All Supabase calls go through service functions in `src/lib/supabase/`, never directly in components
- Calculation functions are pure: no side effects, no state, no Supabase calls
- Angles stored in degrees, converted to radians only inside calculation functions
- All units are SI (meters, tonnes, seconds, degrees). See `docs/CONVENTIONS.md` for details.
- Use Zod for validation at data boundaries (form inputs, Supabase responses)

## Do NOT

- Do not create a backend server. All logic runs in the browser. Supabase handles persistence.
- Do not use `localStorage` or `sessionStorage`. Use Zustand for state, Supabase for persistence.
- Do not install libraries not listed in `docs/TECH_STACK.md` without asking first.
- Do not modify the Supabase schema without updating `docs/DATA_MODEL.md`.
- Do not skip tests for calculation functions.
- Do not use inline styles. Use Tailwind classes only.
- Do not use default exports except for React page components.

## Environment

```
VITE_SUPABASE_URL=<set in .env>
VITE_SUPABASE_ANON_KEY=<set in .env>
```

## Deployment

Static site deployed to GitHub Pages via GitHub Actions. Hash routing (`/#/`) for all routes.
