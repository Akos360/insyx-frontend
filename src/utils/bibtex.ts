import type { WorkDetail } from "../api/works";
import { humanizeAuthors } from "./authorNames";
import { doiUrl, bareDoi } from "./doi";

// "First Middle Last" -> "Last, First Middle" — BibTeX's own author-name
// convention, authors joined with " and ". A single-token name (no space)
// is left as-is rather than guessed at.
function toBibTexName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last}, ${rest}`;
}

function splitAuthors(rawAuthors: string | null): string[] {
  return humanizeAuthors(rawAuthors)
    .split(";")
    .map((n) => n.trim())
    .filter(Boolean);
}

// A short, stable citation key: first author's last name + year — not
// guaranteed globally unique, but that's true of most auto-generated BibTeX
// keys; the user can always rename it before using it in their own .bib file.
function bibtexKey(paper: WorkDetail): string {
  const firstAuthor = splitAuthors(paper.authors)[0];
  const lastName = firstAuthor?.split(/\s+/).pop();
  const slug = (lastName ?? "anon").replace(/[^a-zA-Z0-9]/g, "");
  return `${slug}${paper.publication_year ?? ""}`;
}

// Braces have structural meaning in BibTeX field values (they mark a
// case-preserved span) — stripped here rather than escaped, since a title
// containing literal braces is rare and this keeps the output simple.
function escapeBibTex(value: string): string {
  return value.replace(/[{}]/g, "");
}

/** Builds a BibTeX @article entry from a paper's detail, for the paper page's "Cite" action. */
export function buildBibTeX(paper: WorkDetail): string {
  const authors = splitAuthors(paper.authors).map(toBibTexName).join(" and ");
  const fields: Array<[string, string | undefined]> = [
    ["title", paper.title || undefined],
    ["author", authors || undefined],
    ["year", paper.publication_year ? String(paper.publication_year) : undefined],
    ["journal", paper.source_name ?? undefined],
    // BibTeX's `doi` field conventionally holds just the bare identifier —
    // `url` is where the full link goes.
    ["doi", paper.doi ? bareDoi(paper.doi) : undefined],
    ["url", paper.doi ? doiUrl(paper.doi) : (paper.oa_url ?? undefined)],
  ];
  const lines = fields
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([key, value]) => `  ${key} = {${escapeBibTex(value)}}`);
  return `@article{${bibtexKey(paper)},\n${lines.join(",\n")}\n}`;
}
