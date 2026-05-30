<template>
  <div
    :class="['block-row', `block-row-gap-${gap}`]"
    :data-layout="layout"
    :style="rowStyle"
  >
    <div
      v-for="(col, idx) in columns"
      :key="idx"
      class="block-row-col"
    >
      <BlockRenderer :blocks="col" :media-map="mediaMap" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BlockRenderer from './BlockRenderer.vue'

type BlockNode = { type: string; props: Record<string, unknown> }
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }

const props = defineProps<{
  block: {
    props: {
      layout?: string
      gap?: string
      columns?: BlockNode[][]
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const layout = computed(() => String(props.block.props?.layout || '1-1'))
const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'small' || g === 'large' ? g : 'medium'
})
const columns = computed<BlockNode[][]>(() =>
  Array.isArray(props.block.props?.columns) ? props.block.props.columns : [],
)
const rowStyle = computed(() => {
  const tracks = layout.value.split('-').map(n => {
    const num = Number(n)
    return Number.isFinite(num) && num > 0 ? `${num}fr` : '1fr'
  }).join(' ')
  return { display: 'grid', gridTemplateColumns: tracks }
})
</script>
