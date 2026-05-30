<template>
  <div class="block-text" v-html="rendered"></div>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: {
    type?: string
    props: {
      markdown?: string
    }
  }
}>()

// Mirror of the server's renderInlineMarkdown — kept in sync manually for Phase 1.
// Once a proper markdown library is added, both sides should consume it.
const HTML_ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(s: string) {
  return s.replace(/[&<>"']/g, c => HTML_ESCAPE[c])
}

const rendered = computed(() => {
  const md = props.block.props?.markdown || ''
  if (!md.trim()) return ''
  let html = esc(md)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return html.split(/\n{2,}/).map(p => {
    const t = p.trim()
    if (!t) return ''
    if (/^<(h[1-6]|ul|ol|pre|blockquote|p|aside|div)/.test(t)) return t
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
})
</script>
