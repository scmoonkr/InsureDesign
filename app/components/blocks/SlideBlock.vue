<template>
  <div class="block-slide">
    <button
      type="button"
      class="block-slide-nav block-slide-nav-prev"
      :disabled="current === 0"
      aria-label="이전"
      @click="prev"
    >‹</button>

    <div class="block-slide-viewport">
      <figure
        v-for="(slide, i) in slides"
        :key="i"
        v-show="i === current"
        class="block-slide-item"
      >
        <img :src="slide.url" :alt="slide.alt" loading="lazy" />
        <figcaption v-if="slide.title || slide.desc">
          <h3 v-if="slide.title" class="block-slide-title">{{ slide.title }}</h3>
          <p v-if="slide.desc" class="block-slide-desc">{{ slide.desc }}</p>
        </figcaption>
      </figure>
    </div>

    <button
      type="button"
      class="block-slide-nav block-slide-nav-next"
      :disabled="current >= slides.length - 1"
      aria-label="다음"
      @click="next"
    >›</button>

    <div v-if="slides.length > 1" class="block-slide-dots">
      <button
        v-for="(_, i) in slides"
        :key="i"
        type="button"
        :class="['block-slide-dot', { active: i === current }]"
        @click="current = i"
        :aria-label="`${i + 1}번 슬라이드`"
      ></button>
    </div>
  </div>
</template>

<script setup lang="ts">
type MediaInfo = { paths?: { original?: string }; title?: string; alt?: string }
type Item = { imageId?: string; title?: string; desc?: string }

const props = defineProps<{
  block: { props: { items?: Item[] } }
  mediaMap?: Record<string, MediaInfo>
}>()

const current = ref(0)

const slides = computed(() => {
  const items = props.block.props?.items || []
  const mm = props.mediaMap || {}
  return items.map(it => {
    const m = mm[it.imageId || '']
    return {
      url: m?.paths?.original || '',
      alt: m?.alt || m?.title || '',
      title: it.title || '',
      desc: it.desc || '',
    }
  }).filter(s => s.url)
})

function prev() { if (current.value > 0) current.value-- }
function next() { if (current.value < slides.value.length - 1) current.value++ }
</script>
