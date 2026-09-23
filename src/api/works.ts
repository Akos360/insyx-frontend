import { api } from "./client";

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
};

export type WorksPage = {
  items: Work[];
  total: number;
  limit: number;
  offset: number;
};

export type WorksQuery = {
  search?: string;
  field?: string;
  yearFrom?: number;
  yearTo?: number;
  is_oa?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "title" | "authors" | "publicationYear" | "field" | "citedByCount";
  sortDir?: "asc" | "desc";
};

export async function searchWorks(query: WorksQuery): Promise<WorksPage> {
  const res = await api.get<WorksPage>("/works", { params: query });
  return res.data;
}

export async function getWorkFields(): Promise<string[]> {
  const res = await api.get<string[]>("/works/fields");
  return res.data;
}
