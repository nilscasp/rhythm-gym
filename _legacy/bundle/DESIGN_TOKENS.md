# Rhythm Gym — Design Tokens

> Verbindlich für die gesamte Web-App. Email-Templates haben absichtlich ein anderes System (warmer Brown-Gradient) und werden hier nicht referenziert.

## Farben

```css
:root {
  /* Backgrounds */
  --black:   #0A0907;   /* primärer Hintergrund */
  --dark:    #131109;   /* Section-Backgrounds, leicht heller */
  --card:    #1C1A14;   /* Karten, Container */
  --card2:   #242016;   /* Hover-Zustand auf Karten */

  /* Borders */
  --border:  #2E2A1E;   /* Standard-Border */
  --border2: #3A3428;   /* hellere Border, Hover */

  /* Akzente */
  --amber:     #F5A623;  /* primärer Akzent */
  --amber2:    #E8920F;  /* Amber dunkler, Hover */
  --amber-dim: rgba(245,166,35,0.12);   /* gedämpfte Akzentflächen */
  --amber-glow: rgba(245,166,35,0.06);  /* sehr dezent, Ambient */
  --warm:      #FF6B35;  /* sekundärer Akzent, sparsam */

  /* Text */
  --cream:  #F5EDD8;    /* hellster Text, Headlines auf dunklem Grund */
  --text:   #D4C9AD;    /* Body-Text */
  --muted:  #7A7060;    /* sekundärer Text */
  --muted2: #9A9080;    /* heller als muted, für Definitionen */
}
```

## Typografie

Alle Fonts via Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Barlow+Condensed:wght@300;400;600;700&display=swap" rel="stylesheet">
```

| Verwendung | Font | Style |
|---|---|---|
| H1, H2 (Display) | `Anton` | normal, ggf. all-caps, large letter-spacing -1px |
| Labels, Eyebrows, Nav | `Barlow Condensed` | 600/700, uppercase, letter-spacing 1–3px |
| Body, Definitionen | `Barlow` | 300 für Lauftext, 600 für `<strong>` |
| Counting/Pattern-Display | `Courier New, monospace` | nur in der Drum-Maschine für Step-Symbole |

**Hierarchie-Beispiele:**
- Hero H1: `clamp(48px, 8vw, 96px)`, `Anton`, `--cream`, line-height 0.95
- Section H2: `clamp(36px, 5vw, 72px)`, `Anton`
- Eyebrow über H2: `Barlow Condensed`, 12px, letter-spacing 4px, uppercase, `--amber`
- Body: `Barlow`, 16px, line-height 1.65, weight 300

## Komponenten-Patterns

### Button — Primary (CTA)
```css
background: var(--amber);
color: var(--black);
font-family: 'Barlow Condensed';
font-weight: 700;
letter-spacing: 2px;
text-transform: uppercase;
padding: 13px 28px;
border-radius: 2px;
transition: all 0.2s;
```

### Button — Outline
```css
border: 1px solid var(--border);
color: var(--muted);
background: transparent;
/* Hover: border-color + color → --amber */
```

### Karte
```css
background: var(--card);
border: 1px solid var(--border);
border-radius: 6px;
padding: 20px 24px;
transition: border-color 0.2s, background 0.2s;
/* Hover: border --border2, background --card2 */
```

### Highlight-Box (für Kernideen, Klarstellungen)
```css
background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03));
border: 1px solid rgba(245,166,35,0.2);
border-radius: 6px;
padding: 24px;
```

### Top-Nav
```css
position: sticky;
top: 0;
z-index: 100;
background: rgba(10,9,7,0.92);
backdrop-filter: blur(16px);
border-bottom: 1px solid var(--border);
padding: 14px 24px;
```

## Container

- Max-Width für Content-Pages: `1120px`
- Max-Width für Tool/Drum-Maschine: `1400px` (mehr Platz für 16-Step-Grid)
- Padding-X auf Mobile: `24px`
- Padding-X auf Desktop: `48px`

## Ambient-Hintergrund (optional, für Wissens-Pages)

```css
body::before {
  content: '';
  position: fixed;
  top: -200px; left: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(245,166,35,0.04), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
body::after {
  content: '';
  position: fixed;
  bottom: -100px; right: -100px;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(255,107,53,0.03), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
```

## Step-Farben in der Drum-Maschine

Aktuell (türkis-Variante) im Original:
- `0 (Pause)`: `rgba(150,150,150,0.2)` / Text `#888`
- `1 (Fingersnap, x)`: `rgba(78,205,196,0.6)` / Text `#4ECDC4`
- `2 (Hand Clap, X)`: `rgba(255,107,107,0.8)` / Text `#FF6B6B`
- `3 (Bass Drum, !)`: `rgba(255,215,0,1)` / Text `#FFD700`

**Empfehlung für dark/amber-Variante:**
- `0 (Pause)`: `rgba(122,112,96,0.15)` (`--muted` mit alpha) / Text `--muted`
- `1 (Fingersnap)`: `rgba(245,166,35,0.4)` / Text `--amber`
- `2 (Hand Clap)`: `rgba(255,107,53,0.7)` / Text `--warm`
- `3 (Bass Drum)`: `rgba(245,237,216,0.95)` (`--cream`) / Text `--cream`

So bleibt die Hierarchie (leicht → stark) erhalten, in der Markenfarbpalette.
