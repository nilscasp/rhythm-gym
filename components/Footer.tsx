import type { Brand } from '../app/lib/brand';

export function Footer({ brand = 'gym' }: { brand?: Brand }) {
  const isSchule = brand === 'schule';

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
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            letterSpacing: isSchule ? 0.5 : 3,
            color: 'var(--muted)',
          }}
        >
          {isSchule ? (
            'Handpan Schule des Lebens'
          ) : (
            <>
              RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span>
            </>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--muted)' }}>
          {isSchule ? (
            <>
              Die Lern-App der{' '}
              <a
                href="https://handpan.schule"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--muted)' }}
              >
                Handpan Schule des Lebens
              </a>
            </>
          ) : (
            <>
              Ein Projekt von{' '}
              <a
                href="https://handpan.schule"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--muted)' }}
              >
                handpan.schule
              </a>{' '}
              — Handpan Schule des Lebens
            </>
          )}
        </p>

        {/* Gym: --border ist ein sattes Braun. Unter der Schule ist --border
            12%-Gold und damit unlesbar — dort trägt --muted die Zeile. */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: isSchule ? 'var(--muted)' : 'var(--border)',
            fontSize: 12,
          }}
        >
          © {new Date().getFullYear()} Nils Caspar Böhm · Eching
        </p>
      </div>

      <style>{`
        footer a:hover { color: var(--amber) !important; }
      `}</style>
    </footer>
  );
}
