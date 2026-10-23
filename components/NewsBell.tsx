'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { News, NewsKind } from '../app/lib/news'
import { markNewsSeenAction } from '../app/lib/news-actions'

// ─────────────────────────────────────────────────────────────────────────────
// Die Glocke der Schule (Abschnitt E). Zahl = ungelesene Neuigkeiten.
//
// Öffnen setzt news_state.seen_at = now() (Server Action). Die Einträge, die
// beim Öffnen neu waren, bleiben im offenen Panel hervorgehoben — so sieht
// man, WAS neu war; erst beim nächsten Öffnen gelten sie als gelesen.
//
// Zugänglich: echter <button> mit aria-expanded/aria-controls, Fokus beim
// Öffnen auf die Überschrift des Panels, Escape und „Schließen“ schließen und
// geben den Fokus an die Glocke zurück, Klick daneben schließt.
// „Alle Neuigkeiten“ auf „Heute“ öffnet das Panel über OPEN_NEWS_EVENT.
// ─────────────────────────────────────────────────────────────────────────────

export const OPEN_NEWS_EVENT = 'schule:open-news'

const NEWS_KICKER: Record<NewsKind, string> = {
  event: 'Bald live',
  post: 'Beitrag von Nils',
  lessons: 'Neu im Kurs',
  connection: 'Miteinander',
  challenge: 'Deine Challenge',
}

export function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 5.5 2.2 7.2 2.2 7.2H3.8S6 14.5 6 9Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function NewsBell({ news, label }: { news: News; label: string }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(news.unreadCount)
  // Was beim letzten Öffnen neu war — bleibt im Panel sichtbar markiert.
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(
    () => new Set(news.items.filter((i) => i.unread).map((i) => i.id)),
  )
  const buttonRef = useRef<HTMLButtonElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const titleId = useId()

  const openPanel = useCallback(() => {
    setOpen(true)
    if (unread > 0) {
      setUnread(0)
      markNewsSeenAction().catch(() => {
        // nicht kritisch — die Zahl kommt beim nächsten Laden wieder
      })
    }
  }, [unread])

  const closePanel = useCallback((returnFocus: boolean) => {
    setOpen(false)
    // Ab jetzt gilt alles als gelesen; beim nächsten Öffnen nichts mehr hervorheben.
    setFreshIds(new Set())
    if (returnFocus) buttonRef.current?.focus()
  }, [])

  // Fokus ins Panel, sobald es offen ist.
  useEffect(() => {
    if (open) headingRef.current?.focus()
  }, [open])

  // Escape und Klick daneben.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closePanel(true)
      }
    }
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closePanel(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open, closePanel])

  // „Alle Neuigkeiten“ auf „Heute“.
  useEffect(() => {
    const onOpen = () => openPanel()
    window.addEventListener(OPEN_NEWS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_NEWS_EVENT, onOpen)
  }, [openPanel])

  const buttonLabel = unread > 0 ? `${label}, ${unread} ungelesen` : label

  return (
    <div className="nb-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="nb-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={buttonLabel}
        onClick={() => (open ? closePanel(false) : openPanel())}
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="nb-count" aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      <div
        id={panelId}
        className="nb-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="nb-head">
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="nb-title">
            {label}
          </h2>
          <button type="button" className="nb-close" onClick={() => closePanel(true)}>
            Schließen
          </button>
        </div>
        {news.items.length === 0 ? (
          <p className="nb-empty">Gerade gibt es nichts Neues.</p>
        ) : (
          <ul className="nb-list">
            {news.items.map((item) => {
              const fresh = freshIds.has(item.id)
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`nb-item ${fresh ? 'nb-item--fresh' : 'nb-item--read'}`}
                    onClick={() => closePanel(false)}
                  >
                    <span className="nb-item-kicker">
                      {NEWS_KICKER[item.kind]}
                      {item.when ? ` · ${item.when}` : ''}
                      {fresh ? <span className="nb-sr"> · neu</span> : null}
                    </span>
                    <span className="nb-item-title">{item.title}</span>
                    {item.detail && item.kind !== 'post' ? (
                      <span className="nb-item-detail">{item.detail}</span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Knopf „Alle Neuigkeiten“ — öffnet die Glocke oben. */
export function OpenNewsButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_NEWS_EVENT))}
    >
      {children}
    </button>
  )
}

export const NEWS_BELL_CSS = `
  .nb-wrap { position: relative; display: flex; }
  .nb-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 2px;
    background: transparent;
    color: var(--muted2);
    cursor: pointer;
  }
  .nb-button:hover, .nb-button[aria-expanded="true"] { color: var(--amber); }
  .nb-button:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
  .nb-count {
    position: absolute;
    top: 5px;
    right: 3px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--amber);
    color: var(--black);
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
    text-align: center;
  }
  .nb-panel {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    z-index: 120;
    width: min(380px, calc(100vw - 32px));
    max-height: min(70dvh, 560px);
    overflow-y: auto;
    padding: 16px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: var(--dark);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  }
  .nb-panel[hidden] { display: none; }
  .nb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .nb-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 22px;
    color: var(--cream);
    outline: none;
  }
  .nb-close {
    min-height: 44px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--muted2);
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    cursor: pointer;
  }
  .nb-close:hover { color: var(--amber); }
  .nb-close:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
  .nb-empty { margin: 8px 0; font-family: var(--font-body); font-size: 16px; color: var(--muted2); }
  .nb-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .nb-item {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-height: 44px;
    padding: 12px 4px 12px 14px;
    border-bottom: 1px solid var(--border);
    border-left: 2px solid transparent;
    text-decoration: none;
  }
  .nb-item--fresh { border-left-color: var(--amber); }
  .nb-item--read { opacity: 0.62; }
  .nb-item:hover { opacity: 1; }
  .nb-item:hover .nb-item-title { color: var(--amber); }
  .nb-item:focus-visible { outline: 2px solid var(--amber); outline-offset: -2px; opacity: 1; }
  .nb-item-kicker {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .nb-item-title { font-family: var(--font-body); font-size: 16px; line-height: 1.4; color: var(--cream); overflow-wrap: anywhere; }
  .nb-item-detail { font-family: var(--font-body); font-size: 14px; font-style: italic; color: var(--muted); overflow-wrap: anywhere; }
  .nb-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  @media (max-width: 767.98px) {
    .nb-wrap { position: static; }
    .nb-panel {
      position: fixed;
      top: 64px;
      left: 16px;
      right: 16px;
      width: auto;
      max-height: calc(100dvh - 64px - 72px - env(safe-area-inset-bottom) - 16px);
    }
  }
`
