import { api } from "./client";

export async function fetchPaper(id: string) {
  const res = await api.get(`/papers/${id}`);
  return res.data;
}

export async function fetchNeighborhood(id: string, limit = 200) {
  const res = await api.get(`/graph/papers/${id}/neighborhood`, {
    params: { limit },
  });
  return res.data;
}
