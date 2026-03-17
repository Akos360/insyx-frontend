import "./search-page.css";

export default function SearchPage() {
  return (
    <main className="searchPage">
      <section className="searchPageCard">
        <div className="searchPageHeader">
          <p className="searchPageEyebrow">Search</p>
          <h1 className="searchPageTitle">Search Workspace</h1>
        </div>
        <div className="searchPageContent">
          <div className="searchPageBlock">Search input placeholder</div>
          <div className="searchPageBlock">Filters placeholder</div>
          <div className="searchPageBlock">Results list placeholder</div>
        </div>
      </section>
    </main>
  );
}
