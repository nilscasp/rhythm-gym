import Link from 'next/link'

export default function Home() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@300;400;600&family=Barlow+Condensed:wght@300;400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --black: #0A0907;
          --amber: #F5A623;
          --amber2: #E8920F;
          --cream: #F5EDD8;
          --muted: #7A7060;
          --border: #2E2A1E;
          --text: #D4C9AD;
        }
        body { background: var(--black); }
        .anton { font-family: 'Anton', sans-serif; }
        .barlow { font-family: 'Barlow', sans-serif; }
        .barlow-condensed { font-family: 'Barlow Condensed', sans-serif; }
        
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-1 { animation: fade-up 0.7s ease both; }
        .fade-2 { animation: fade-up 0.7s 0.15s ease both; }
        .fade-3 { animation: fade-up 0.7s 0.3s ease both; }
        
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div style={{ backgroundColor: 'var(--black)', color: 'var(--text)', fontFamily: "'Barlow', sans-serif", fontWeight: 300, minHeight: '100vh', overflowX: 'hidden' }}>

        {/* NAV */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(10,9,7,0.95), transparent)' }}>
          <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: 2, color: 'var(--cream)' }}>
            RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/auth/login" style={{ color: 'var(--muted)', textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>Login</Link>
            <Link href="/auth/login" style={{ background: 'var(--amber)', color: 'var(--black)', textDecoration: 'none', padding: '9px 22px', borderRadius: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Start Free</Link>
          </div>
        </nav>

        {/* HERO */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 48px 80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -200, right: -200, width: 700, height: 700, background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div className="fade-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--amber)' }} />
            Für Handpan-Spieler — von einem Drummer
          </div>

          <h1 className="fade-2 anton" style={{ fontSize: 'clamp(64px, 10vw, 140px)', lineHeight: 0.92, color: 'var(--cream)', maxWidth: 900, position: 'relative', zIndex: 1 }}>
            TRAIN YOUR<br />
            <em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>RHYTHM.</em>
          </h1>

          <p className="fade-3 barlow" style={{ marginTop: 36, fontSize: 18, fontWeight: 300, lineHeight: 1.65, color: 'var(--muted)', maxWidth: 480, position: 'relative', zIndex: 1 }}>
            Nicht noch ein Kurs. Ein <strong style={{ color: 'var(--text)', fontWeight: 600 }}>tägliches Training</strong> — wie ein Gym für dein rhythmisches Verständnis.
          </p>

          <div className="fade-3" style={{ marginTop: 48, display: 'flex', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
            <Link href="/auth/login" style={{ background: 'var(--amber)', color: 'var(--black)', padding: '16px 36px', borderRadius: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              Kostenlos starten →
            </Link>
            <Link href="/dashboard" style={{ color: 'var(--muted)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
              Zum Dashboard
            </Link>
          </div>
        </section>

        {/* STATS */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[['600+', 'Pattern im Library'], ['6', 'Wochen Transformation'], ['15min', 'Daily Training'], ['9€', 'Pro Monat']].map(([num, label]) => (
            <div key={label} style={{ padding: '0 24px', borderRight: '1px solid var(--border)' }}>
              <div className="anton" style={{ fontSize: 48, lineHeight: 1, color: 'var(--cream)' }}>{num}</div>
              <div className="barlow-condensed" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* MANIFESTO */}
        <section style={{ padding: '120px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', fontFamily: "'Anton', sans-serif", fontSize: 300, color: 'rgba(245,166,35,0.03)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', whiteSpace: 'nowrap', pointerEvents: 'none', letterSpacing: -10 }}>RHYTHM</div>
          <div className="anton" style={{ fontSize: 'clamp(28px, 4vw, 54px)', lineHeight: 1.1, color: 'var(--cream)', maxWidth: 800, margin: '0 auto', position: 'relative', zIndex: 1 }}>
            „Rhythmik ist nicht was du fühlst.<br />
            Es ist was du <em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>trainierst.</em>"
          </div>
          <p style={{ marginTop: 28, fontSize: 16, color: 'var(--muted)', position: 'relative', zIndex: 1 }}>— Nils Caspar, Drummer & Gründer von Rhythm Gym</p>
          <div style={{ marginTop: 48 }}>
            <Link href="/auth/login" style={{ background: 'var(--amber)', color: 'var(--black)', padding: '16px 36px', borderRadius: 2, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none' }}>
              Training beginnen →
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid var(--border)', padding: '40px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="anton" style={{ fontSize: 16, letterSpacing: 3, color: 'var(--muted)' }}>RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span></div>
          <p style={{ fontSize: 13, color: 'var(--border)' }}>Ein Projekt von nilscaspar.de — Handpan Schule des Lebens</p>
          <p style={{ fontSize: 12, color: 'var(--border)' }}>© 2025 Nils Caspar Böhm · Eching</p>
        </footer>

      </div>
    </>
  )
}
