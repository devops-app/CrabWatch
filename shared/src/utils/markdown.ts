/**
 * Minimal line-based markdown parser for legal documents.
 *
 * Supports the subset used by the CrabWatch legal pages:
 * - `#` / `##` / `###` headings
 * - `---` horizontal rules
 * - `-` / `*` bullet lists (consecutive items grouped into one block;
 *   indented items get `depth: 1` for nested rendering)
 * - everything else is a paragraph
 *
 * Inline `**bold**` / `*italic*` is NOT parsed here — each platform
 * renders inline emphasis with its own JSX (web: <strong>/<em>,
 * mobile: nested <Text>).
 */

export type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: { text: string; depth: 0 | 1 }[] };

const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const LIST_ITEM_RE = /^(\s*)([-*])\s+(.*)$/;

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  let listBuffer: { text: string; depth: 0 | 1 }[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ type: 'ul', items: [...listBuffer] });
      listBuffer = [];
    }
  };

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (HR_RE.test(line)) {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }
    const listItem = rawLine.match(LIST_ITEM_RE);
    if (listItem) {
      listBuffer.push({
        text: listItem[3],
        depth: listItem[1].length > 0 ? 1 : 0,
      });
      continue;
    }
    flushList();
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2) });
    } else {
      blocks.push({ type: 'p', text: line });
    }
  }
  flushList();
  return blocks;
}
