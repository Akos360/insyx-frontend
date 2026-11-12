// OpenAlex's own `doi` field is already a full https://doi.org/... URL, not
// a bare identifier — these normalize either direction instead of assuming
// one and double-prefixing (confirmed live: W2125849100's doi is
// "https://doi.org/10.48550/arxiv.1302.4245").
export function doiUrl(doi: string): string {
  return /^https?:\/\//i.test(doi) ? doi : `https://doi.org/${doi}`;
}

export function bareDoi(doi: string): string {
  return doi.replace(/^https?:\/\/doi\.org\//i, "");
}
