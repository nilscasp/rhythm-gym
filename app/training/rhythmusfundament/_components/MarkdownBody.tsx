import { Fragment } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownBody — leichter Renderer für die Rhythmus-Fundament-Tag-Markdowns.
//
// Kein generischer Markdown-Parser. Die 40 Tag-Dateien folgen einer engen
// Struktur (## Heading · Block · ⸻ · Block · ⸻ · …) und nutzen Inline-Bold
// `**text**`, eingerückte Listen mit `▸`, `1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣` und
// Symbol-Header (🜁/◆/◇/☽/✦/🌬). Wir rendern strikt für diese Form.
//
// Inputs:
//   - `markdown`: Rohinhalt der content/rhythmusfundament/tag-N.md
//
// Output: semantische React-Knoten mit den nötigen CSS-Hooks.
// ─────────────────────────────────────────────────────────────────────────────

interface MarkdownBodyProps {
  markdown: string;
}

const SECTION_DIVIDER = '⸻';

interface InlineSegment {
  type: 'text' | 'bold' | 'italic';
  value: string;
}

// Parse `**bold**` and `*italic*` (single asterisk that does NOT itself form
// a `**`). Order matters: scan for `**...**` first, then `*...*` in the rest.
function parseInline(s: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let i = 0;
  while (i < s.length) {
    const boldOpen = s.indexOf('**', i);
    if (boldOpen === -1) {
      // Try italic.
      const italicSegments = parseItalic(s.slice(i));
      out.push(...italicSegments);
      return out;
    }
    if (boldOpen > i) {
      out.push(...parseItalic(s.slice(i, boldOpen)));
    }
    const boldClose = s.indexOf('**', boldOpen + 2);
    if (boldClose === -1) {
      // Unclosed bold — render the rest as plain text.
      out.push({ type: 'text', value: s.slice(boldOpen) });
      return out;
    }
    out.push({
      type: 'bold',
      value: s.slice(boldOpen + 2, boldClose),
    });
    i = boldClose + 2;
  }
  return out;
}

function parseItalic(s: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf('*', i);
    if (open === -1) {
      out.push({ type: 'text', value: s.slice(i) });
      return out;
    }
    if (open > i) {
      out.push({ type: 'text', value: s.slice(i, open) });
    }
    const close = s.indexOf('*', open + 1);
    if (close === -1) {
      out.push({ type: 'text', value: s.slice(open) });
      return out;
    }
    out.push({ type: 'italic', value: s.slice(open + 1, close) });
    i = close + 1;
  }
  return out;
}

function renderInline(s: string): React.ReactNode[] {
  return parseInline(s).map((seg, i) => {
    if (seg.type === 'bold') return <strong key={i}>{seg.value}</strong>;
    if (seg.type === 'italic') return <em key={i}>{seg.value}</em>;
    return <Fragment key={i}>{seg.value}</Fragment>;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// A block = paragraph between dividers. We further split into lines and
// detect: H1 (## …), pseudo-headers (🜁 **WORD**), list lines (start with ▸ /
// 1️⃣..5️⃣), and prose lines.
// ─────────────────────────────────────────────────────────────────────────────

interface BlockLine {
  raw: string;
}

interface BlockGroup {
  /** "h2-banner" = the very first ## line. "section" = anything else. */
  kind: 'h2-banner' | 'section';
  lines: BlockLine[];
}

const HEADER_SYMBOL_REGEX = /^(🜁|◆|◇|☽|✦|🌬)\s+(\*\*[^*]+\*\*)$/;
const BULLET_REGEX = /^▸\s+(.*)$/;
const NUMBERED_REGEX = /^([1-9](?:️⃣|⃣))\s+(.*)$/;

function splitBlocks(text: string): BlockGroup[] {
  // Normalise line endings, then split on the section divider.
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const groups: BlockGroup[] = [];
  let current: BlockLine[] = [];
  let firstNonEmptyConsumed = false;

  const flush = (kind: 'h2-banner' | 'section' = 'section') => {
    // Trim trailing blank lines.
    while (current.length && !current[current.length - 1].raw.trim()) {
      current.pop();
    }
    if (!current.length) return;
    groups.push({ kind, lines: current });
    current = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (line.trim() === SECTION_DIVIDER) {
      flush();
      continue;
    }
    // Special: the FIRST `## Tag N · Title` line is its own block.
    if (!firstNonEmptyConsumed) {
      if (!line.trim()) continue; // skip leading blanks
      firstNonEmptyConsumed = true;
      if (line.startsWith('## ')) {
        current.push({ raw: line });
        flush('h2-banner');
        continue;
      }
    }
    current.push({ raw: line });
  }
  flush();
  return groups;
}

function renderSectionBlock(block: BlockGroup, key: number): React.ReactNode {
  // Banner = the first ## line. We don't render it in the body — the page
  // header already shows TAG N · Title above the markdown column.
  if (block.kind === 'h2-banner') {
    return null;
  }

  const children: React.ReactNode[] = [];
  let symbolHeader: { symbol: string; text: string } | null = null;

  // Group consecutive list items so they render as a single <ul>.
  let listBuffer: { kind: 'bullet' | 'numbered'; items: React.ReactNode[] } | null =
    null;
  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.kind === 'numbered') {
      children.push(
        <ol key={`${key}-list-${children.length}`} className="md-list md-list--numbered">
          {listBuffer.items.map((node, i) => (
            <li key={i}>{node}</li>
          ))}
        </ol>
      );
    } else {
      children.push(
        <ul key={`${key}-list-${children.length}`} className="md-list md-list--bullet">
          {listBuffer.items.map((node, i) => (
            <li key={i}>{node}</li>
          ))}
        </ul>
      );
    }
    listBuffer = null;
  };

  for (let i = 0; i < block.lines.length; i++) {
    const raw = block.lines[i].raw;
    const trimmed = raw.trim();
    if (!trimmed) {
      // Blank line → paragraph break inside the block.
      flushList();
      continue;
    }

    // Symbol-header (🜁 **ESSENZ**) — first non-empty line only.
    const headerMatch = trimmed.match(HEADER_SYMBOL_REGEX);
    if (!symbolHeader && headerMatch) {
      const sym = headerMatch[1];
      const inner = headerMatch[2].slice(2, -2);
      symbolHeader = { symbol: sym, text: inner };
      continue;
    }

    // Bullet list: lines starting with ▸
    const bulletMatch = raw.match(BULLET_REGEX);
    if (bulletMatch) {
      if (!listBuffer || listBuffer.kind !== 'bullet') {
        flushList();
        listBuffer = { kind: 'bullet', items: [] };
      }
      listBuffer.items.push(<>{renderInline(bulletMatch[1])}</>);
      continue;
    }

    // Numbered list with emoji digits.
    const numMatch = raw.match(NUMBERED_REGEX);
    if (numMatch) {
      if (!listBuffer || listBuffer.kind !== 'numbered') {
        flushList();
        listBuffer = { kind: 'numbered', items: [] };
      }
      listBuffer.items.push(
        <>
          <span className="md-num-marker">{numMatch[1]}</span>{' '}
          {renderInline(numMatch[2])}
        </>
      );
      continue;
    }

    // Otherwise: paragraph line.
    flushList();
    children.push(
      <p key={`${key}-p-${children.length}`} className="md-p">
        {renderInline(raw)}
      </p>
    );
  }
  flushList();

  if (symbolHeader) {
    return (
      <section key={key} className="md-section">
        <h3 className="md-section-head">
          <span className="md-section-symbol">{symbolHeader.symbol}</span>
          <span className="md-section-title">{symbolHeader.text}</span>
        </h3>
        <div className="md-section-body">{children}</div>
      </section>
    );
  }
  return (
    <section key={key} className="md-section md-section--plain">
      {children}
    </section>
  );
}

export function MarkdownBody({ markdown }: MarkdownBodyProps) {
  const blocks = splitBlocks(markdown);
  return (
    <article className="md-body">
      {blocks.map((b, i) => renderSectionBlock(b, i))}
      <style>{`
        .md-body {
          display: flex;
          flex-direction: column;
          gap: 28px;
          font-family: var(--font-body);
          color: var(--text, var(--cream));
          line-height: 1.65;
          font-size: 16px;
          max-width: min(68ch, 100%);
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .md-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .md-section--plain {
          padding-bottom: 4px;
        }
        .md-section-head {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin: 0;
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--amber);
        }
        .md-section-symbol {
          font-size: 18px;
        }
        .md-section-title {
          line-height: 1;
        }
        .md-section-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .md-p {
          margin: 0;
        }
        .md-p strong {
          color: var(--cream);
          font-weight: 700;
        }
        .md-p em {
          color: var(--muted2, var(--muted));
          font-style: italic;
        }
        .md-list {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .md-list li {
          line-height: 1.55;
        }
        .md-list--bullet {
          list-style: none;
          padding-left: 0;
        }
        .md-list--bullet li {
          position: relative;
          padding-left: 22px;
        }
        .md-list--bullet li::before {
          content: '▸';
          position: absolute;
          left: 0;
          top: 0;
          color: var(--amber);
        }
        .md-list--numbered {
          list-style: none;
          padding-left: 0;
        }
        .md-num-marker {
          color: var(--amber);
          font-weight: 700;
          margin-right: 4px;
        }

        @media (max-width: 480px) {
          .md-body {
            font-size: 15px;
            gap: 22px;
            max-width: 100%;
          }
          .md-section-head {
            font-size: 13px;
            letter-spacing: 2px;
          }
        }
      `}</style>
    </article>
  );
}
