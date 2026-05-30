<template>
  <section
    :class="[
      'block-title',
      `block-title-align-${align}`,
      `block-title-height-${height}`,
      `block-title-text-${textColor}`,
    ]"
    :style="bannerStyle"
  >
    <div class="block-title-inner">
      <h2 class="block-title-title">{{ title }}</h2>
      <p v-if="subtitle" class="block-title-subtitle">{{ subtitle }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string } }

const props = defineProps<{
  block: {
    props: {
      title?: string
      subtitle?: string
      imageId?: string
      backgroundColor?: string
      align?: 'left' | 'center' | 'right'
      height?: 'small' | 'medium' | 'large'
      textColor?: 'dark' | 'light'
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const title = computed(() => props.block.props?.title || '')
const subtitle = computed(() => props.block.props?.subtitle || '')
const align = computed(() => {
  const a = props.block.props?.align
  return (['left', 'center', 'right'] as const).includes(a as never) ? a : 'center'
})
const height = computed(() => {
  const h = props.block.props?.height
  return (['small', 'medium', 'large'] as const).includes(h as never) ? h : 'medium'
})
const textColor = computed(() => (props.block.props?.textColor === 'light' ? 'light' : 'dark'))

const imageUrl = computed(() => {
  const id = props.block.props?.imageId
  if (!id) return ''
  return props.mediaMap?.[id]?.paths?.original || ''
})

const bannerStyle = computed(() => {
  const s: Record<string, string> = {}
  if (props.block.props?.backgroundColor) s.backgroundColor = props.block.props.backgroundColor
  if (imageUrl.value) s.backgroundImage = `url(${imageUrl.value})`
  return s
})
</script>
