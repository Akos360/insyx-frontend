import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

const GlobePage = lazy(() => import("./pages/globe/GlobePage"));
import ExploreNetPage from "./pages/network/ExploreNetPage";
import HomePage from "./pages/home/HomePage";
import PaperPage from "./pages/paper/PaperPage";
import GraphPage from "./pages/charts/GraphPage";
import SingleChartPage from "./pages/charts/SingleChartPage";
import ExplorePage from "./pages/explore/ExplorePage";
import SearchPage from "./pages/search/SearchPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AuthorsPage from "./pages/authors/AuthorsPage";
import AuthorPage from "./pages/authors/AuthorPage";
import { ThemeProvider } from "./theme/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<AppShell />}>
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore-net" element={<ExploreNetPage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/graph/:chartId" element={<SingleChartPage />} />
            <Route path="/paper/:id" element={<PaperPage />} />
            <Route path="/authors" element={<AuthorsPage />} />
            <Route path="/author/:authorId" element={<AuthorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/globe" element={
              <Suspense fallback={<div />}>
                <GlobePage />
              </Suspense>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}