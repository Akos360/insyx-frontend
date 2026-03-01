import { api } from "./client";

export type Paper = {
  id: string;
  title: string;
  year: number;
  authors: string[];
  abstract: string;
};

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
