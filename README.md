# Insyx Frontend

React SPA for Insyx — a Science-of-Science Explorer. Allows browsing, searching, and visualizing bibliometric data (papers, authors, citation networks).

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
- `React Icons` — icon library
- `ESLint` — linting
- `Nginx` + `Docker` — production static hosting

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default: `http://localhost:3000`) |
| `VITE_MAPTILER_KEY` | MapTiler API key — free at [maptiler.com](https://maptiler.com) |

## Routes

| Path | Page | Description |
|---|---|---|
| `/` | `HomePage` | Landing screen |
| `/explore` | `ExplorePage` | Overview cards for all modules |
| `/search` | `SearchPage` | Paper search with filters and sortable table |
| `/paper/:id` | `PaperPage` | Single paper detail (metadata, abstract, keywords) |
| `/graph` | `GraphPage` | 2D and 3D charts (bar, histogram, scatter, surface) |
| `/globe` | `GlobePage` | Zoomable vector globe with city labels and arcs |
| `/explore-net` | `ExploreNetPage` | Citation network graph (animated placeholder) |
| `/settings` | `SettingsPage` | Account preferences |

## Project Structure

```text
insyx-frontend/
├── src/
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts            # Axios instance (VITE_API_BASE_URL)
│   │   └── papers.ts            # Papers API calls + types
│   ├── components/
│   │   ├── AppShell.tsx         # Shared layout (Navbar + Sidebar)
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MapGlobe.tsx         # MapLibre GL globe (vector tiles)
│   │   ├── GraphPreview.tsx     # Chart preview for explore card
│   │   ├── NetPreview.tsx       # Animated SVG network preview
│   │   ├── SearchPreview.tsx    # Functional search preview for explore card
│   │   └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── PaperPage.tsx
│   │   ├── GraphPage.tsx
│   │   ├── GlobePage.tsx
│   │   ├── ExploreNetPage.tsx
│   │   └── SettingsPage.tsx
│   └── theme/
│       ├── ThemeContext.tsx      # Light/dark theme provider
│       └── useTheme.ts
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
```

## Run With Docker

```bash
# Fresh build (no cache)
docker compose build --no-cache
docker compose up -d
```

Frontend served at `http://localhost:8080`. Backend must be running on `http://localhost:3000`.

```bash
docker compose down
```
