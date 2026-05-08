export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '40px 24px',
        marginTop: 80,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: 16,
            letterSpacing: 3,
            color: 'var(--muted)',
          }}
        >
          RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span>
        </div>

        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: 'var(--muted)' }}>
          Ein Projekt von{' '}
          <a
            href="https://nilscaspar.de"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--muted)' }}
          >
            nilscaspar.de
          </a>{' '}
          — Handpan Schule des Lebens
        </p>

        <p style={{ fontFamily: "'Barlow', sans-serif", color: 'var(--border)', fontSize: 12 }}>
          © {new Date().getFullYear()} Nils Caspar Böhm · Eching
        </p>
      </div>

      <style>{`
        footer a:hover { color: var(--amber) !important; }
      `}</style>
    </footer>
  );
}
