# Insyx Frontend

React SPA for Insyx — a Science-of-Science Explorer. Allows browsing, searching, and visualizing bibliometric data (papers, authors, citation networks), with a login/register account system.

## Technology Stack

- `React 19` — component-based UI
- `TypeScript` — type safety
- `Vite` — dev server and production bundler
- `React Router v7` — client-side routing
- `TanStack React Query` — async data fetching and caching
- `Axios` — HTTP client
- `ECharts` (`echarts-for-react`) — 2D interactive charts
- `echarts-gl` — 3D charts (bar3D, surface3D, scatter3D)
- `MapLibre GL JS` — vector tile globe with full zoom quality
- `@shadergradient/react` + `@react-three/fiber` + `three` — animated 3D gradient backdrop on the landing/auth pages (lazy-loaded, only on those pages)
- `liquid-glass-react` — frosted-glass login/register card effect
- `React Icons` — icon library
- `Vitest` + `@testing-library/react` — unit tests
- `ESLint` — linting
- `Nginx` + `Docker` — production static hosting

## Authentication

Login, registration, "forgot password", and Google sign-in all live on `/` (and `/forgot-password`, `/reset-password`). Sessions are httpOnly cookies set by the backend — the frontend never touches the token directly; `AuthContext`/`useAuth` (`src/auth/`) hydrate the current user by calling `/auth/me` on load. `RequireAuth` (`src/components/auth/`) gates routes that need a logged-in user — currently only `/settings`; every bibliometric browsing page stays public.

Google sign-in needs a real `VITE_GOOGLE_CLIENT_ID` (see below) to actually work — the button renders either way, but authentication will fail against a placeholder ID.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default: `http://127.0.0.1:3000`) |
| `VITE_MAPTILER_KEY` | MapTiler API key — free at [maptiler.com](https://maptiler.com) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID for Sign in with Google (Identity Services ID-token flow, no client secret) — see `.env.example` for how to create one |

## Routes

| Path | Page | Description |
|---|---|---|
| `/` | `HomePage` | Login / register, animated 3D backdrop |
| `/forgot-password` | `ForgotPasswordPage` | Request a password-reset link |
| `/reset-password` | `ResetPasswordPage` | Set a new password from a reset link (`?token=`) |
| `/explore` | `ExplorePage` | Overview cards for all modules |
| `/search` | `SearchPage` | Paper search with filters and sortable table |
| `/paper/:id` | `PaperPage` | Single paper detail (metadata, abstract, keywords) |
| `/authors` | `AuthorsPage` | Author list with paper counts |
| `/author/:authorId` | `AuthorPage` | Single author detail with publication list |
| `/graph` | `GraphPage` | Chart gallery overview |
| `/graph/:chartId` | `SingleChartPage` | Full-screen individual chart |
| `/globe` | `GlobePage` | Zoomable vector globe with institution pins |
| `/explore-net` | `ExploreNetPage` | Citation network graph |
| `/settings` | `SettingsPage` | Account preferences (requires login) |

## Project Structure

```text
insyx-frontend/
├── src/
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts            # Axios instance (VITE_API_BASE_URL, withCredentials, silent-refresh-on-401)
│   │   ├── works.ts              # Works/authors/institutions/stats API calls + types
│   │   └── auth.ts               # register/login/logout/me/forgot-password/reset-password/google
│   ├── auth/
│   │   ├── AuthContext.tsx       # AuthProvider — hydrates session via /auth/me
│   │   ├── auth-context.ts
│   │   └── useAuth.ts
│   ├── charts/
│   │   ├── chartList.ts          # Registry of available charts
│   │   ├── buildChartOption.ts   # ECharts option builders
│   │   └── useWorksStats.ts      # Shared stats-fetching hook (GraphPage + GraphPreview)
│   ├── components/
│   │   ├── layout/               # AppShell, Navbar, Sidebar, ThemeToggle
│   │   ├── auth/                 # RequireAuth route guard, GoogleSignInButton
│   │   ├── globe/                # MapGlobe, GlobePanel (MapLibre GL)
│   │   ├── charts/                # GraphPreview
│   │   ├── network/               # NetPreview
│   │   └── search/                # SearchPreview
│   ├── pages/
│   │   ├── home/                 # HomePage (login/register), ForgotPasswordPage, ResetPasswordPage, HeroGradient
│   │   ├── explore/               # ExplorePage
│   │   ├── search/                 # SearchPage
│   │   ├── paper/                  # PaperPage
│   │   ├── authors/                # AuthorsPage, AuthorPage
│   │   ├── charts/                 # GraphPage, SingleChartPage
│   │   ├── globe/                  # GlobePage
│   │   ├── network/                # ExploreNetPage
│   │   └── settings/                # SettingsPage (behind RequireAuth)
│   ├── theme/
│   │   ├── ThemeContext.tsx      # Light/dark theme provider
│   │   └── useTheme.ts
│   └── test/
│       └── setup.ts              # Vitest + jest-dom setup
├── public/
├── .env.example
├── index.html
├── nginx.conf
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Run Without Docker

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # preview production build locally
npm test          # run unit tests once
npm run test:watch  # unit tests in watch mode
```

## Run With Docker

```bash
docker compose up --build frontend
```

Frontend served at `http://127.0.0.1:8081`. Backend must be running on `http://127.0.0.1:3000`. Use `127.0.0.1`, not `localhost` — on this project's Windows/Docker Desktop setup, `localhost` can resolve to `::1` and reset the connection.

To rebuild without cache:

```bash
docker compose build --no-cache
docker compose up -d
```

```bash
docker compose down
```
