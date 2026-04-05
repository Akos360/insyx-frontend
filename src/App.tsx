import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ExploreNetPage from "./pages/ExploreNetPage";
import HomePage from "./pages/HomePage";
import PaperPage from "./pages/PaperPage";
import GraphPage from "./pages/GraphPage";
import SingleChartPage from "./pages/SingleChartPage";
import ExplorePage from "./pages/ExplorePage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import AuthorsPage from "./pages/AuthorsPage";
import AuthorPage from "./pages/AuthorPage";
import { ThemeProvider } from "./theme/ThemeContext";

const GlobePage = lazy(() => import("./pages/GlobePage"));

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
            <Route
              path="/globe"
              element={(
                <Suspense fallback={<div>Loading globe...</div>}>
                  <GlobePage />
                </Suspense>
              )}
            />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}