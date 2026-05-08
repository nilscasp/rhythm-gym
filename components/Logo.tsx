import Link from 'next/link';

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link
      href="/"
      style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
    >
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <rect x="2"  y="22" width="3" height="12" rx="1" fill="#F5A623" />
          <rect x="7"  y="14" width="3" height="20" rx="1" fill="#F5A623" />
          <rect x="12" y="8"  width="3" height="26" rx="1" fill="#F5A623" />
          <rect x="17" y="18" width="3" height="16" rx="1" fill="#F5A623" opacity="0.6" />
          <rect x="22" y="10" width="3" height="24" rx="1" fill="#F5A623" />
          <rect x="27" y="20" width="3" height="14" rx="1" fill="#F5A623" opacity="0.6" />
          <rect x="32" y="26" width="2" height="8"  rx="1" fill="#F5A623" opacity="0.4" />
        </svg>
      </div>
      {withText && (
        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 20, letterSpacing: 2, color: 'var(--cream)' }}>
          RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span>
        </span>
      )}
    </Link>
  );
}
