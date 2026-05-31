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
      <div v-if="description" class="block-title-description" v-html="renderedDescription"></div>
      <a
        v-if="buttonText"
        :class="['block-title-cta', 'block-button', `block-button-${buttonStyle}`]"
        :href="buttonHref"
        :target="buttonExternal ? '_blank' : undefined"
        :rel="buttonExternal ? 'noopener' : undefined"
      >{{ buttonText }}</a>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

type MediaInfo = { paths?: { original?: string } }

const props = defineProps<{
  block: {
    props: {
      title?: string
      subtitle?: string
      content?: string                  // long-form description (inline markdown)
      imageId?: string
      backgroundColor?: string
      align?: 'left' | 'center' | 'right'
      height?: 'small' | 'medium' | 'large'
      textColor?: 'dark' | 'light'
      buttonText?: string
      buttonUrl?: string
      buttonStyle?: 'primary' | 'secondary' | 'warning'
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const title = computed(() => props.block.props?.title || '')
const subtitle = computed(() => props.block.props?.subtitle || '')
const description = computed(() => props.block.props?.content || '')
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

const buttonText = computed(() => props.block.props?.buttonText || '')
const buttonStyle = computed(() => {
  const s = props.block.props?.buttonStyle
  return (['primary', 'secondary', 'warning'] as const).includes(s as never) ? s : 'primary'
})

function isSafeUrl(url: string | undefined | null): url is string {
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('#')) return true
  return /^(https?|mailto|tel):/i.test(url)
}

const buttonHref = computed(() => {
  const raw = props.block.props?.buttonUrl
  return isSafeUrl(raw) ? raw : '#'
})
const buttonExternal = computed(() => /^https?:/i.test(buttonHref.value))

const renderedDescription = computed(() => renderInlineMarkdown(description.value))
</script>
