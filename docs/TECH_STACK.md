# SubLift — Tech Stack

## Overview

SubLift is a client-heavy single-page application (SPA). All logic runs in the browser: 2D canvas manipulation, 3D rendering, engineering calculations, and PDF generation. There is no custom backend server. Data persistence is handled by Supabase (hosted PostgreSQL). The app is hosted as static files on GitHub Pages.

## Architecture Summary

```
GitHub Pages (static hosting, $0)
        ↓
   React SPA (all logic in browser)
        ↓
   Supabase (PostgreSQL, $0 free tier)
```

## Frontend

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React 18 + TypeScript** | Industry standard, strong typing prevents bugs in calculation logic, excellent ecosystem |
| Build Tool | **Vite** | Fast dev server, native TypeScript, optimized production builds for GitHub Pages |
| Routing | **React Router (hash mode)** | Hash routing (`/#/project/123`) required for GitHub Pages compatibility. Single config change |
| Styling | **Tailwind CSS** | Utility-first, fast to build UI, consistent design without custom CSS overhead |
| State Management | **Zustand** | Lightweight, simple API, good for complex nested state (deck layouts, equipment positions). Avoids Redux boilerplate |
| 2D Canvas | **Konva.js + react-konva** | Purpose-built for 2D interactive canvas: drag-and-drop, shapes, layers, hit detection. Ideal for moving equipment, drawing barriers, crane arcs |
| 3D Rendering | **Three.js + @react-three/fiber + @react-three/drei** | React-friendly Three.js wrapper. Drei provides helpers for camera controls, lighting, geometry. Ideal for the deck/crane/equipment 3D view |
| UI Components | **shadcn/ui + Radix** | Accessible, unstyled primitives. Good for forms (equipment input, RAO tables, crane curves), dialogs, tabs, toggles |
| Tables / Data Input | **TanStack Table** | For RAO tables, crane curve tables, scatter diagrams — sortable, editable tabular input |
| Charts | **Recharts** | For crane capacity curves, sea state operability plots, weather window charts |
| PDF Generation | **jsPDF + html2canvas** | Client-side PDF generation. html2canvas captures 2D/3D views as images. No server dependency |
| Math / Engineering | **mathjs** | Matrix operations for RAO calculations, interpolation for crane curves, general numerical computing |

## Data Layer (Supabase)

| Layer | Technology | Why |
|-------|-----------|-----|
| Database | **Supabase (PostgreSQL)** | Hosted PostgreSQL with REST API auto-generated from tables. Free tier: 500MB database, unlimited API requests. Zero server management |
| Client SDK | **@supabase/supabase-js** | Official JavaScript client. Handles all CRUD operations directly from the browser |
| Validation | **Zod** | Schema validation on the frontend before sending data to Supabase |
| Security | **Row Level Security (RLS)** | Supabase anon key is public by design. Data access rules are enforced at the database level via RLS policies. For MVP single-user, RLS is permissive (allow all) |

### Supabase handles

- Persisting projects (vessel config, crane config, equipment positions, analysis results)
- Global equipment library storage
- No authentication needed for MVP (single user)

### Supabase does NOT handle

- Calculations (all run client-side)
- PDF generation (all run client-side)
- File storage (no files to store — all data is structured in database tables)

## Project Structure

```
sublift/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── .env                           ← Supabase URL + anon key
├── .github/
│   └── workflows/
│       └── deploy.yml             ← GitHub Actions: build + deploy to Pages
├── docs/                          ← All spec documents (not deployed)
│   ├── OVERVIEW.md
│   ├── TECH_STACK.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── UI_SPEC.md
│   ├── CONVENTIONS.md
│   └── modules/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/                    ← Page-level route components
│   ├── components/
│   │   ├── ui/                    ← shadcn/ui components
│   │   ├── vessel/                ← Vessel Designer components
│   │   ├── crane/                 ← Crane System components
│   │   ├── equipment/             ← Equipment Library components
│   │   ├── deck-layout/           ← 2D Deck Layout (Konva)
│   │   ├── viewer-3d/             ← 3D Viewer (Three.js)
│   │   ├── analysis/              ← DNV + Weather Window
│   │   └── report/                ← PDF Report generation
│   ├── stores/                    ← Zustand stores
│   ├── hooks/                     ← Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts            ← Supabase client initialization
│   │   ├── calculations/          ← DNV formulas, crane interpolation, hydro coefficients
│   │   └── geometry/              ← Coordinate transforms, collision detection
│   ├── types/                     ← TypeScript types
│   └── validation/                ← Zod schemas
├── tests/
│   ├── calculations/              ← Unit tests for DNV, crane, hydro
│   └── components/                ← Component tests
├── public/
│   └── assets/
└── supabase/
    └── migrations/                ← SQL migration files for table creation
```

## Build, Test & Deploy

| Tool | Purpose |
|------|---------|
| **Vite** | Dev server + production bundler |
| **Vitest** | Unit testing (critical for DNV calculations) |
| **ESLint + Prettier** | Code quality and formatting |
| **GitHub Actions** | Auto-build and deploy to GitHub Pages on every push to main |
| **GitHub Pages** | Static hosting, free, accessible at `https://<user>.github.io/sublift` |

### GitHub Actions Deploy Pipeline

On every push to `main`:
1. Install dependencies
2. Run tests (`vitest run`)
3. Build production bundle (`vite build`)
4. Deploy `dist/` to GitHub Pages

This means: every PR you merge from Claude Code Web automatically updates the live app.

## Key Technical Decisions

### Why all calculations run in the browser

The DNV splash zone calculations, crane curve interpolation, hydrodynamic coefficient estimation, and weather window analysis all run client-side in `src/lib/calculations/`. Reasons:

1. **Instant feedback** — The user adjusts crane position and immediately sees updated capacity. Server-side calculations would add latency.
2. **Simplicity** — No API calls for calculations, no request/response overhead.
3. **Zero server cost** — No compute server to run or pay for.
4. **Offline potential** — Future versions could work offline since all logic is client-side.

### Why Supabase (not SQLite, not custom backend)

- **No server to manage** — Supabase is fully hosted. No Express.js, no Node.js server, no VPS.
- **Free tier is sufficient** — 500MB database for an MVP with a single user storing project configurations is more than enough.
- **Auto-generated REST API** — Define tables, get CRUD endpoints automatically. The Supabase JS client handles all queries.
- **Migration path** — If SubLift grows to multi-user, Supabase already has authentication, RLS, and team features built in.

### Why GitHub Pages (not Vercel, not Netlify)

- **Zero additional service** — The repo is already on GitHub. Pages is built-in, no extra account needed.
- **Zero cost** — Free for public and private repos.
- **Auto-deploy via Actions** — Every merge to main triggers a build and deploy. Same workflow as Vercel but without a separate service.
- **Trade-off** — Requires hash routing (`/#/`) instead of clean URLs (`/`). Acceptable for an internal engineering tool.

### Why Konva.js for 2D (not raw Canvas or SVG)

The deck layout requires: dragging equipment shapes, collision detection with barriers, drawing crane arcs, hover states, click selection, and layer management (deck below, equipment above, crane arc on top). Konva provides all of this out of the box with react-konva. Building from raw Canvas API would take significantly more code.

### Why jsPDF + html2canvas for PDF

The PDF report includes captured images of the 2D deck layout and 3D views. html2canvas captures rendered canvas/WebGL elements as images. jsPDF assembles the final document. Entirely client-side, no server dependency. Trade-off: less typographic control than server-side PDF, but acceptable for an engineering report.

## Infrastructure Setup (Pre-Development)

Before the first Claude Code prompt, you need to set up two things:

### 1. Supabase Project (5 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up (use GitHub login)
2. Click "New Project"
3. Choose a project name (e.g., `sublift`) and set a database password
4. Wait ~2 minutes for provisioning
5. Go to Project Settings → API
6. Copy **Project URL** (e.g., `https://abc123.supabase.co`)
7. Copy **anon public key** (e.g., `eyJhbGciOiJIUzI1NiIs...`)
8. These two values go into the `.env` file in the repo

The anon key is **public by design** — it is safe to use in frontend code. Data access is controlled by Row Level Security policies in the database, not by the key.

### 2. GitHub Repository + Pages (5 minutes)

1. Create a new repo on GitHub (public or private)
2. Upload all `/docs` files and `CLAUDE.md`
3. Go to repo Settings → Pages → Source: GitHub Actions
4. The deploy workflow will be created by Claude Code in the first implementation prompt

### 3. Environment Variables

Create a `.env` file in the repo root (Claude Code will reference this):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

The `VITE_` prefix makes these variables available to the frontend via Vite's built-in env handling.

For GitHub Actions deployment, these same values need to be added as repository secrets:
- Go to repo Settings → Secrets and variables → Actions
- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## Version Pinning

All major dependencies pinned in package.json:

```json
{
  "react": "^18.3.0",
  "react-router-dom": "^6.20.0",
  "konva": "^9.3.0",
  "react-konva": "^18.2.0",
  "three": "^0.160.0",
  "@react-three/fiber": "^8.15.0",
  "@react-three/drei": "^9.90.0",
  "@supabase/supabase-js": "^2.39.0",
  "zustand": "^4.5.0",
  "mathjs": "^12.0.0",
  "jspdf": "^2.5.0",
  "html2canvas": "^1.4.0",
  "zod": "^3.22.0",
  "recharts": "^2.10.0",
  "@tanstack/react-table": "^8.11.0"
}
```
