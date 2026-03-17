import "./paper-page.css";

export default function PaperPage() {
  return (
    <main className="paperPage">
      <section className="paperPageCard">
        <div className="paperPageHeader">
          <p className="paperPageEyebrow">Paper</p>
          <h1 className="paperPageTitle">Paper Details</h1>
        </div>
        <div className="paperPageContent">
          <div className="paperPageBlock">Title and metadata placeholder</div>
          <div className="paperPageBlock">Abstract placeholder</div>
          <div className="paperPageBlock">References and citations placeholder</div>
        </div>
      </section>
    </main>
  );
}
