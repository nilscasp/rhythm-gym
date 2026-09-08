'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';
import type { Brand } from '../app/lib/brand';
import { DEFAULT_LOCALE, localizeHref, switchLocaleHref, type Locale } from '../app/lib/locale';
import { messagesFor } from '../messages';

type NavKey = 'courses' | 'events' | 'patterns' | 'glossary' | 'profile' | 'coach' | 'tool';
type NavItem = {
  href: string;
  /** Feste Beschriftung — das Gym wird nur deutsch bedient. */
  label?: string;
  /** Schlüssel in `messages` — die Schule spricht zwei Sprachen. */
  key?: NavKey;
  cta?: boolean;
  adminOnly?: boolean;
};

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
  // „Profil" steht bewusst in der Navigation — im Gym führt nur der Trainings-Hub
  // dorthin, und wer seine Handpan-Stufe oder sein Instrument ändern will, soll
  // dafür nicht erst einen Umweg suchen müssen.
  schule: [
    { href: '/training', key: 'courses' },
    { href: '/termine', key: 'events' },
    { href: '/patterns', key: 'patterns' },
    { href: '/glossar', key: 'glossary' },
    { href: '/settings', key: 'profile' },
    { href: '/coach', key: 'coach', adminOnly: true },
    { href: '/tool', key: 'tool', cta: true },
  ],
};

const linkBase: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  letterSpacing: 2,
  textTransform: 'uppercase',
  transition: 'color 0.2s',
};

/**
 * Der Sprachschalter. Steht bewusst auf Modulebene: als Funktion innerhalb von
 * `Nav` wäre es bei jedem Rendern eine neue Komponente, die ihren Zustand
 * verliert (react-hooks/static-components).
 *
 * Sichtbar ist nur das Kürzel — „In English" ausgeschrieben sprengt die
 * Kopfzeile bei 390px. Der ganze Satz steht in `aria-label` und `title`.
 */
function LocaleSwitch({
  href,
  code,
  title,
  lang,
  block = false,
  onNavigate,
}: {
  href: string;
  code: string;
  title: string;
  lang: string;
  block?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      hrefLang={lang}
      title={title}
      aria-label={title}
      onClick={onNavigate}
      style={{
        ...linkBase,
        color: 'var(--muted)',
        textDecoration: 'none',
        fontSize: 12,
        border: '1px solid var(--border)',
        borderRadius: 2,
        padding: block ? '12px 14px' : '7px 10px',
        display: block ? 'block' : 'inline-block',
      }}
    >
      {code}
    </Link>
  );
}

export function Nav({
  isAuthenticated = false,
  isAdmin = false,
  brand = 'gym',
  locale = DEFAULT_LOCALE,
}: {
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  brand?: Brand;
  locale?: Locale;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = messagesFor(locale);

  // Der Wechsler zeigt immer die jeweils ANDERE Sprache und bleibt auf
  // derselben Seite. Nur die Schule ist zweisprachig — das Gym ist englisch
  // benannt, aber deutsch bedient, dort wäre der Schalter ein leeres Versprechen.
  const other: Locale = locale === 'de' ? 'en' : 'de';
  const switchHref = switchLocaleHref(pathname ?? '/', other);
  // „In English" / „Auf Deutsch" ausgeschrieben sprengt die Kopfzeile bei
  // 390px — dort steht nur das Kürzel, vorgelesen wird der ganze Satz.
  const switchLabel = other.toUpperCase();
  const switchTitle = other === 'en' ? t.nav.toEnglish : t.nav.toGerman;
  const showSwitch = brand === 'schule';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  // Admin-only Items rausfiltern, wenn der Angemeldete kein Admin ist.
  const visibleItems = ITEMS[brand]
    .filter((it) => !it.adminOnly || isAdmin)
    .map((it) => ({
      ...it,
      text: it.key ? t.nav[it.key] : (it.label ?? ''),
      to: localizeHref(it.href, locale),
    }));

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
            {showSwitch && (
              <LocaleSwitch
                href={switchHref}
                code={switchLabel}
                title={switchTitle}
                lang={other}
              />
            )}
            <Link
              href={localizeHref('/auth/login', locale)}
              style={{
                ...linkBase,
                color: 'var(--muted)',
                textDecoration: 'none',
              }}
            >
              {t.nav.login}
            </Link>
            <Link
              href={`${localizeHref('/auth/login', locale)}?mode=signup`}
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
              {t.nav.signup}
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
                        href={it.to}
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
                        {it.text}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={it.href}>
                    <Link
                      href={it.to}
                      style={{ ...linkBase, color: active ? 'var(--amber)' : 'var(--muted)' }}
                    >
                      {it.text}
                    </Link>
                  </li>
                );
              })}
              {showSwitch && (
                <li>
                  <LocaleSwitch
                    href={switchHref}
                    code={switchLabel}
                    title={switchTitle}
                    lang={other}
                  />
                </li>
              )}
            </ul>

            <button
              aria-label={t.nav.openMenu}
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
              {open ? t.nav.close : t.nav.menu}
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
                href={it.to}
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
                {it.text}{it.cta ? ' →' : ''}
              </Link>
            </li>
          ))}
          {showSwitch && (
            <li>
              <LocaleSwitch
                href={switchHref}
                code={switchLabel}
                title={switchTitle}
                lang={other}
                block
                onNavigate={() => setOpen(false)}
              />
            </li>
          )}
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
