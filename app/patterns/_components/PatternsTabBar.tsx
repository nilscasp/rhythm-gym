import Link from 'next/link'

type Tab = 'kurse' | 'bibliothek' | 'meine'

export function PatternsTabBar({ active }: { active: Tab }) {
  return (
    <>
      <style>{TABS_CSS}</style>
      <nav className="pt-tabs" aria-label="Patterns-Bereiche">
        <Link
          href="/patterns"
          className={active === 'kurse' ? 'pt-tab pt-tab--active' : 'pt-tab'}
          aria-current={active === 'kurse' ? 'page' : undefined}
        >
          <span className="pt-tab-num">01</span>
          <span className="pt-tab-label">Kurse</span>
        </Link>
        <Link
          href="/patterns/bibliothek"
          className={active === 'bibliothek' ? 'pt-tab pt-tab--active' : 'pt-tab'}
          aria-current={active === 'bibliothek' ? 'page' : undefined}
        >
          <span className="pt-tab-num">02</span>
          <span className="pt-tab-label">Pattern-Bibliothek</span>
        </Link>
        <Link
          href="/patterns/meine"
          className={active === 'meine' ? 'pt-tab pt-tab--active' : 'pt-tab'}
          aria-current={active === 'meine' ? 'page' : undefined}
        >
          <span className="pt-tab-num">03</span>
          <span className="pt-tab-label">Meine Patterns</span>
        </Link>
      </nav>
    </>
  )
}

const TABS_CSS = `
  .pt-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border);
    margin: 0 0 32px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .pt-tab {
    display: inline-flex;
    align-items: baseline;
    gap: 10px;
    padding: 16px 24px;
    text-decoration: none;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
  }
  .pt-tab:hover { color: var(--cream); }
  .pt-tab--active {
    color: var(--amber);
    border-bottom-color: var(--amber);
  }
  .pt-tab-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.7;
  }
  .pt-tab-label {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  @media (max-width: 480px) {
    .pt-tab { padding: 14px 16px; }
    .pt-tab-label { font-size: 16px; }
  }
`
