// Shared markdown renderer used by every client block component
// (TextBlock, TitleBlock, HeroCardsBlock, TextCardBlock, IconListBlock,
// MediaTextBlock, TabsBlock).
//
// Built on top of `marked` so we get the full set of markdown features for
// free — GFM tables / strikethrough / nested lists / images / blockquotes /
// horizontal rules / autolinks — without hand-rolling a parser.
//
// The custom renderer below preserves two project-specific behaviors:
//   • External links (http(s)://…) get `target="_blank" rel="noopener"`.
//   • Fenced code blocks render as `<pre class="code-block"><code class="language-…">`
//     so our existing CSS keeps working.
//
// Keep the server-side `renderInlineMarkdown` in api-server/markdown-render.mjs
// configured identically — both sides must produce the same HTML for hydration.

import { Marked, type Tokens } from 'marked'

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => HTML_ESCAPE[c])
}
function isExternalUrl(href: string): boolean {
  return /^https?:/i.test(href)
}

const md = new Marked({
  gfm: true,
  breaks: true,         // single \n → <br>, matching the previous behavior
})

md.use({
  renderer: {
    code({ text, lang }: Tokens.Code) {
      const langClass = lang ? ` class="language-${esc(lang)}"` : ''
      return `<pre class="code-block"><code${langClass}>${esc(text)}</code></pre>\n`
    },
    link(token: Tokens.Link) {
      const { href, title, tokens } = token
      // marked binds `this.parser` at runtime so we can resolve inner inline tokens.
      // The TS types don't surface it on the override signature, hence the cast.
      const inner = (this as unknown as { parser: { parseInline: (t: unknown[]) => string } })
        .parser.parseInline(tokens)
      const titleAttr = title ? ` title="${esc(title)}"` : ''
      const target = isExternalUrl(href) ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${esc(href)}"${titleAttr}${target}>${inner}</a>`
    },
  },
})

export function renderInlineMarkdown(input: string | null | undefined): string {
  if (!input) return ''
  return md.parse(String(input), { async: false }) as string
}
