<template>
  <div :class="['block-postlist', `block-postlist-cols-${columns}`]">
    <p v-if="loading" class="block-postlist-loading">Loading posts…</p>
    <p v-else-if="!posts.length" class="block-postlist-empty">표시할 글이 없습니다.</p>
    <article
      v-for="post in posts"
      v-else
      :key="post.id"
      :class="['block-postlist-card', { 'block-postlist-card-featured': post.featured }]"
    >
      <NuxtLink
        v-if="showFeatured && post.thumbnailUrl"
        :to="`/post/${post.slug}`"
        class="block-postlist-card-thumb"
      >
        <img :src="post.thumbnailUrl" :alt="post.title" loading="lazy" />
        <span v-if="post.featured" class="block-postlist-card-badge">★ Featured</span>
      </NuxtLink>
      <div class="block-postlist-card-body">
        <h3 class="block-postlist-card-title">
          <NuxtLink :to="`/post/${post.slug}`">{{ post.title }}</NuxtLink>
        </h3>
        <p
          v-if="(showAuthor && post.author?.name) || (showDate && post.publishedAt)"
          class="block-postlist-card-meta"
        >
          <img
            v-if="showAuthor && post.author?.avatarUrl"
            :src="post.author.avatarUrl"
            :alt="post.author.name"
            class="block-postlist-card-avatar"
          />
          <span v-if="showAuthor && post.author?.name">{{ post.author.name }}</span>
          <span v-if="showDate && post.publishedAt">{{ formatDate(post.publishedAt) }}</span>
        </p>
        <p v-if="showExcerpt && post.summary" class="block-postlist-card-excerpt">{{ post.summary }}</p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Post = {
  id: string
  title: string
  slug: string
  summary: string
  publishedAt: string | null
  featured: boolean
  thumbnailUrl: string
  author: { id: string; name: string; avatarUrl: string } | null
}

const props = defineProps<{
  block: {
    props: {
      categories?: string
      tags?: string
      limit?: number | string
      columns?: '2' | '3' | '4' | string
      showFeatured?: 'on' | 'off'
      showAuthor?: 'on' | 'off'
      showDate?: 'on' | 'off'
      showExcerpt?: 'on' | 'off'
    }
  }
}>()

const columns = computed(() => {
  const c = props.block.props?.columns
  return c === '2' || c === '4' ? c : '3'
})
const limit = computed(() => {
  const n = Number(props.block.props?.limit)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24) : 6
})
const categories = computed(() => String(props.block.props?.categories || '').trim())
const tags = computed(() => String(props.block.props?.tags || '').trim())

const showFeatured = computed(() => props.block.props?.showFeatured !== 'off')
const showAuthor = computed(() => props.block.props?.showAuthor !== 'off')
const showDate = computed(() => props.block.props?.showDate !== 'off')
const showExcerpt = computed(() => props.block.props?.showExcerpt !== 'off')

const apiBase = useApiBase()

const url = computed(() => {
  const p = new URLSearchParams()
  if (categories.value) p.set('categories', categories.value)
  if (tags.value) p.set('tags', tags.value)
  p.set('limit', String(limit.value))
  return `${apiBase}/api/public/post-cards?${p}`
})

const { data, pending } = useFetch<{ items: Post[] }>(url, {
  key: () => `postlist:${url.value}`,
  default: () => ({ items: [] }),
  watch: [url],
})

const posts = computed<Post[]>(() => data.value?.items ?? [])
const loading = computed(() => pending.value)

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>
