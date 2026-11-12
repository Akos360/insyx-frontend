import { describe, it, expect } from "vitest";
import { buildBibTeX } from "./bibtex";
import type { WorkDetail } from "../api/works";

function paper(overrides: Partial<WorkDetail> = {}): WorkDetail {
  return {
    institutions: [],
    id: "W123",
    doi: "10.1234/abcd",
    title: "A Study of Things",
    abstract: null,
    publication_year: 2020,
    publication_date: null,
    type: "article",
    language: "en",
    domain: null,
    field: null,
    subfield: null,
    primary_topic: null,
    keywords: null,
    cited_by_count: 12,
    referenced_works_count: null,
    is_oa: false,
    oa_url: null,
    pdf_url: null,
    license: null,
    source_name: "Journal of Things",
    source_type: null,
    num_authors: null,
    apc_usd: null,
    authors: "Jane Doe; John A. Smith",
    ...overrides,
  };
}

describe("buildBibTeX", () => {
  it("builds an @article entry with title/author/year/journal/doi/url", () => {
    const bib = buildBibTeX(paper());
    expect(bib).toContain("@article{Doe2020,");
    expect(bib).toContain("title = {A Study of Things}");
    expect(bib).toContain("author = {Doe, Jane and Smith, John A.}");
    expect(bib).toContain("year = {2020}");
    expect(bib).toContain("journal = {Journal of Things}");
    expect(bib).toContain("doi = {10.1234/abcd}");
    expect(bib).toContain("url = {https://doi.org/10.1234/abcd}");
  });

  it("falls back to the open-access URL when there is no DOI", () => {
    const bib = buildBibTeX(paper({ doi: null, oa_url: "https://example.com/paper.pdf" }));
    expect(bib).not.toContain("doi =");
    expect(bib).toContain("url = {https://example.com/paper.pdf}");
  });

  it("omits fields with no value instead of printing an empty field", () => {
    const bib = buildBibTeX(paper({ source_name: null, doi: null, oa_url: null }));
    expect(bib).not.toContain("journal =");
    expect(bib).not.toContain("url =");
    expect(bib).not.toContain("doi =");
  });

  it("strips braces from field values so they can't break the BibTeX structure", () => {
    const bib = buildBibTeX(paper({ title: "A {weird} title" }));
    expect(bib).toContain("title = {A weird title}");
  });

  it("falls back to a bare key when there are no authors at all", () => {
    const bib = buildBibTeX(paper({ authors: null }));
    expect(bib).toContain("@article{anon2020,");
  });
});
