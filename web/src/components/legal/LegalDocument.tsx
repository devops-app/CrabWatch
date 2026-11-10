import React from 'react';

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

function parseMarkdown(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'ul', items: listBuffer });
      listBuffer = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '') {
      flushList();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (listMatch) {
      listBuffer.push(listMatch[1]);
      continue;
    }
    flushList();

    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
    } else {
      blocks.push({ type: 'p', text: trimmed });
    }
  }
  flushList();
  return blocks;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={`${keyPrefix}-i${i}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
    i++;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

export default function LegalDocument({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  let title = '';
  let lastUpdated = '';
  const contentBlocks: Block[] = [];

  for (const block of blocks) {
    if (block.type === 'h1' && !title) {
      title = block.text;
      continue;
    }
    if (block.type === 'p' && !lastUpdated) {
      const m = block.text.match(/^\*\*Last updated:\*\*\s*(.+)$/);
      if (m) {
        lastUpdated = m[1];
        continue;
      }
    }
    contentBlocks.push(block);
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5">
      {/* Top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-ocean-500 via-ocean-400 to-mangrove-500" />

      {/* Header */}
      <header className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-8 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title || 'Legal Document'}
        </h1>
        {lastUpdated && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ocean-50 px-3 py-1 text-xs font-medium text-ocean-700 ring-1 ring-ocean-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last updated: {lastUpdated}
          </p>
        )}
      </header>

      {/* Body */}
      <div className="space-y-5 px-6 py-8 sm:px-10">
        {contentBlocks.map((block, idx) => {
          const key = `blk-${idx}`;
          switch (block.type) {
            case 'hr':
              return null;
            case 'h1':
              return (
                <h2 key={key} className="flex items-center gap-3 pt-4 text-xl font-bold tracking-tight text-slate-900">
                  <span className="h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-ocean-500 to-mangrove-500" />
                  {renderInline(block.text, key)}
                </h2>
              );
            case 'h2':
              return (
                <h3 key={key} className="flex items-center gap-2.5 pt-2 text-lg font-semibold tracking-tight text-slate-900">
                  <span className="h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-ocean-400 to-mangrove-400" />
                  {renderInline(block.text, key)}
                </h3>
              );
            case 'h3':
              return (
                <h4 key={key} className="pt-1 text-base font-semibold text-slate-800">
                  {renderInline(block.text, key)}
                </h4>
              );
            case 'ul':
              return (
                <ul key={key} className="space-y-2 pl-1">
                  {block.items.map((item, i) => (
                    <li key={`${key}-li-${i}`} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean-400" />
                      <span>{renderInline(item, `${key}-li-${i}`)}</span>
                    </li>
                  ))}
                </ul>
              );
            case 'p':
            default:
              return (
                <p key={key} className="text-sm leading-relaxed text-slate-600">
                  {renderInline(block.text, key)}
                </p>
              );
          }
        })}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:px-10">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} CRABWATCH &middot; Universiti Malaysia Terengganu
        </p>
      </footer>
    </article>
  );
}
