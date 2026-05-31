<template>
  <section
    :class="[
      'block-herocards',
      `block-herocards-align-${align}`,
      `block-herocards-overlap-${overlap}`,
    ]"
  >
    <div
      :class="[
        'block-herocards-hero',
        `block-herocards-height-${height}`,
        `block-herocards-text-${textColor}`,
      ]"
      :style="heroStyle"
    >
      <div class="block-herocards-hero-inner">
        <p v-if="eyebrow" class="block-herocards-eyebrow">{{ eyebrow }}</p>
        <h2 v-if="title" class="block-herocards-title">{{ title }}</h2>
        <p v-if="subtitle" class="block-herocards-subtitle">{{ subtitle }}</p>
        <div
          v-if="descriptionHtml"
          class="block-herocards-description"
          v-html="descriptionHtml"
        ></div>
        <a
          v-if="buttonText"
          :class="['block-herocards-cta', 'block-button', `block-button-${buttonStyle}`]"
          :href="buttonHref"
          :target="buttonExternal ? '_blank' : undefined"
          :rel="buttonExternal ? 'noopener' : undefined"
        >{{ buttonText }}</a>
      </div>
    </div>
    <div
      :class="[
        'block-herocards-cards',
        `block-herocards-cards-cols-${cardColumns}`,
        `block-herocards-cards-gap-${cardGap}`,
      ]"
    >
      <article
        v-for="(card, i) in renderedCards"
        :key="i"
        :class="['block-herocards-card', `block-herocards-card-text-${card.textColor}`]"
        :style="card.style"
      >
        <h3 v-if="card.title" class="block-herocards-card-title">{{ card.title }}</h3>
        <div
          v-if="card.descriptionHtml"
          class="block-herocards-card-desc"
          v-html="card.descriptionHtml"
        ></div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

type MediaInfo = { paths?: { original?: string } }
type CardItem = {
  title?: string
  description?: string
  backgroundColor?: string
  textColor?: 'dark' | 'light'
}

const props = defineProps<{
  block: {
    props: {
      eyebrow?: string
      title?: string
      subtitle?: string
      content?: string                      // description body
      imageId?: string
      backgroundColor?: string
      align?: 'left' | 'center' | 'right'
      height?: 'small' | 'medium' | 'large'
      textColor?: 'dark' | 'light'
      buttonText?: string
      buttonUrl?: string
      buttonStyle?: 'primary' | 'secondary' | 'warning'
      cards?: CardItem[]
      cardColumns?: '2' | '3' | '4' | string
      cardGap?: 'small' | 'medium' | 'large'
      cardOverlap?: 'on' | 'off'
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const eyebrow = computed(() => props.block.props?.eyebrow || '')
const title = computed(() => props.block.props?.title || '')
const subtitle = computed(() => props.block.props?.subtitle || '')
const description = computed(() => props.block.props?.content || '')

const align = computed(() => {
  const a = props.block.props?.align
  return (['left', 'center', 'right'] as const).includes(a as never) ? a : 'left'
})
const height = computed(() => {
  const h = props.block.props?.height
  return (['small', 'medium', 'large'] as const).includes(h as never) ? h : 'large'
})
const textColor = computed<'dark' | 'light'>(
  () => (props.block.props?.textColor === 'dark' ? 'dark' : 'light'),
)
const overlap = computed<'on' | 'off'>(
  () => (props.block.props?.cardOverlap === 'off' ? 'off' : 'on'),
)
const cardColumns = computed(() => {
  const c = props.block.props?.cardColumns
  return c === '2' || c === '4' ? c : '3'
})
const cardGap = computed(() => {
  const g = props.block.props?.cardGap
  return g === 'small' || g === 'large' ? g : 'medium'
})

const imageUrl = computed(() => {
  const id = props.block.props?.imageId
  if (!id) return ''
  return props.mediaMap?.[id]?.paths?.original || ''
})
const heroStyle = computed(() => {
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

const descriptionHtml = computed(() => renderInlineMarkdown(description.value))

const renderedCards = computed(() => {
  const list = Array.isArray(props.block.props?.cards) ? props.block.props.cards : []
  return list.map(it => {
    const tc: 'dark' | 'light' = it?.textColor === 'light' ? 'light' : 'dark'
    return {
      title: it?.title || '',
      descriptionHtml: renderInlineMarkdown(it?.description || ''),
      textColor: tc,
      style: it?.backgroundColor ? { backgroundColor: it.backgroundColor } : undefined,
    }
  }).filter(x => x.title || x.descriptionHtml)
})
</script>
