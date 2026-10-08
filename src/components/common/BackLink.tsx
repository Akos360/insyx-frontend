import { Link, useNavigate } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";

type BackLinkProps = {
  /** Destination route. Omit to go back in browser history instead (e.g. a paper opened from search). */
  to?: string;
  label: string;
};

/** Shared "← back to X" navigation link, used consistently across list/detail pages. */
export default function BackLink({ to, label }: BackLinkProps) {
  const navigate = useNavigate();

  const content = (
    <>
      <LuArrowLeft aria-hidden="true" />
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="uiBackLink">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="uiBackLink" onClick={() => navigate(-1)}>
      {content}
    </button>
  );
}
