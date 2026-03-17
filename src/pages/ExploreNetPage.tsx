import "./explore-net-page.css";

export default function ExploreNetPage() {
  return (
    <main className="exploreNetPage">
      <section className="exploreNetPageCard">
        <div className="exploreNetPageHeader">
          <p className="exploreNetPageEyebrow">Explore Net</p>
          <h1 className="exploreNetPageTitle">Network View</h1>
        </div>
        <div className="exploreNetPageContent">
          <div className="exploreNetPageBlock exploreNetPageBlockLarge">Graph canvas placeholder</div>
          <div className="exploreNetPageBlock">Node details placeholder</div>
          <div className="exploreNetPageBlock">Controls placeholder</div>
        </div>
      </section>
    </main>
  );
}
