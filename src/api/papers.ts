import { api } from "./client";

export type Paper = {
  id: string;
  doi: string;
  title: string;
  publicationYear: number;
  publicationDate: string;
  type: string;
  language: string;
  citedByCount: number;
  referencedWorksCount: number;
  domain: string;
  field: string;
  subfield: string;
  primaryTopic: string;
  topics: string;
  concepts: string;
  keywords: string;
  abstract: string;
  isOa: boolean;
  oaUrl: string;
  sourceName: string;
  sourceType: string;
  numAuthors: number;
  authors: string;
  authorIds: string;
  license: string;
  pdfUrl: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAllPapers() {
  const res = await api.get<Paper[]>("/papers");
  return res.data;
}

export async function getPaper(id: string) {
  const res = await api.get<Paper>(`/papers/${id}`);
  return res.data;
}

export async function fetchNeighborhood(id: string, limit = 200) {
  const res = await api.get(`/graph/papers/${id}/neighborhood`, {
    params: { limit },
  });
  return res.data;
}
