import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";

const GlobePage = lazy(() => import("./pages/globe/GlobePage"));
// echarts-gl is heavy and only these two pages use it — lazy so it doesn't
// ship in the main bundle to every visitor who never opens a chart.
const GraphPage = lazy(() => import("./pages/charts/GraphPage"));
const SingleChartPage = lazy(() => import("./pages/charts/SingleChartPage"));
import ExploreNetPage from "./pages/network/ExploreNetPage";
import HomePage from "./pages/home/HomePage";
import ForgotPasswordPage from "./pages/home/ForgotPasswordPage";
import ResetPasswordPage from "./pages/home/ResetPasswordPage";
import PaperPage from "./pages/paper/PaperPage";
import ExplorePage from "./pages/explore/ExplorePage";
import SearchPage from "./pages/search/SearchPage";
import SettingsPage from "./pages/settings/SettingsPage";
import AccountPage from "./pages/account/AccountPage";
import AuthorsPage from "./pages/authors/AuthorsPage";
import AuthorPage from "./pages/authors/AuthorPage";
import InstitutionsPage from "./pages/institutions/InstitutionsPage";
import InstitutionPage from "./pages/institutions/InstitutionPage";
import NotFoundPage from "./pages/not-found/NotFoundPage";
import { ThemeProvider } from "./theme/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import ErrorBoundary from "./components/common/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<AppShell />}>
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/explore-net" element={<ExploreNetPage />} />
                <Route path="/graph" element={
                  <Suspense fallback={<div />}>
                    <GraphPage />
                  </Suspense>
                } />
                <Route path="/graph/:chartId" element={
                  <Suspense fallback={<div />}>
                    <SingleChartPage />
                  </Suspense>
                } />
                <Route path="/paper/:id" element={<PaperPage />} />
                <Route path="/authors" element={<AuthorsPage />} />
                <Route path="/author/:authorId" element={<AuthorPage />} />
                <Route path="/institutions" element={<InstitutionsPage />} />
                <Route path="/institution/:institutionId" element={<InstitutionPage />} />
                <Route element={<RequireAuth />}>
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/account" element={<AccountPage />} />
                </Route>
                <Route path="/globe" element={
                  <Suspense fallback={<div />}>
                    <GlobePage />
                  </Suspense>
                } />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}