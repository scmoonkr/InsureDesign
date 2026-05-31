<template>
  <div :class="['block-mediatext', `block-mediatext-frame-${frame}`, `block-mediatext-gap-${gap}`]">
    <div
      v-for="(row, i) in rows"
      :key="i"
      :class="['block-mediatext-row', `block-mediatext-row-image-${row.imageSide}`]"
    >
      <div v-if="row.imageUrl" class="block-mediatext-image-wrap" :style="frameStyle">
        <img :src="row.imageUrl" :alt="row.imageAlt" loading="lazy" />
      </div>
      <div v-if="row.hasBody" class="block-mediatext-body">
        <h3 v-if="row.title" class="block-mediatext-title">{{ row.title }}</h3>
        <div
          v-if="row.descriptionHtml"
          class="block-mediatext-desc"
          v-html="row.descriptionHtml"
        ></div>
        <ul v-if="row.list.length" class="block-mediatext-list">
          <li v-for="(t, j) in row.list" :key="j">{{ t }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

type MediaInfo = { paths?: { original?: string }; alt?: string; title?: string }
type Item = {
  imageId?: string
  title?: string
  description?: string
  list?: string[]
}

const props = defineProps<{
  block: {
    props: {
      imageFrame?: 'none' | 'soft'
      frameColor?: string
      alternate?: 'on' | 'off'
      imagePosition?: 'left' | 'right'
      gap?: 'small' | 'medium' | 'large'
      items?: Item[]
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const frame = computed(() => (props.block.props?.imageFrame === 'none' ? 'none' : 'soft'))
const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'small' || g === 'medium' ? g : 'large'
})
const frameStyle = computed(() =>
  frame.value === 'soft' && props.block.props?.frameColor
    ? { backgroundColor: props.block.props.frameColor }
    : undefined,
)


const rows = computed(() => {
  const list = Array.isArray(props.block.props?.items) ? props.block.props.items : []
  const alternate = props.block.props?.alternate !== 'off'
  const firstPos: 'left' | 'right' = props.block.props?.imagePosition === 'right' ? 'right' : 'left'

  return list.map((it, i) => {
    const flip = alternate && i % 2 === 1
    const imageSide: 'left' | 'right' = flip
      ? (firstPos === 'left' ? 'right' : 'left')
      : firstPos
    const m = it?.imageId ? props.mediaMap?.[it.imageId] : undefined
    const imageUrl = m?.paths?.original || ''
    const imageAlt = m?.alt || m?.title || it?.title || ''
    const title = it?.title || ''
    const descriptionHtml = renderInlineMarkdown(it?.description || '')
    const safeList = Array.isArray(it?.list) ? it.list.map(s => String(s || '')).filter(Boolean) : []
    return {
      imageSide,
      imageUrl,
      imageAlt,
      title,
      descriptionHtml,
      list: safeList,
      hasBody: !!(title || descriptionHtml || safeList.length),
    }
  }).filter(r => r.imageUrl || r.hasBody)
})
</script>
