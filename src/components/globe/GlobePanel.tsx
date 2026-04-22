import { useState, useEffect, useRef } from "react";
import { IoClose, IoChevronBack, IoSearch } from "react-icons/io5";
import { BsBuilding, BsFileText, BsGlobe } from "react-icons/bs";
import {
  searchInstitutions as apiSearchInstitutions,
  getInstitutionWorks,
  type InstitutionSummary,
} from "../../api/institutions";
import { searchPapers, type Paper } from "../../api/papers";
import type { ClickedInstitution } from "./MapGlobe";
import "./GlobePanel.css";

// ---------------------------------------------------------------------------
// Navigation stack types
// ---------------------------------------------------------------------------

type NavEntry =
  | { kind: "home" }
  | { kind: "institution"; inst: ClickedInstitution; works: Paper[] | null; loading: boolean }
  | { kind: "work"; paper: Paper };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type GlobePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  clickedInstitution: ClickedInstitution | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlobePanel({ isOpen, onClose, clickedInstitution }: GlobePanelProps) {
  const [nav, setNav]               = useState<NavEntry[]>([{ kind: "home" }]);
  const [query, setQuery]           = useState("");
  const [instResults, setInstResults] = useState<InstitutionSummary[]>([]);
  const [paperResults, setPaperResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = nav[nav.length - 1];

  // When a map point is clicked, navigate to that institution
  useEffect(() => {
    if (!clickedInstitution) return;
    const entry: NavEntry = { kind: "institution", inst: clickedInstitution, works: null, loading: true };
    setNav([{ kind: "home" }, entry]);
    fetchWorks(clickedInstitution.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedInstitution?.id]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  function push(entry: NavEntry) {
    setNav((prev) => [...prev, entry]);
  }

  function back() {
    setNav((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function fetchWorks(id: string) {
    getInstitutionWorks(id)
      .then((works) => {
        setNav((prev) => {
          const last = prev[prev.length - 1];
          if (last.kind === "institution" && last.inst.id === id) {
            return [...prev.slice(0, -1), { ...last, works, loading: false }];
          }
          return prev;
        });
      })
      .catch(() => {
        setNav((prev) => {
          const last = prev[prev.length - 1];
          if (last.kind === "institution" && last.inst.id === id) {
            return [...prev.slice(0, -1), { ...last, works: [], loading: false }];
          }
          return prev;
        });
      });
  }

  function openInstitution(summary: InstitutionSummary) {
    const inst: ClickedInstitution = {
      id: summary.id,
      name: summary.name,
      workCount: summary.workCount,
      citationCount: summary.citationCount,
      countryCode: summary.countryCode,
    };
    const entry: NavEntry = { kind: "institution", inst, works: null, loading: true };
    push(entry);
    fetchWorks(inst.id);
  }

  function openWork(paper: Paper) {
    push({ kind: "work", paper });
  }

  // ---------------------------------------------------------------------------
  // Debounced search
  // ---------------------------------------------------------------------------

  function handleQueryChange(q: string) {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setInstResults([]);
      setPaperResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const [insts, papers] = await Promise.all([
          apiSearchInstitutions(q),
          searchPapers(q),
        ]);
        setInstResults(insts);
        setPaperResults(papers);
      } catch {
        // silently ignore
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }

  // ---------------------------------------------------------------------------
  // Derived display state
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={`globePanel${isOpen ? " globePanelOpen" : ""}`}>
      {/* Header */}
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

      {/* Search bar */}
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

      {/* Scrollable content */}
      <div className="globePanelBody">
        {showHome && <HomeView />}
        {showResults && (
          <ResultsView
            institutions={instResults}
            papers={paperResults}
            onInstitutionClick={openInstitution}
            onPaperClick={openWork}
          />
        )}
        {showInstitution && current.kind === "institution" && (
          <InstitutionView
            inst={current.inst}
            works={current.works}
            loading={current.loading}
            onPaperClick={openWork}
          />
        )}
        {showWork && current.kind === "work" && (
          <WorkView paper={current.paper} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

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
  papers,
  onInstitutionClick,
  onPaperClick,
}: {
  institutions: InstitutionSummary[];
  papers: Paper[];
  onInstitutionClick: (i: InstitutionSummary) => void;
  onPaperClick: (p: Paper) => void;
}) {
  const empty = institutions.length === 0 && papers.length === 0;
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
                <span className="globePanelCardName">{inst.name}</span>
                <span className="globePanelCardMeta">
                  {inst.countryCode && <>{inst.countryCode} · </>}
                  {inst.workCount} works · {inst.citationCount.toLocaleString()} citations
                </span>
              </div>
            </button>
          ))}
        </section>
      )}

      {papers.length > 0 && (
        <section className="globePanelSection">
          <h4 className="globePanelSectionTitle">
            Papers <span className="globePanelCount">{papers.length}</span>
          </h4>
          {papers.map((paper) => (
            <button key={paper.id} className="globePanelCard" onClick={() => onPaperClick(paper)}>
              <BsFileText size={13} className="globePanelCardIcon" />
              <div className="globePanelCardText">
                <span className="globePanelCardName">{paper.title}</span>
                <span className="globePanelCardMeta">
                  {paper.publicationYear}
                  {paper.citedByCount > 0 && <> · {paper.citedByCount.toLocaleString()} citations</>}
                </span>
              </div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}

function InstitutionView({
  inst,
  works,
  loading,
  onPaperClick,
}: {
  inst: ClickedInstitution;
  works: Paper[] | null;
  loading: boolean;
  onPaperClick: (p: Paper) => void;
}) {
  return (
    <div>
      {/* Stats row */}
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

      {/* Works list */}
      <section className="globePanelSection">
        <h4 className="globePanelSectionTitle">Papers</h4>
        {loading && <p className="globePanelEmptyText">Loading…</p>}
        {!loading && works?.length === 0 && <p className="globePanelEmptyText">No papers found.</p>}
        {!loading && works?.map((paper) => (
          <button key={paper.id} className="globePanelCard" onClick={() => onPaperClick(paper)}>
            <BsFileText size={13} className="globePanelCardIcon" />
            <div className="globePanelCardText">
              <span className="globePanelCardName">{paper.title}</span>
              <span className="globePanelCardMeta">
                {paper.publicationYear}
                {paper.citedByCount > 0 && <> · {paper.citedByCount.toLocaleString()} citations</>}
              </span>
            </div>
          </button>
        ))}
      </section>
    </div>
  );
}

function WorkView({ paper }: { paper: Paper }) {
  return (
    <div className="globePanelWorkDetail">
      <h3 className="globePanelWorkTitle">{paper.title}</h3>

      <div className="globePanelWorkMeta">
        {paper.publicationYear && <span>{paper.publicationYear}</span>}
        {paper.citedByCount > 0 && <span>{paper.citedByCount.toLocaleString()} citations</span>}
        {paper.sourceName && <span>{paper.sourceName}</span>}
        {paper.isOa && <span className="globePanelOaBadge">Open Access</span>}
      </div>

      {paper.authors && (
        <p className="globePanelWorkAuthors">{paper.authors}</p>
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
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="globePanelLink">
            DOI ↗
          </a>
        )}
        {paper.pdfUrl && (
          <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="globePanelLink">
            PDF ↗
          </a>
        )}
        {paper.isOa && paper.oaUrl && (
          <a href={paper.oaUrl} target="_blank" rel="noopener noreferrer" className="globePanelLink globePanelLinkOa">
            Open Access ↗
          </a>
        )}
      </div>
    </div>
  );
}
