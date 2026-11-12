import { describe, it, expect } from "vitest";
import { doiUrl, bareDoi } from "./doi";

describe("doiUrl", () => {
  it("leaves an already-full URL (OpenAlex's own convention) unchanged", () => {
    expect(doiUrl("https://doi.org/10.48550/arxiv.1302.4245")).toBe(
      "https://doi.org/10.48550/arxiv.1302.4245",
    );
  });

  it("prefixes a bare DOI", () => {
    expect(doiUrl("10.1234/abcd")).toBe("https://doi.org/10.1234/abcd");
  });
});

describe("bareDoi", () => {
  it("strips the https://doi.org/ prefix when present", () => {
    expect(bareDoi("https://doi.org/10.48550/arxiv.1302.4245")).toBe("10.48550/arxiv.1302.4245");
  });

  it("leaves an already-bare DOI unchanged", () => {
    expect(bareDoi("10.1234/abcd")).toBe("10.1234/abcd");
  });
});
