'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';
import type { Brand } from '../app/lib/brand';

type NavItem = { href: string; label: string; cta?: boolean; adminOnly?: boolean };

const ITEMS: Record<Brand, NavItem[]> = {
  gym: [
    { href: '/anleitung', label: 'Anleitung' },
    { href: '/glossar', label: 'Glossar' },
    { href: '/patterns', label: 'Patterns' },
    { href: '/training', label: 'Training' },
    { href: '/bausteine', label: 'Bausteine' },
    { href: '/coach', label: 'Coach', adminOnly: true },
    { href: '/tool', label: 'Tool', cta: true },
  ],
  // Die Schule zeigt weniger: was ein Schüler braucht, in seiner Sprache.
  schule: [
    { href: '/training', label: 'Kurse' },
    { href: '/patterns', label: 'Patterns' },
    { href: '/glossar', label: 'Glossar' },
    { href: '/coach', label: 'Coach', adminOnly: true },
    { href: '/tool', label: 'Werkzeug', cta: true },
  ],
};

const linkBase: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  letterSpacing: 2,
  textTransform: 'uppercase',
  transition: 'color 0.2s',
};

export function Nav({
  isAuthenticated = false,
  isAdmin = false,
  brand = 'gym',
}: {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  brand?: Brand;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Admin-only Items rausfiltern, wenn der Angemeldete kein Admin ist.
  const visibleItems = ITEMS[brand].filter((it) => !it.adminOnly || isAdmin);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'color-mix(in srgb, var(--black) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <Logo size={32} brand={brand} />

        {/* ── Unauthenticated: Login CTAs only — Tool/Bibliothek/etc. are members-only ── */}
        {!isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link
              href="/auth/login"
              style={{
                ...linkBase,
                color: 'var(--muted)',
                textDecoration: 'none',
              }}
            >
              Einloggen
            </Link>
            <Link
              href="/auth/login?mode=signup"
              style={{
                ...linkBase,
                background: 'var(--amber)',
                color: 'var(--black)',
                padding: '9px 22px',
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 12,
                textDecoration: 'none',
              }}
            >
              Konto erstellen
            </Link>
          </div>
        )}

        {/* ── Authenticated: full menu + mobile burger ── */}
        {isAuthenticated && (
          <>
            <ul
              className="nav-desktop"
              style={{
                listStyle: 'none',
                display: 'flex',
                gap: 28,
                alignItems: 'center',
              }}
            >
              {visibleItems.map((it) => {
                const active = isActive(it.href);
                if (it.cta) {
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        style={{
                          ...linkBase,
                          background: 'var(--amber)',
                          color: 'var(--black)',
                          padding: '9px 22px',
                          borderRadius: 2,
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'inline-block',
                        }}
                      >
                        {it.label}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      style={{ ...linkBase, color: active ? 'var(--amber)' : 'var(--muted)' }}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <button
              aria-label="Menü öffnen"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="nav-burger"
              style={{
                display: 'none',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--cream)',
                padding: '8px 12px',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {open ? 'Schließen' : 'Menü'}
            </button>
          </>
        )}
      </div>

      {/* Mobile menu (authenticated only) */}
      {isAuthenticated && open && (
        <ul
          className="nav-mobile-menu"
          style={{
            listStyle: 'none',
            display: 'none',
            flexDirection: 'column',
            gap: 8,
            padding: '16px 0 8px',
            borderTop: '1px solid var(--border)',
            marginTop: 14,
          }}
        >
          {visibleItems.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                onClick={() => setOpen(false)}
                style={{
                  ...linkBase,
                  display: 'block',
                  padding: '12px 8px',
                  color: it.cta ? 'var(--amber)' : isActive(it.href) ? 'var(--amber)' : 'var(--cream)',
                  borderLeft: it.cta ? '3px solid var(--amber)' : '3px solid transparent',
                  paddingLeft: 14,
                  fontSize: 14,
                }}
              >
                {it.label}{it.cta ? ' →' : ''}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-burger { display: inline-block !important; }
          .nav-mobile-menu { display: ${open ? 'flex' : 'none'} !important; }
        }
        /* Auf sehr schmalen Geräten bleibt nur das Signet — der lange
           Schul-Name würde die Login-Buttons aus der Zeile drängen. */
        @media (max-width: 380px) {
          .logo-wordmark-schule { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
