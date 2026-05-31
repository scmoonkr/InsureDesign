<template>
  <figure v-if="imageUrl" :class="['block-image', `block-image-${width}`]">
    <a
      v-if="linkHref"
      class="block-image-link"
      :href="linkHref"
      :target="linkExternal ? '_blank' : undefined"
      :rel="linkExternal ? 'noopener' : undefined"
    >
      <img :src="imageUrl" :alt="alt" loading="lazy" />
    </a>
    <img v-else :src="imageUrl" :alt="alt" loading="lazy" />
    <figcaption v-if="caption" class="block-image-caption">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type MediaInfo = { paths?: { original?: string }; alt?: string; title?: string }

const props = defineProps<{
  block: {
    props: {
      imageId?: string
      caption?: string
      width?: 'normal' | 'wide' | 'full'
      link?: string
    }
  }
  mediaMap?: Record<string, MediaInfo>
}>()

const imageUrl = computed(() => {
  const id = props.block.props?.imageId
  if (!id) return ''
  return props.mediaMap?.[id]?.paths?.original || ''
})

const alt = computed(() => {
  const id = props.block.props?.imageId
  const m = id ? props.mediaMap?.[id] : undefined
  return m?.alt || m?.title || props.block.props?.caption || ''
})

const caption = computed(() => props.block.props?.caption || '')

const width = computed(() => {
  const w = props.block.props?.width
  return w === 'wide' || w === 'full' ? w : 'normal'
})

function isSafeUrl(url: string | undefined | null): url is string {
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('#')) return true
  return /^(https?|mailto|tel):/i.test(url)
}

const linkHref = computed(() => {
  const raw = props.block.props?.link
  return isSafeUrl(raw) ? raw : ''
})
const linkExternal = computed(() => /^https?:/i.test(linkHref.value))
</script>
