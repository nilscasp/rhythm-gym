'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    const heights = [30, 55, 70, 40, 80, 45, 65, 30, 75, 50, 35, 80, 60, 45, 70, 25]
    const accents = [0, 4, 8, 12]
    const waveform = document.getElementById('waveform')
    const beatLabels = document.getElementById('beatLabels')
    if (!waveform || !beatLabels) return

    waveform.innerHTML = ''
    beatLabels.innerHTML = ''

    heights.forEach((h, i) => {
      const bar = document.createElement('div')
      bar.style.cssText = `flex:1;border-radius:2px 2px 0 0;height:${h}px;cursor:pointer;position:relative;transition:background 0.3s;background:${accents.includes(i) ? '#FF6B35' : '#F5A623'};box-shadow:${accents.includes(i) ? '0 0 12px rgba(255,107,53,0.4)' : '0 0 12px rgba(245,166,35,0.4)'}`
      bar.addEventListener('click', () => {
        bar.style.background = bar.style.background.includes('#2E2A1E') ? '#F5A623' : '#2E2A1E'
      })
      waveform.appendChild(bar)

      const label = document.createElement('span')
      label.textContent = String(i + 1)
      label.style.cssText = `flex:1;text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:10px;color:${accents.includes(i) ? '#7A7060' : '#2E2A1E'}`
      beatLabels.appendChild(label)
    })

    let current = 0
    const interval = setInterval(() => {
      const bars = waveform.querySelectorAll('div')
      bars.forEach(b => (b as HTMLElement).style.boxShadow = '')
      ;(bars[current] as HTMLElement).style.boxShadow = '0 0 20px rgba(245,166,35,0.8)'
      current = (current + 1) % bars.length
    }, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,300;0,400;0,600;1,300&family=Barlow+Condensed:wght@300;400;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html{scroll-behavior:smooth}
        :root{--black:#0A0907;--dark:#131109;--card:#1C1A14;--border:#2E2A1E;--amber:#F5A623;--amber2:#E8920F;--warm:#FF6B35;--cream:#F5EDD8;--muted:#7A7060;--text:#D4C9AD}
        @keyframes fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ticker-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .fade-1{animation:fade-up 0.7s ease both}
        .fade-2{animation:fade-up 0.7s 0.15s ease both}
        .fade-3{animation:fade-up 0.7s 0.3s ease both}
        .nav-link{color:var(--muted);text-decoration:none;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;transition:color 0.2s}
        .nav-link:hover{color:var(--amber)}
        .nav-cta{background:var(--amber);color:var(--black)!important;padding:9px 22px;border-radius:2px;font-weight:700!important;font-size:12px!important}
        .nav-cta:hover{background:var(--amber2)}
        .btn-primary{background:var(--amber);color:var(--black);padding:16px 36px;border-radius:2px;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;display:inline-flex;align-items:center;gap:10px;transition:all 0.2s}
        .btn-primary:hover{background:var(--cream);transform:translateY(-2px);box-shadow:0 8px 30px rgba(245,166,35,0.3)}
        .btn-secondary{color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border-bottom:1px solid var(--border);padding-bottom:2px;transition:color 0.2s,border-color 0.2s}
        .btn-secondary:hover{color:var(--amber);border-color:var(--amber)}
        .pillar{background:var(--card);border:1px solid var(--border);padding:28px 32px;display:flex;align-items:flex-start;gap:20px;transition:border-color 0.2s,transform 0.2s;cursor:default}
        .pillar:hover{border-color:var(--amber);transform:translateX(4px)}
        .pillar:hover .pillar-num{color:var(--amber)!important}
        .price-card{background:var(--card);border:1px solid var(--border);padding:40px;position:relative}
        .price-card.featured{border-color:var(--amber)}
        .btn-outline{display:block;text-align:center;border:1px solid var(--border);color:var(--muted);padding:13px;font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;transition:all 0.2s;border-radius:2px}
        .btn-outline:hover{border-color:var(--amber);color:var(--amber)}
        .btn-filled{display:block;text-align:center;background:var(--amber);color:var(--black);padding:13px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;transition:all 0.2s;border-radius:2px}
        .btn-filled:hover{background:var(--cream)}
        #waveform{display:flex;align-items:flex-end;gap:6px;height:80px}
        #beatLabels{display:flex;gap:6px;margin-top:8px}
        .nav-desktop{display:flex;gap:36px;align-items:center;list-style:none}
        .nav-mobile-cta{display:none}
        .two-col{display:grid;grid-template-columns:1fr 1fr;gap:80px;margin-top:60px;align-items:start}
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr)}
        .pricing-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:60px;max-width:800px}
        .hero-actions{margin-top:48px;display:flex;align-items:center;gap:24px;position:relative;zIndex:1}
        @media(max-width:768px){
          .nav-desktop{display:none!important}
          .nav-mobile-cta{display:block!important}
          .nav-pad{padding:16px 20px!important}
          .hero-pad{padding:100px 24px 60px!important}
          .waveform-pad{padding:0 24px 50px!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important;padding:24px 20px!important}
          .stat-item{padding:16px 12px!important;border-right:none!important;border-bottom:1px solid var(--border)}
          .stat-item:nth-child(odd){border-right:1px solid var(--border)!important}
          .stat-item:nth-child(3),.stat-item:nth-child(4){border-bottom:none!important}
          .section-pad{padding:60px 24px!important}
          .two-col{grid-template-columns:1fr!important;gap:40px!important}
          .pricing-grid{grid-template-columns:1fr!important}
          .manifesto-pad{padding:80px 24px!important}
          .footer-pad{padding:30px 24px!important;flex-direction:column!important;gap:12px!important;text-align:center!important}
          .hero-actions{flex-direction:column!important;align-items:flex-start!important;gap:16px!important}
          .btn-primary{width:100%!important;justify-content:center!important}
        }
      `}</style>

      <div style={{backgroundColor:'var(--black)',color:'var(--text)',fontFamily:"'Barlow',sans-serif",fontWeight:300,overflowX:'hidden'}}>

        {/* NAV */}
        <nav className="nav-pad" style={{position:'fixed',top:0,left:0,right:0,zIndex:100,padding:'20px 48px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(to bottom, rgba(10,9,7,0.95), transparent)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="2" y="22" width="3" height="12" rx="1" fill="#F5A623"/>
              <rect x="7" y="14" width="3" height="20" rx="1" fill="#F5A623"/>
              <rect x="12" y="8" width="3" height="26" rx="1" fill="#F5A623"/>
              <rect x="17" y="18" width="3" height="16" rx="1" fill="#F5A623" opacity="0.6"/>
              <rect x="22" y="10" width="3" height="24" rx="1" fill="#F5A623"/>
              <rect x="27" y="20" width="3" height="14" rx="1" fill="#F5A623" opacity="0.6"/>
              <rect x="32" y="26" width="2" height="8" rx="1" fill="#F5A623" opacity="0.4"/>
            </svg>
            <span style={{fontFamily:"'Anton',sans-serif",fontSize:20,letterSpacing:2,color:'var(--cream)'}}>RHYTHM<span style={{color:'var(--amber)'}}>GYM</span></span>
          </div>
          <ul className="nav-desktop">
            <li><a href="#training" className="nav-link">Training</a></li>
            <li><a href="#patterns" className="nav-link">Pattern Library</a></li>
            <li><a href="#community" className="nav-link">Community</a></li>
            <li><Link href="/auth/login" className="nav-link nav-cta">Start Free</Link></li>
          </ul>
          <Link href="/auth/login" className="nav-mobile-cta" style={{display:'none',background:'var(--amber)',color:'var(--black)',textDecoration:'none',padding:'8px 18px',borderRadius:2,fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase'}}>Start Free</Link>
        </nav>

        {/* HERO */}
        <section className="hero-pad" style={{minHeight:'100vh',display:'flex',flexDirection:'column',justifyContent:'center',padding:'120px 48px 80px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:-200,right:-200,width:700,height:700,background:'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)',pointerEvents:'none'}}/>
          <div className="fade-1" style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:4,textTransform:'uppercase',color:'var(--amber)',marginBottom:24,display:'flex',alignItems:'center',gap:12}}>
            <span style={{display:'block',width:32,height:1,background:'var(--amber)'}}/>
            Für Handpan-Spieler — von einem Drummer
          </div>
          <h1 className="fade-2" style={{fontFamily:"'Anton',sans-serif",fontSize:'clamp(64px, 10vw, 140px)',lineHeight:0.92,letterSpacing:-1,color:'var(--cream)',maxWidth:900,position:'relative',zIndex:1}}>
            TRAIN YOUR<br/><em style={{fontStyle:'normal',color:'var(--amber)',display:'block'}}>RHYTHM.</em>
          </h1>
          <p className="fade-3" style={{marginTop:36,fontSize:18,fontWeight:300,lineHeight:1.65,color:'var(--muted)',maxWidth:480,position:'relative',zIndex:1}}>
            Nicht noch ein Kurs. Ein <strong style={{color:'var(--text)',fontWeight:600}}>tägliches Training</strong> — wie ein Gym für dein rhythmisches Verständnis. Pattern verstehen, nicht kopieren.
          </p>
          <div className="fade-3 hero-actions">
            <Link href="/auth/login" className="btn-primary">Kostenlos starten <span>→</span></Link>
            <a href="#training" className="btn-secondary">Wie es funktioniert</a>
          </div>
        </section>

        {/* WAVEFORM */}
        <div className="waveform-pad" style={{padding:'0 48px 80px',position:'relative',zIndex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:3,textTransform:'uppercase',color:'var(--muted)',marginBottom:16}}>16-Step Training Grid — interaktiv</div>
          <div id="waveform"/>
          <div id="beatLabels"/>
        </div>

        {/* TICKER */}
        <div style={{overflow:'hidden',borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'12px 0',background:'var(--dark)'}}>
          <div style={{display:'flex',whiteSpace:'nowrap',animation:'ticker-scroll 20s linear infinite'}}>
            {['Daily Practice','600+ Pattern','Accountability System','Live Group Calls','Rhythm Fundament','Handpan Training','Spaced Repetition','Community','Daily Practice','600+ Pattern','Accountability System','Live Group Calls','Rhythm Fundament','Handpan Training','Spaced Repetition','Community'].map((item,i)=>(
              <span key={i} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:3,textTransform:'uppercase',color:'var(--muted)',padding:'0 40px',display:'inline-flex',alignItems:'center',gap:16}}>
                {item}<span style={{color:'var(--amber)',fontSize:8}}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid" style={{borderTop:'1px solid var(--border)',borderBottom:'1px solid var(--border)',padding:'32px 48px'}}>
          {[
            {num:'600', suffix:'+', label:'Pattern im Library'},
            {num:'6', suffix:'', label:'Wochen Transformation'},
            {num:'15', suffix:'min', label:'Daily Training'},
            {num:'9', suffix:'€', label:'Pro Monat'},
          ].map(({num, suffix, label}, i) => (
            <div key={i} className="stat-item" style={{padding:'0 24px', borderRight: i < 3 ? '1px solid var(--border)' : 'none'}}>
              <div style={{fontFamily:"'Anton',sans-serif",fontSize:48,lineHeight:1,color:'var(--cream)'}}>
                {num}<span style={{color:'var(--amber)'}}>{suffix}</span>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:'var(--muted)',marginTop:6,letterSpacing:1,textTransform:'uppercase'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* WHAT IS */}
        <section id="training" className="section-pad" style={{padding:'100px 48px'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:4,textTransform:'uppercase',color:'var(--amber)',marginBottom:20}}>Was ist Rhythm Gym?</div>
          <h2 style={{fontFamily:"'Anton',sans-serif",fontSize:'clamp(36px,5vw,72px)',lineHeight:0.95,color:'var(--cream)',maxWidth:700}}>
            DAS GYM FÜR<br/><em style={{fontStyle:'normal',color:'var(--amber)'}}>DEIN TIMING.</em>
          </h2>
          <div className="two-col">
            <div style={{fontSize:17,lineHeight:1.75,color:'var(--muted)'}}>
              <p>Ein Fitnessstudio gehst du nicht einmal im Monat. Du gehst <strong style={{color:'var(--text)',fontWeight:600}}>jeden Tag</strong> — kurz, fokussiert, konstant. Genau so funktioniert Rhythm Gym.</p>
              <p style={{marginTop:20}}>Keine langen Theorie-Videos. Kein Konsumieren. Stattdessen: <strong style={{color:'var(--text)',fontWeight:600}}>tägliche Trainingseinheiten</strong>, die dein rhythmisches Verständnis aufbauen wie Muskelgedächtnis.</p>
              <p style={{marginTop:20}}>Als Drummer und Perkussionist habe ich eines gelernt: Rhythmus ist kein Talent. Es ist eine <strong style={{color:'var(--text)',fontWeight:600}}>Fähigkeit — erlernbar, trainierbar, messbar.</strong></p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {[
                ['01','Daily Workouts','10–15 Minuten täglich. Strukturierte Übungsvideos die auf vorherigen aufbauen. Eigenes Tempo, jederzeit abrufbar.'],
                ['02','Pattern Library','600+ mathematisch generierte Rhythmus-Pattern, kuratiert nach Niveau und musikalischer Relevanz. Dein tägliches Equipment.'],
                ['03','Training Partner','Ein Accountability-Partner schickt dir täglich eine kurze Sprachnachricht. Kein Call, kein Stress — nur gemeinsam dranbleiben.'],
                ['04','Live Sessions','Monatliche Group Calls mit Nils. Alle aufgezeichnet. Fragen stellen, Fortschritt teilen, gemeinsam wachsen.'],
              ].map(([num,title,desc])=>(
                <div key={num} className="pillar">
                  <div className="pillar-num" style={{fontFamily:"'Anton',sans-serif",fontSize:32,color:'var(--border)',lineHeight:1,minWidth:40,transition:'color 0.2s'}}>{num}</div>
                  <div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:18,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--cream)',marginBottom:8}}>{title}</div>
                    <div style={{fontSize:14,color:'var(--muted)',lineHeight:1.6}}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="patterns" className="section-pad" style={{padding:'100px 48px',background:'var(--dark)',borderTop:'1px solid var(--border)'}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:4,textTransform:'uppercase',color:'var(--amber)',marginBottom:20}}>Mitgliedschaft</div>
          <h2 style={{fontFamily:"'Anton',sans-serif",fontSize:'clamp(36px,5vw,72px)',lineHeight:0.95,color:'var(--cream)'}}>
            WÄHLE DEIN<br/><em style={{fontStyle:'normal',color:'var(--amber)'}}>LEVEL.</em>
          </h2>
          <div className="pricing-grid">
            <div className="price-card">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:3,textTransform:'uppercase',color:'var(--muted)',marginBottom:20}}>Free Member</div>
              <div style={{fontFamily:"'Anton',sans-serif",fontSize:56,lineHeight:1,color:'var(--cream)'}}>0 <span style={{fontFamily:"'Barlow',sans-serif",fontSize:20,fontWeight:300,color:'var(--muted)'}}>€/Monat</span></div>
              <div style={{fontSize:14,color:'var(--muted)',margin:'16px 0 28px',lineHeight:1.6}}>Rein schnuppern. Kein Kreditkartenzwang.</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10,marginBottom:32}}>
                {['50 Pattern aus dem Library','Level 1 Training (Woche 1)','Metronom-Tool'].map(f=>(
                  <li key={f} style={{fontSize:14,color:'var(--text)',display:'flex',alignItems:'center',gap:10}}><span style={{color:'var(--amber)',fontSize:12}}>→</span>{f}</li>
                ))}
                {['Pattern-Speicherung','Fortschritts-Tracking','Community & Group Calls'].map(f=>(
                  <li key={f} style={{fontSize:14,color:'var(--muted)',display:'flex',alignItems:'center',gap:10}}><span style={{color:'var(--border)',fontSize:12}}>→</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth/login" className="btn-outline">Kostenlos starten</Link>
            </div>
            <div className="price-card featured">
              <div style={{position:'absolute',top:-1,right:28,background:'var(--amber)',color:'var(--black)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',padding:'5px 12px'}}>Empfohlen</div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:3,textTransform:'uppercase',color:'var(--muted)',marginBottom:20}}>Premium Member</div>
              <div style={{fontFamily:"'Anton',sans-serif",fontSize:56,lineHeight:1,color:'var(--cream)'}}>9 <span style={{fontFamily:"'Barlow',sans-serif",fontSize:20,fontWeight:300,color:'var(--muted)'}}>€/Monat</span></div>
              <div style={{fontSize:14,color:'var(--muted)',margin:'16px 0 28px',lineHeight:1.6}}>Vollständiger Zugang. Täglich trainieren, dauerhaft wachsen.</div>
              <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:10,marginBottom:32}}>
                {['600+ Pattern — vollständig','Alle Training-Level (1–5)','16-Step Grid mit Speicherung','Fortschritts-Tracking & Streaks','Accountability Partner Matching','Monatliche Live-Session mit Nils'].map(f=>(
                  <li key={f} style={{fontSize:14,color:'var(--text)',display:'flex',alignItems:'center',gap:10}}><span style={{color:'var(--amber)',fontSize:12}}>→</span>{f}</li>
                ))}
              </ul>
              <Link href="/auth/login" className="btn-filled">Jetzt Mitglied werden</Link>
            </div>
          </div>
        </section>

        {/* MANIFESTO */}
        <section id="community" className="manifesto-pad" style={{padding:'120px 48px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',fontFamily:"'Anton',sans-serif",fontSize:300,color:'rgba(245,166,35,0.03)',top:'50%',left:'50%',transform:'translate(-50%,-50%)',whiteSpace:'nowrap',pointerEvents:'none',letterSpacing:-10}}>RHYTHM</div>
          <div style={{fontFamily:"'Anton',sans-serif",fontSize:'clamp(28px,4vw,54px)',lineHeight:1.1,color:'var(--cream)',maxWidth:800,margin:'0 auto',position:'relative',zIndex:1}}>
            „Rythmik ist nicht was du fühlst.<br/>Es ist was du <em style={{fontStyle:'normal',color:'var(--amber)'}}>trainierst.</em>"
          </div>
          <p style={{marginTop:28,fontSize:16,color:'var(--muted)',position:'relative',zIndex:1}}>— Nils Caspar, Drummer & Gründer von Rhythm Gym</p>
          <div style={{marginTop:48,position:'relative',zIndex:1}}>
            <Link href="/auth/login" className="btn-primary">Training beginnen <span>→</span></Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="footer-pad" style={{borderTop:'1px solid var(--border)',padding:'40px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontFamily:"'Anton',sans-serif",fontSize:16,letterSpacing:3,color:'var(--muted)'}}>RHYTHM<span style={{color:'var(--amber)'}}>GYM</span></div>
          <p style={{fontSize:13,color:'var(--border)'}}>Ein Projekt von <a href="https://nilscaspar.de" style={{color:'var(--muted)',textDecoration:'none'}}>nilscaspar.de</a> — Handpan Schule des Lebens</p>
          <p style={{fontSize:12,color:'var(--border)'}}>© 2025 Nils Caspar Böhm · Eching</p>
        </footer>

      </div>
    </>
  )
}