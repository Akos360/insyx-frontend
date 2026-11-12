type Props = {
  open: boolean;
  onToggle: () => void;
  openTitle?: string;
  closedTitle?: string;
};

/**
 * A single chevron button that both opens and closes an adjacent panel —
 * one control, no separate close-only affordance. Points toward the panel
 * when open (click to push it away) and away from it when closed (click to
 * pull it back in). The caller positions this (it only renders the button
 * itself); see `.scFiltersToggleWrap` / `.globePanelToggleWrap` for the two
 * current positioning strategies (static flex gutter vs. absolute overlay).
 */
export default function SidebarToggle({ open, onToggle, openTitle = 'Hide panel', closedTitle = 'Show panel' }: Props) {
  return (
    <button
      type="button"
      className="uiSidebarToggleBtn"
      onClick={onToggle}
      title={open ? openTitle : closedTitle}
      aria-label={open ? openTitle : closedTitle}
    >
      {open ? '›' : '‹'}
    </button>
  );
}
