# Insyx Frontend

React SPA for Insyx — a Science-of-Science Explorer. Allows browsing, searching, and visualizing bibliometric data (papers, authors, citation networks).

## Technology Stack

- `React 19` — component-based UI
- `TypeScript` — type safety
- `Vite` — dev server and production bundler
- `React Router` — client-side routing
- `TanStack React Query` — async data fetching and caching
- `Axios` — HTTP client
- `ECharts` (`echarts-for-react`) — 2D interactive charts
- `echarts-gl` — 3D bar charts
- `react-globe.gl` + `Three.js` — 3D collaboration globe
- `React Icons` — icon library
- `ESLint` — linting
- `Nginx` + `Docker` — production static hosting

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | `HomePage` | Landing / login screen |
| `/explore` | `ExplorePage` | Paper list with chart preview panel |
| `/explore/:id` | `PaperPage` | Single paper details with author links |
| `/search` | `SearchPage` | Full-text paper search |
| `/graph` | `GraphPage` | All charts overview (6 panels) |
| `/graph/:chartId` | `SingleChartPage` | Single chart with filter sidebar |
| `/globe` | `GlobePage` | 3D globe of author collaborations (lazy-loaded) |
| `/explore-net` | `ExploreNetPage` | Citation network graph |
| `/authors` | `AuthorsPage` | Searchable author list |
| `/author/:authorId` | `AuthorPage` | Author profile with stats and charts |
| `/settings` | `SettingsPage` | App settings (theme etc.) |

## Project Structure

```text
insyx-frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts        # Axios instance (VITE_API_BASE_URL)
│   │   ├── papers.ts        # Papers API calls + types
│   │   └── authors.ts       # Authors API calls + types + countryFlag()
│   ├── charts/
│   │   ├── chartList.ts     # Shared chart metadata list
│   │   └── buildChartOption.ts  # ECharts option builders from Paper[] data
│   ├── components/
│   │   ├── AppShell.tsx     # Shared layout (Navbar + Sidebar)
│   │   └── GraphPreview.tsx # Carousel chart preview widget
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── PaperPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── GraphPage.tsx
│   │   ├── SingleChartPage.tsx
│   │   ├── GlobePage.tsx
│   │   ├── ExploreNetPage.tsx
│   │   ├── AuthorsPage.tsx
│   │   ├── AuthorPage.tsx
│   │   └── SettingsPage.tsx
│   └── theme/
│       ├── ThemeContext.tsx  # Light/dark theme provider
│       └── useTheme.ts
├── public/
├── index.html
├── nginx.conf
├── Dockerfile
├── docker-compose.yml
├── package.json
└── vite.config.ts
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
docker compose up --build
```

Frontend served at `http://localhost:8080`. Backend must be running on `http://localhost:3000`.

```bash
docker compose down
```
