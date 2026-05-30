<template>
  <div :class="['block-textcard', `block-textcard-cols-${columns}`, `block-textcard-gap-${gap}`]">
    <article
      v-for="(item, i) in renderedItems"
      :key="i"
      :class="['block-textcard-card', `block-textcard-text-${item.textColor}`]"
      :style="item.style"
    >
      <h3 v-if="item.title" class="block-textcard-title">{{ item.title }}</h3>
      <div
        v-if="item.descriptionHtml"
        class="block-textcard-desc"
        v-html="item.descriptionHtml"
      ></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Item = {
  title?: string
  description?: string
  backgroundColor?: string
  textColor?: 'dark' | 'light'
}

const props = defineProps<{
  block: {
    props: {
      columns?: '2' | '3' | '4' | string
      gap?: 'small' | 'medium' | 'large'
      backgroundColor?: string
      textColor?: 'dark' | 'light'
      items?: Item[]
    }
  }
}>()

const columns = computed(() => {
  const c = props.block.props?.columns
  return c === '2' || c === '4' ? c : '3'
})
const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'small' || g === 'large' ? g : 'medium'
})
const blockBg = computed(() => props.block.props?.backgroundColor || '')
const blockTextColor = computed<'dark' | 'light'>(() =>
  props.block.props?.textColor === 'light' ? 'light' : 'dark',
)

const HTML_ESCAPE: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, c => HTML_ESCAPE[c])
}
function renderInline(md: string) {
  if (!md) return ''
  let html = esc(md)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return html.split(/\n{2,}/).map(p => {
    const t = p.trim()
    if (!t) return ''
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
}

const renderedItems = computed(() => {
  const list = Array.isArray(props.block.props?.items) ? props.block.props.items : []
  return list.map(it => {
    const cardBg = it?.backgroundColor || blockBg.value
    const textColor: 'dark' | 'light' =
      it?.textColor === 'light' || it?.textColor === 'dark' ? it.textColor : blockTextColor.value
    return {
      title: it?.title || '',
      descriptionHtml: renderInline(it?.description || ''),
      textColor,
      style: cardBg ? { backgroundColor: cardBg } : undefined,
    }
  }).filter(x => x.title || x.descriptionHtml)
})
</script>
