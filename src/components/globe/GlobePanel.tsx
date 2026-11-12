import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { IoClose, IoChevronBack, IoChevronDown, IoSearch } from "react-icons/io5";
import { BsBuilding, BsFileText, BsGlobe, BsPerson, BsArrowUpRightSquare } from "react-icons/bs";
import {
  searchInstitutions as apiSearchInstitutions,
  getInstitutionWorks,
  getInstitutionAuthors,
  searchWorks,
  getWork,
  countryFlag,
  type InstitutionSummary,
  type InstitutionAuthor,
  type Work,
} from "../../api/works";
import { humanizeAuthors } from "../../utils/authorNames";
import { doiUrl } from "../../utils/doi";
import Highlight from "../common/Highlight";
import type { ClickedInstitution } from "./MapGlobe";
import "./GlobePanel.css";

type NavEntry =
  | { kind: "home" }
  | {
      kind: "institution";
      inst: ClickedInstitution;
      works: Work[] | null;
      authors: InstitutionAuthor[] | null;
      loading: boolean;
    }
  | { kind: "work"; workId: string };

type GlobePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  clickedInstitution: ClickedInstitution | null;
};

export default function GlobePanel({ isOpen, onClose, clickedInstitution }: GlobePanelProps) {
  const navigate = useNavigate();
  const [nav, setNav]               = useState<NavEntry[]>([{ kind: "home" }]);
  const [query, setQuery]           = useState("");
  const [instResults, setInstResults] = useState<InstitutionSummary[]>([]);
  const [workResults, setWorkResults] = useState<Work[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = nav[nav.length - 1];

  useEffect(() => {
    if (!clickedInstitution) return;
    const entry: NavEntry = {
      kind: "institution",
      inst: clickedInstitution,
      works: null,
      authors: null,
      loading: true,
    };
    setNav([{ kind: "home" }, entry]);
    fetchInstitutionData(clickedInstitution.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedInstitution?.id]);

  function push(entry: NavEntry) {
    setNav((prev) => [...prev, entry]);
  }

  function back() {
    setNav((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function fetchInstitutionData(id: string) {
    Promise.allSettled([getInstitutionWorks(id), getInstitutionAuthors(id)]).then(
      ([worksResult, authorsResult]) => {
        setNav((prev) => {
          const last = prev[prev.length - 1];
          if (last.kind !== "institution" || last.inst.id !== id) return prev;
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              // Just the first page — this compact panel isn't meant for
              // exhaustive browsing, "View full institution page" is.
              works: worksResult.status === "fulfilled" ? worksResult.value.items : [],
              authors: authorsResult.status === "fulfilled" ? authorsResult.value.items : [],
              loading: false,
            },
          ];
        });
      },
    );
  }

  function openInstitution(summary: InstitutionSummary) {
    const inst: ClickedInstitution = {
      id: summary.id,
      name: summary.name,
      workCount: summary.workCount,
      // Not available on a search result (only on a map-click) — the author
      // list fetched just below fills in the real count once it loads.
      authorCount: 0,
      citationCount: summary.citationCount,
      countryCode: summary.countryCode,
    };
    const entry: NavEntry = { kind: "institution", inst, works: null, authors: null, loading: true };
    push(entry);
    fetchInstitutionData(inst.id);
  }

  function openWork(id: string) {
    push({ kind: "work", workId: id });
  }

  function handleQueryChange(q: string) {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setInstResults([]);
      setWorkResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [insts, worksPage] = await Promise.all([
          apiSearchInstitutions(q),
          searchWorks({ search: q, limit: 20 }),
        ]);
        setInstResults(insts);
        setWorkResults(worksPage.items);
      } catch {
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }

  const showHome        = current.kind === "home" && !query.trim();
  const showResults     = current.kind === "home" && query.trim().length > 0;
  const showInstitution = current.kind === "institution";
  const showWork        = current.kind === "work";

  function panelTitle() {
    if (current.kind === "institution") return current.inst.name;
    if (current.kind === "work")        return "Paper details";
    if (query.trim())                   return "Search results";
    return "Explorer";
  }

  return (
    <div className={`globePanel${isOpen ? " globePanelOpen" : ""}`}>
      <div className="globePanelHeader">
        {nav.length > 1 ? (
          <button className="globePanelIconBtn" onClick={back} title="Back">
            <IoChevronBack size={16} />
          </button>
        ) : (
          <span className="globePanelIconBtn" />
        )}
        <span className="globePanelTitle">{panelTitle()}</span>
        <button className="globePanelIconBtn" onClick={onClose} title="Close">
          <IoClose size={16} />
        </button>
      </div>

      <div className="globePanelSearchBar">
        {isSearching
          ? <span className="globePanelSpinner" />
          : <IoSearch size={14} className="globePanelSearchIcon" />
        }
        <input
          className="globePanelSearchInput"
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search institutions & papers…"
        />
        {query && (
          <button className="globePanelSearchClear" onClick={() => handleQueryChange("")}>
            <IoClose size={12} />
          </button>
        )}
      </div>

      <div className="globePanelBody">
        {showHome && <HomeView />}
        {showResults && (
          <ResultsView
            institutions={instResults}
            works={workResults}
            query={query}
            onInstitutionClick={openInstitution}
            onWorkClick={openWork}
          />
        )}
        {showInstitution && current.kind === "institution" && (
          <InstitutionView
            // Remounts fresh on every new institution, so Papers/Authors
            // always come up open by default rather than keeping whichever
            // one you last collapsed on a different institution.
            key={current.inst.id}
            inst={current.inst}
            works={current.works}
            authors={current.authors}
            loading={current.loading}
            onWorkClick={openWork}
            onAuthorClick={(authorId) => navigate(`/author/${authorId}`)}
            onOpenFullPage={() => navigate(`/institution/${current.inst.id}`)}
          />
        )}
        {showWork && current.kind === "work" && (
          <WorkView workId={current.workId} />
        )}
      </div>
    </div>
  );
}

function HomeView() {
  return (
    <div className="globePanelEmpty">
      <BsGlobe size={36} className="globePanelEmptyIcon" />
      <p>Search for institutions or papers above, or click any point on the map.</p>
    </div>
  );
}

function ResultsView({
  institutions,
  works,
  query,
  onInstitutionClick,
  onWorkClick,
}: {
  institutions: InstitutionSummary[];
  works: Work[];
  query: string;
  onInstitutionClick: (i: InstitutionSummary) => void;
  onWorkClick: (id: string) => void;
}) {
  const empty = institutions.length === 0 && works.length === 0;
  return (
    <div>
      {empty && <p className="globePanelEmptyText">No results found.</p>}

      {institutions.length > 0 && (
        <section className="globePanelSection">
          <h4 className="globePanelSectionTitle">
            Institutions <span className="globePanelCount">{institutions.length}</span>
          </h4>
          {institutions.map((inst) => (
            <button key={inst.id} className="globePanelCard" onClick={() => onInstitutionClick(inst)}>
              <BsBuilding size={13} className="globePanelCardIcon" />
              <div className="globePanelCardText">
                <span className="globePanelCardName"><Highlight text={inst.name} query={query} /></span>
                <span className="globePanelCardMeta">
                  {inst.countryCode && <>{inst.countryCode} · </>}
                  {inst.workCount} works · {inst.citationCount.toLocaleString()} citations
                </span>
              </div>
            </button>
          ))}
        </section>
      )}

      {works.length > 0 && (
        <section className="globePanelSection">
          <h4 className="globePanelSectionTitle">
            Papers <span className="globePanelCount">{works.length}</span>
          </h4>
          {works.map((work) => (
            <button key={work.id} className="globePanelCard" onClick={() => onWorkClick(work.id)}>
              <BsFileText size={13} className="globePanelCardIcon" />
              <div className="globePanelCardText">
                <span className="globePanelCardName"><Highlight text={work.title} query={query} /></span>
                <span className="globePanelCardMeta">
                  {work.publication_year}
                  {work.cited_by_count > 0 && <> · {work.cited_by_count.toLocaleString()} citations</>}
                </span>
              </div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

// Papers and Authors each open by default (per the per-institution `key` on
// InstitutionView) but collapse independently, so e.g. collapsing a long
// Papers list leaves Authors visible without scrolling past it.
function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="globePanelSection">
      <button
        type="button"
        className="globePanelSectionHeaderBtn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="globePanelSectionTitle">
          {title} {count !== undefined && <span className="globePanelCount">{count}</span>}
        </span>
        <IoChevronDown
          size={13}
          className={`globePanelSectionChevron${open ? "" : " globePanelSectionChevronClosed"}`}
        />
      </button>
      {open && children}
    </section>
  );
}

function InstitutionView({
  inst,
  works,
  authors,
  loading,
  onWorkClick,
  onAuthorClick,
  onOpenFullPage,
}: {
  inst: ClickedInstitution;
  works: Work[] | null;
  authors: InstitutionAuthor[] | null;
  loading: boolean;
  onWorkClick: (id: string) => void;
  onAuthorClick: (authorId: string) => void;
  onOpenFullPage: () => void;
}) {
  return (
    <div>
      <div className="globePanelStats">
        <div className="globePanelStat">
          <span className="globePanelStatVal">{inst.workCount}</span>
          <span className="globePanelStatLabel">Works</span>
        </div>
        <div className="globePanelStat">
          <span className="globePanelStatVal">{inst.citationCount.toLocaleString()}</span>
          <span className="globePanelStatLabel">Citations</span>
        </div>
        {inst.countryCode && (
          <div className="globePanelStat">
            <span className="globePanelStatVal">{inst.countryCode}</span>
            <span className="globePanelStatLabel">Country</span>
          </div>
        )}
      </div>

      <button className="globePanelOpenFullBtn" onClick={onOpenFullPage}>
        <BsArrowUpRightSquare size={13} />
        View full institution page
      </button>

      <CollapsibleSection title="Papers" count={works?.length}>
        {loading && <p className="globePanelEmptyText">Loading…</p>}
        {!loading && works?.length === 0 && <p className="globePanelEmptyText">No papers found.</p>}
        {!loading && works?.map((work) => (
          <button key={work.id} className="globePanelCard" onClick={() => onWorkClick(work.id)}>
            <BsFileText size={13} className="globePanelCardIcon" />
            <div className="globePanelCardText">
              <span className="globePanelCardName">{work.title}</span>
              <span className="globePanelCardMeta">
                {work.publication_year}
                {work.cited_by_count > 0 && <> · {work.cited_by_count.toLocaleString()} citations</>}
              </span>
            </div>
          </button>
        ))}
      </CollapsibleSection>

      <CollapsibleSection title="Authors" count={authors?.length}>
        {loading && <p className="globePanelEmptyText">Loading…</p>}
        {!loading && authors?.length === 0 && <p className="globePanelEmptyText">No authors found.</p>}
        {!loading && authors?.map((author) => (
          <button
            key={author.author_id}
            className="globePanelCard"
            onClick={() => onAuthorClick(author.author_id)}
          >
            <BsPerson size={13} className="globePanelCardIcon" />
            <div className="globePanelCardText">
              <span className="globePanelCardName">
                {countryFlag(author.country_code)} {humanizeAuthors(author.display_name) || author.author_id}
              </span>
              <span className="globePanelCardMeta">
                {author.works_count} {author.works_count === 1 ? "work" : "works"}
                {author.cited_by_count > 0 && <> · {author.cited_by_count.toLocaleString()} citations</>}
              </span>
            </div>
          </button>
        ))}
      </CollapsibleSection>
    </div>
  );
}

function WorkView({ workId }: { workId: string }) {
  // isPending (not isLoading): see SearchPage.tsx for why, under
  // PersistQueryClientProvider.
  const { data: paper, isPending, isError } = useQuery({
    queryKey: ['works', 'detail', workId],
    queryFn: () => getWork(workId),
  });

  if (isPending) return <p className="globePanelEmptyText">Loading…</p>;
  if (isError || !paper) return <p className="globePanelEmptyText">Paper not found.</p>;

  return (
    <div className="globePanelWorkDetail">
      <h3 className="globePanelWorkTitle">{paper.title}</h3>

      <div className="globePanelWorkMeta">
        {paper.publication_year && <span>{paper.publication_year}</span>}
        {paper.cited_by_count > 0 && <span>{paper.cited_by_count.toLocaleString()} citations</span>}
        {paper.source_name && <span>{paper.source_name}</span>}
        {paper.is_oa && <span className="globePanelOaBadge">Open Access</span>}
      </div>

      {paper.authors && (
        <p className="globePanelWorkAuthors">{humanizeAuthors(paper.authors)}</p>
      )}

      {(paper.domain || paper.field || paper.subfield) && (
        <div className="globePanelTags">
          {paper.domain   && <span className="globePanelTag">{paper.domain}</span>}
          {paper.field    && <span className="globePanelTag">{paper.field}</span>}
          {paper.subfield && <span className="globePanelTag">{paper.subfield}</span>}
        </div>
      )}

      {paper.abstract && (
        <div className="globePanelAbstractSection">
          <h4 className="globePanelSectionTitle">Abstract</h4>
          <p className="globePanelAbstract">{paper.abstract}</p>
        </div>
      )}

      <div className="globePanelWorkLinks">
        {paper.doi && (
          <a href={doiUrl(paper.doi)} target="_blank" rel="noopener noreferrer" className="globePanelLink">
            DOI ↗
          </a>
        )}
        {paper.pdf_url && (
          <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="globePanelLink">
            PDF ↗
          </a>
        )}
        {paper.is_oa && paper.oa_url && (
          <a href={paper.oa_url} target="_blank" rel="noopener noreferrer" className="globePanelLink globePanelLinkOa">
            Open Access ↗
          </a>
        )}
      </div>
    </div>
  );
}
