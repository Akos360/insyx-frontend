import { Fragment } from 'react';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type Props = {
  text: string;
  query: string;
};

/** Wraps every case-insensitive occurrence of `query` inside `text` in a
 * <mark>, so a search result visibly shows where the match actually is —
 * e.g. a title, author/institution name, or an abstract snippet. */
export default function Highlight({ text, query }: Props) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'gi'));
  if (parts.length === 1) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase()
          ? <mark key={i} className="uiHighlight">{part}</mark>
          : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
