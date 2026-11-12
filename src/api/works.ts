import { api } from "./client";
import type { YearStat, FieldStat, TypeStat, ScatterPoint, OaYearStat, TypePeriodStat, ApcStat } from "../charts/buildChartOption";

export type Work = {
  id: string;
  title: string;
  publication_year: number;
  domain: string;
  field: string;
  cited_by_count: number;
  authors: string;
  is_oa: boolean;
  source_name: string;
  /** Set only when actively searching and the term hit the abstract — see WorksService.findAll. */
  matchSnippet?: string | null;
};

export type WorkInstitution = {
  id: string;
  name: string;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type WorkDetail = {
  institutions: WorkInstitution[];
  id: string;
  doi: string | null;
  title: string;
  abstract: string | null;
  publication_year: number;
  publication_date: string | null;
  type: string | null;
  language: string | null;
  domain: string | null;
  field: string | null;
  subfield: string | null;
  primary_topic: string | null;
  keywords: string | null;
  cited_by_count: number;
  referenced_works_count: number | null;
  is_oa: boolean;
  oa_url: string | null;
  pdf_url: string | null;
  license: string | null;
  source_name: string | null;
  source_type: string | null;
  num_authors: number | null;
  apc_usd: number | null;
  authors: string | null;
};

export type WorkTopic = {
  topic_id: string;
  display_name: string;
  score: number;
};

export type WorksPage = {
  items: Work[];
  total: number;
  limit: number;
  offset: number;
};

export type WorksQuery = {
  search?: string;
  domain?: string;
  field?: string;
  yearFrom?: number;
  yearTo?: number;
  is_oa?: boolean;
  limit?: number;
  offset?: number;
  /** Comma-separated for multi-column sort, e.g. "field,citedByCount". */
  sortBy?: string;
  /** Comma-separated, positionally paired with sortBy, e.g. "asc,desc". */
  sortDir?: string;
};

export async function searchWorks(query: WorksQuery): Promise<WorksPage> {
  const res = await api.get<WorksPage>("/works", { params: query });
  return res.data;
}

export async function getWorkDomains(): Promise<string[]> {
  const res = await api.get<string[]>("/works/domains");
  return res.data;
}

/** Builds a direct download link for /works/export — a plain navigation, not an axios call. */
export function buildExportCsvUrl(query: Omit<WorksQuery, "limit" | "offset">): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${api.defaults.baseURL}/works/export${qs ? `?${qs}` : ""}`;
}

export async function getWorkFields(): Promise<string[]> {
  const res = await api.get<string[]>("/works/fields");
  return res.data;
}

export async function getWork(id: string): Promise<WorkDetail> {
  const res = await api.get<WorkDetail>(`/works/${id}`);
  return res.data;
}

export type CoAuthor = {
  author_id: string;
  display_name: string;
  country_code: string | null;
  first_institution_name: string | null;
};

export async function getWorkCoAuthors(id: string): Promise<CoAuthor[]> {
  const res = await api.get<CoAuthor[]>(`/works/${id}/co-authors`);
  return res.data;
}

export async function getWorkTopics(id: string): Promise<WorkTopic[]> {
  const res = await api.get<WorkTopic[]>(`/works/${id}/topics`);
  return res.data;
}

export type AuthorListItem = {
  author_id: string;
  display_name: string;
  orcid: string | null;
  country_code: string | null;
  works_count: number;
  cited_by_count: number;
  hIndex: number;
};

export type AuthorsPage = {
  items: AuthorListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AuthorsQuery = {
  search?: string;
  country?: string;
  hasOrcid?: boolean;
  minWorks?: number;
  limit?: number;
  offset?: number;
  /** Comma-separated for multi-column sort, e.g. "country,citedByCount". */
  sortBy?: string;
  /** Comma-separated, positionally paired with sortBy, e.g. "asc,desc". */
  sortDir?: string;
};

export async function searchAuthors(query: AuthorsQuery): Promise<AuthorsPage> {
  const res = await api.get<AuthorsPage>("/works/authors", { params: query });
  return res.data;
}

/** Builds a direct download link for /works/authors/export — a plain navigation, not an axios call. */
export function buildExportAuthorsCsvUrl(query: Omit<AuthorsQuery, "limit" | "offset">): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${api.defaults.baseURL}/works/authors/export${qs ? `?${qs}` : ""}`;
}

export async function getAuthorCountries(): Promise<string[]> {
  const res = await api.get<string[]>("/works/authors/countries");
  return res.data;
}

export type AuthorPaper = {
  id: string;
  title: string;
  publication_year: number;
  field: string | null;
  domain: string | null;
  cited_by_count: number;
  is_oa: boolean;
  source_name: string | null;
};

export type AuthorDetail = {
  authorId: string;
  displayName: string;
  orcid: string | null;
  countryCode: string | null;
  firstInstitutionName: string | null;
  hIndex: number;
  // Computed server-side from the author's *entire* paper list, not just
  // the page in `papers` below — `papers` only holds one page.
  totalCitations: number;
  fields: string[];
  yearsActive: { min: number; max: number } | null;
  papersByYear: { year: number; count: number }[];
  topCitedPapers: { id: string; title: string; cited_by_count: number }[];
  /** Total papers the author has, independent of how many `papers` holds on this page. */
  papersTotal: number;
  limit: number;
  offset: number;
  papers: AuthorPaper[];
};

export async function getAuthor(
  authorId: string,
  params: { limit?: number; offset?: number } = {},
): Promise<AuthorDetail | null> {
  const res = await api.get<AuthorDetail | null>(`/works/authors/${authorId}`, { params });
  return res.data;
}

/** Converts ISO 3166-1 alpha-2 country code to a flag emoji. */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  const offset = 127397;
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(c.charCodeAt(0) + offset)).join("");
}

export interface InstitutionProperties {
  name: string;
  workCount: number;
  authorCount: number;
  citationCount: number;
  /** Citations per work — the color encoding (standard bibliometric impact measure) */
  citationsPerWork: number;
  /** Normalized score 0–1 relative to the top institution in the current dataset */
  score: number;
  countryCode: string;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  countryCode: string;
  workCount: number;
  /** Only present from listInstitutions (/works/institutions), not the flat search endpoint. */
  authorCount?: number;
  citationCount: number;
}

export interface InstitutionFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: InstitutionProperties;
}

export interface InstitutionFeatureCollection {
  type: "FeatureCollection";
  features: InstitutionFeature[];
}

export interface InstitutionMapParams {
  zoom: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export async function getInstitutionsMap(
  params: InstitutionMapParams,
): Promise<InstitutionFeatureCollection> {
  const res = await api.get<InstitutionFeatureCollection>("/works/institutions/map", { params });
  return res.data;
}

export async function searchInstitutions(q: string): Promise<InstitutionSummary[]> {
  const res = await api.get<InstitutionSummary[]>("/works/institutions/search", { params: { q } });
  return res.data;
}

export type InstitutionWorksPage = {
  items: Work[];
  total: number;
  limit: number;
  offset: number;
};

export async function getInstitutionWorks(
  id: string,
  params: { limit?: number; offset?: number } = {},
): Promise<InstitutionWorksPage> {
  const res = await api.get<InstitutionWorksPage>(`/works/institutions/${id}/works`, { params });
  return res.data;
}

export type CountryWorkCount = {
  countryCode: string;
  workCount: number;
};

export async function getInstitutionsByCountry(): Promise<CountryWorkCount[]> {
  const res = await api.get<CountryWorkCount[]>("/works/institutions/by-country");
  return res.data;
}

export type InstitutionsPage = {
  items: InstitutionSummary[];
  total: number;
  limit: number;
  offset: number;
};

export type InstitutionsQuery = {
  search?: string;
  country?: string;
  minWorks?: number;
  limit?: number;
  offset?: number;
  /** Comma-separated for multi-column sort, e.g. "country,worksCount". */
  sortBy?: string;
  /** Comma-separated, positionally paired with sortBy, e.g. "asc,desc". */
  sortDir?: string;
};

export async function listInstitutions(query: InstitutionsQuery): Promise<InstitutionsPage> {
  const res = await api.get<InstitutionsPage>("/works/institutions", { params: query });
  return res.data;
}

/** Builds a direct download link for /works/institutions/export — a plain navigation, not an axios call. */
export function buildExportInstitutionsCsvUrl(query: Omit<InstitutionsQuery, "limit" | "offset">): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `${api.defaults.baseURL}/works/institutions/export${qs ? `?${qs}` : ""}`;
}

export type InstitutionDetail = {
  id: string;
  name: string;
  countryCode: string | null;
  institutionType: string | null;
  homepageUrl: string | null;
  ror: string | null;
  latitude: number | null;
  longitude: number | null;
  workCount: number;
  citationCount: number;
};

export async function getInstitution(id: string): Promise<InstitutionDetail | null> {
  const res = await api.get<InstitutionDetail | null>(`/works/institutions/${id}`);
  return res.data;
}

export type InstitutionAuthor = {
  author_id: string;
  display_name: string;
  orcid: string | null;
  country_code: string | null;
  works_count: number;
  cited_by_count: number;
};

export type InstitutionAuthorsPage = {
  items: InstitutionAuthor[];
  total: number;
  limit: number;
  offset: number;
};

export async function getInstitutionAuthors(
  id: string,
  params: { limit?: number; offset?: number } = {},
): Promise<InstitutionAuthorsPage> {
  const res = await api.get<InstitutionAuthorsPage>(`/works/institutions/${id}/authors`, { params });
  return res.data;
}

export type ChartFilters = {
  yearFrom?: number;
  yearTo?: number;
  domain?: string;
  field?: string;
  is_oa?: boolean;
  /** "YYYY-YYYY,YYYY-YYYY,..." — only meaningful for getStatsTypePeriod. */
  periods?: string;
};

export async function getStatsByYear(filters: ChartFilters = {}): Promise<YearStat[]> {
  const res = await api.get<YearStat[]>("/works/stats/by-year", { params: filters });
  return res.data;
}

export async function getStatsByField(filters: ChartFilters = {}): Promise<FieldStat[]> {
  const res = await api.get<FieldStat[]>("/works/stats/by-field", { params: filters });
  return res.data;
}

export async function getStatsByType(filters: ChartFilters = {}): Promise<TypeStat[]> {
  const res = await api.get<TypeStat[]>("/works/stats/by-type", { params: filters });
  return res.data;
}

export async function getStatsScatter(filters: ChartFilters = {}, limit = 500): Promise<ScatterPoint[]> {
  const res = await api.get<ScatterPoint[]>("/works/stats/scatter", { params: { ...filters, limit } });
  return res.data;
}

export async function getStatsOaByYear(filters: ChartFilters = {}): Promise<OaYearStat[]> {
  const res = await api.get<OaYearStat[]>("/works/stats/oa-ratio", { params: filters });
  return res.data;
}

export async function getStatsTypePeriod(filters: ChartFilters = {}): Promise<TypePeriodStat[]> {
  const res = await api.get<TypePeriodStat[]>("/works/stats/type-period", { params: filters });
  return res.data;
}

export async function getStatsApc(filters: ChartFilters = {}): Promise<ApcStat[]> {
  const res = await api.get<ApcStat[]>("/works/stats/apc", { params: filters });
  return res.data;
}
