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
- `MapLibre GL JS` — vector tile globe with full zoom quality; 3D institution bars (fill-extrusion) and a 2D country choropleth
- `world-atlas` + `topojson-client` — low-res country boundary geometry for the 2D choropleth; `i18n-iso-countries` bridges its numeric country IDs to our alpha-2 `country_code`
- `@shadergradient/react` + `@react-three/fiber` + `three` — animated 3D gradient backdrop on the landing/auth pages (lazy-loaded, only on those pages)
- `liquid-glass-react` — frosted-glass login/register card effect (login/register page only)
- `React Icons` (`react-icons/lu`, Lucide set) — icon library for the redesigned app shell/pages
- `IBM Plex Sans` / `IBM Plex Mono` — UI and tabular-number typefaces, loaded from Google Fonts
- `Vitest` + `@testing-library/react` — unit tests
- `ESLint` — linting
- `Nginx` + `Docker` — production static hosting

## Authentication

Login, registration, "forgot password", and Google sign-in all live on `/` (and `/forgot-password`, `/reset-password`). Sessions are httpOnly cookies set by the backend — the frontend never touches the token directly; `AuthContext`/`useAuth` (`src/auth/`) hydrate the current user by calling `/auth/me` on load. `RequireAuth` (`src/components/auth/`) gates routes that need a logged-in user — `/settings` and `/account`; every bibliometric browsing page stays public.

Google sign-in needs a real `VITE_GOOGLE_CLIENT_ID` (see below) to actually work — the button renders either way, but authentication will fail against a placeholder ID.

Profile editing (name/email/affiliation/password) lives on `/account`, not `/settings` — `/settings` is appearance-only (theme). Both are reachable from the avatar menu in the top bar.

## Design System

The app shell (sidebar, top bar, avatar menu) and the Search/Paper/Account/Settings pages follow a token-based design system ported from an external design-handoff mockup (not part of this repo): colors/spacing/typography as CSS custom properties in `src/App.css` (`--bg`, `--panel`, `--primary`, `--c1`…`--c5` for field colors, etc.), plus shared component classes in `src/styles/ui-kit.css` (`uiCard`, `uiBtn`, `uiTag`, `uiInput`, skeleton/progress loading states). Older `--app-*` custom properties are kept as aliases onto the same tokens for pages not yet migrated onto the plain names.

Theme is three-way (Dark / Light / System), controlled only from `/settings`, persisted to `localStorage`, and applied via `data-theme` on `<html>` (removed entirely for "System", which falls back to `prefers-color-scheme`).

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
| `/search` | `SearchPage` | Paper search: query/field/sort toolbar, domain/year/OA filters, CSV export, sortable table |
| `/paper/:id` | `PaperPage` | Single paper detail (type/domain/field tags, stats, topics, sortable authors, institutions) |
| `/authors` | `AuthorsPage` | Author list, searchable/sortable (papers/citations/name) |
| `/author/:authorId` | `AuthorPage` | Single author detail with sortable publication list (year/citations/title) |
| `/institutions` | `InstitutionsPage` | Institution list, searchable/sortable (works/citations/name) |
| `/institution/:institutionId` | `InstitutionPage` | Single institution detail — separate sortable Works and Authors lists |
| `/graph` | `GraphPage` | Chart gallery overview |
| `/graph/:chartId` | `SingleChartPage` | Full-screen individual chart |
| `/globe` | `GlobePage` | Zoomable vector globe — see note below |
| `/explore-net` | `ExploreNetPage` | Citation network graph |
| `/settings` | `SettingsPage` | Appearance/theme only (requires login) |
| `/account` | `AccountPage` | Personal details, password, sessions (requires login) |

> **Globe (`MapGlobe.tsx`)**: 3D mode renders each institution as a fill-extrusion
> bar at its lat/lng — footprint size from author count, height from works count,
> color from citations-per-work (log-scaled on all three; institutions without
> coordinates yet are simply not plotted). 2D mode instead shows a country
> choropleth colored by total work count (`/works/institutions/by-country`,
> joined to `world-atlas`'s country polygons via their numeric id). Zoom-based
> LOD (`/works/institutions/map`) limits markers to the biggest ones at low
> zoom, revealing smaller institutions as you zoom in. Clicking a bar opens the
> right-hand explorer panel (`GlobePanel.tsx`) with that institution's works and
> authors, each navigable. maplibre-gl's tile worker also needed two build-time
> fixes to load at all under Vite/nginx — see `scripts/copy-maplibre-worker.mjs`
> and the `.mjs` MIME-type block in `nginx.conf`.

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
│   │   ├── common/                # BackLink — shared "← back to X" link, Link-to-route or history-back
│   │   ├── layout/               # AppShell, Navbar, Sidebar (collapsible), AvatarMenu, ThemeToggle
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
│   │   ├── institutions/            # InstitutionsPage, InstitutionPage
│   │   ├── charts/                 # GraphPage, SingleChartPage
│   │   ├── globe/                  # GlobePage
│   │   ├── network/                # ExploreNetPage
│   │   ├── settings/                # SettingsPage — appearance only (behind RequireAuth)
│   │   └── account/                 # AccountPage — profile/password/sessions (behind RequireAuth)
│   ├── styles/
│   │   └── ui-kit.css            # Shared design-system component classes (uiCard, uiBtn, uiTag, …)
│   ├── utils/
│   │   ├── authorNames.ts
│   │   └── fieldColor.ts         # Field → --c1..--c5 color mapping, shared by Search/Paper pages
│   ├── theme/
│   │   ├── ThemeContext.tsx      # Dark/Light/System theme provider
│   │   └── useTheme.ts
│   └── test/
│       └── setup.ts              # Vitest + jest-dom setup
├── scripts/
│   └── copy-maplibre-worker.mjs  # predev/prebuild: copies maplibre-gl's worker into public/vendor/
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
