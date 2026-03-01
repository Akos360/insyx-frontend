# Insyx Frontend

Frontend application for the Insyx project, built with React and TypeScript.

## Technology Stack
- `React`: Component-based UI framework.
- `TypeScript`: Type safety for UI and API integration.
- `Vite`: Fast dev server and production bundler.
- `React Router`: Client-side routing (`/`, `/explore`).
- `Axios`: HTTP client for backend communication.
- `TanStack React Query`: Async state, caching, and request lifecycle handling.
- `Bootstrap`: Base UI styling utilities.
- `Zod`: Runtime schema validation support.
- `Nginx` + `Docker`: Production static hosting in containers.

## What This App Does
- Frontend routes: `/` and `/explore`.
- Backend API calls via `VITE_API_BASE_URL` (example: `http://localhost:3000`).

## Project Structure
```text
insyx-frontend/
|-- src/
|   |-- main.tsx
|   |-- App.tsx
|   |-- App.css
|   |-- api/
|   |   |-- client.ts
|   |   `-- papers.ts
|   |-- pages/
|   |   |-- HomePage.tsx
|   |   |-- ExplorePage.tsx
|   |   `-- explore.css
|   `-- ui/
|       |-- Pane.tsx
|       `-- pane.css
|-- public/
|-- nginx.conf
|-- Dockerfile
|-- docker-compose.yml
|-- package.json
`-- vite.config.ts
```

## Run With Docker (Recommended)
From the frontend repository root:

```bash
docker compose up --build
```

Frontend will be available at `http://localhost:8080`.

Stop containers:

```bash
docker compose down
```

Important:
- Backend must be running on `http://localhost:3000`.
- Compose builds frontend with `VITE_API_BASE_URL=http://localhost:3000`.

## Run Without Docker
Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```
