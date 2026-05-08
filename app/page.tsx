export default function Home() {
  return (
    <main style={{ minHeight: '60vh', padding: '80px 24px', textAlign: 'center' }}>
      <h1
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 'clamp(48px, 8vw, 96px)',
          color: 'var(--cream)',
          letterSpacing: '-1px',
          lineHeight: 0.95,
          marginBottom: 16,
        }}
      >
        TRAIN YOUR <span style={{ color: 'var(--amber)' }}>RHYTHM.</span>
      </h1>
      <p
        style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 18,
          color: 'var(--muted)',
          maxWidth: 560,
          margin: '0 auto',
        }}
      >
        Landing kommt im nächsten Commit — Nav + Footer stehen schon.
      </p>
    </main>
  );
}
