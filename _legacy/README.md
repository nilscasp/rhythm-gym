# _legacy/

Reference material — NOT part of the active build. Do not import from here.

## v1/

The pre-merge Next.js app: original landing page (waveform animation), Supabase auth flow (login + callback), dashboard with Supabase pattern-library read. Kept here so the auth scaffolding can be reactivated in a later iteration without re-deriving it from scratch.

## bundle/

The standalone HTML/JSX prototypes that were merged into this app:
- `rhythm_gym_landing.html` → `app/page.tsx`
- `rhythmus-bibliothek.html` → `app/bibliothek/page.tsx`
- `breaks-und-fills-rhythm-gym.html` → `app/bibliothek/breaks-und-fills/page.tsx`
- `rhythm-tool-complete.html` → `app/patterns/page.tsx`
- `rhythmus_drummaschine.jsx` → `app/tool/page.tsx` (ported to handpan strikes)
- `rhythmen_zyklus2.json` + `SCHEMA.md` → `data/course-patterns.ts` + `app/training/`
- `interaktiver_rhythmus_werkzeug.jsx` — older redundant prototype, NOT migrated

`CLAUDE_CODE_PROMPT.md` is the original brief for this merge work.
