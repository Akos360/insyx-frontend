import { api } from './client';
import type { Paper } from './papers';

export type AuthorSummary = {
  authorId: string;
  displayName: string;
  firstInstitutionName: string | null;
  countryCode: string | null;
  orcid: string | null;
  paperCount: string; // raw COUNT comes back as string
};

export type AuthorRecord = {
  paperId: string;
  authorId: string;
  displayName: string;
  orcid: string | null;
  firstInstitutionId: string | null;
  firstInstitutionName: string | null;
  countryCode: string | null;
  institutionsFull: any;
  institutionsRaw: any;
  publicationYear: number;
  publicationDate: string;
  paper?: Paper;
};

export async function getAllAuthors(): Promise<AuthorSummary[]> {
  const res = await api.get<AuthorSummary[]>('/authors');
  return res.data;
}

export async function getAuthorRecords(authorId: string): Promise<AuthorRecord[]> {
  const res = await api.get<AuthorRecord[]>(`/authors/${authorId}`);
  return res.data;
}

export async function getAuthorsByPaper(paperId: string): Promise<AuthorRecord[]> {
  const res = await api.get<AuthorRecord[]>(`/authors/paper/${paperId}`);
  return res.data;
}

/** Converts ISO 3166-1 alpha-2 country code to a flag emoji. */
export function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const offset = 127397;
  return [...code.toUpperCase()].map(c => String.fromCodePoint(c.charCodeAt(0) + offset)).join('');
}
