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
| `/authors` | `AuthorsPage` | Author list with paper counts |
| `/author/:authorId` | `AuthorPage` | Single author detail with publication list |
| `/graph` | `GraphPage` | Chart gallery overview |
| `/graph/:chartId` | `SingleChartPage` | Full-screen individual chart |
| `/globe` | `GlobePage` | Zoomable vector globe with institution pins |
| `/explore-net` | `ExploreNetPage` | Citation network graph |
| `/settings` | `SettingsPage` | Account preferences |

## Project Structure

```text
insyx-frontend/
├── src/
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts            # Axios instance (VITE_API_BASE_URL)
│   │   ├── papers.ts            # Papers API calls + types
│   │   ├── authors.ts           # Authors API calls + types
│   │   └── institutions.ts      # Institutions API calls + types
│   ├── charts/
│   │   ├── chartList.ts         # Registry of available charts
│   │   └── buildChartOption.ts  # ECharts option builders
│   ├── components/
│   │   ├── layout/              # AppShell, Navbar, Sidebar, ThemeToggle
│   │   ├── globe/               # MapGlobe, GlobePanel (MapLibre GL)
│   │   ├── charts/              # GraphPreview
│   │   ├── network/             # NetPreview
│   │   └── search/              # SearchPreview
│   ├── pages/
│   │   ├── home/                # HomePage
│   │   ├── explore/             # ExplorePage
│   │   ├── search/              # SearchPage
│   │   ├── paper/               # PaperPage
│   │   ├── authors/             # AuthorsPage, AuthorPage
│   │   ├── charts/              # GraphPage, SingleChartPage
│   │   ├── globe/               # GlobePage
│   │   ├── network/             # ExploreNetPage
│   │   └── settings/            # SettingsPage
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
docker compose up --build frontend
```

Frontend served at `http://localhost:8080`. Backend must be running on `http://localhost:3000`.

To rebuild without cache:

```bash
docker compose build --no-cache
docker compose up -d
```

```bash
docker compose down
```
