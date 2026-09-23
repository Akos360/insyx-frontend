// The seeded lakehouse demo data (insyx-database, a separate repo we don't edit)
// generates placeholder author names as "Author 114", "Author 1876", etc. This maps
// each placeholder to a deterministic, readable display name — same number always
// renders the same name, purely a presentation-layer transform, no data is changed.

const FIRST_NAMES = [
  "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
  "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Wei", "Fatima", "Hiroshi", "Priya",
  "Carlos", "Anna", "Ahmed", "Yuki", "Elena", "Mohammed", "Sofia", "Chen",
  "Ingrid", "Kwame", "Aisha", "Lars", "Mei", "Diego", "Nadia", "Erik",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson",
  "Martin", "Lee", "Perez", "Thompson", "Nguyen", "Kim", "Patel", "Kowalski",
  "Müller", "Rossi", "Dubois", "Silva", "Andersson", "Ivanov", "Yamamoto", "Wang",
  "Schmidt", "Okafor", "Haddad", "Larsen", "Zhang", "Fernandez", "Khan", "Nilsson",
];

const AUTHOR_PLACEHOLDER = /^Author\s+(\d+)$/i;

function humanizeOne(name: string): string {
  const match = name.trim().match(AUTHOR_PLACEHOLDER);
  if (!match) return name;

  const n = Number(match[1]);
  const first = FIRST_NAMES[(n * 7) % FIRST_NAMES.length];
  const last = LAST_NAMES[(n * 13) % LAST_NAMES.length];
  return `${first} ${last}`;
}

/** Humanizes a single name, or a "Name A; Name B; Name C" semicolon-joined list. */
export function humanizeAuthors(authors: string | null | undefined): string {
  if (!authors) return "";
  return authors
    .split(";")
    .map((part) => humanizeOne(part))
    .join("; ");
}
