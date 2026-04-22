import { api } from "./client";
import type { Paper } from "./papers";

export interface InstitutionProperties {
  name: string;
  workCount: number;
  citationCount: number;
  /** Normalized score 0–1 relative to the top institution in the current dataset */
  score: number;
  countryCode: string;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  countryCode: string;
  workCount: number;
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
  const res = await api.get<InstitutionFeatureCollection>("/institutions/map", { params });
  return res.data;
}

export async function searchInstitutions(q: string): Promise<InstitutionSummary[]> {
  const res = await api.get<InstitutionSummary[]>("/institutions/search", { params: { q } });
  return res.data;
}

export async function getInstitutionWorks(id: string): Promise<Paper[]> {
  const res = await api.get<Paper[]>("/institutions/works", { params: { id } });
  return res.data;
}
