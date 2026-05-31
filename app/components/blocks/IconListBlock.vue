<template>
  <ul
    :class="[
      'block-iconlist',
      `block-iconlist-cols-${columns}`,
      `block-iconlist-gap-${gap}`,
    ]"
  >
    <li
      v-for="(item, i) in renderedItems"
      :key="i"
      class="block-iconlist-item"
    >
      <span
        :class="['block-iconlist-icon', `block-iconlist-icon-${iconTextColor}`]"
        :style="iconStyle"
      >{{ item.icon }}</span>
      <div class="block-iconlist-body">
        <h4 v-if="item.title" class="block-iconlist-title">{{ item.title }}</h4>
        <div
          v-if="item.descriptionHtml"
          class="block-iconlist-desc"
          v-html="item.descriptionHtml"
        ></div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

type Item = {
  icon?: string
  title?: string
  description?: string
}

const props = defineProps<{
  block: {
    props: {
      columns?: '1' | '2' | '3' | string
      gap?: 'small' | 'medium' | 'large'
      iconColor?: string
      iconTextColor?: 'dark' | 'light'
      items?: Item[]
    }
  }
}>()

const columns = computed(() => {
  const c = props.block.props?.columns
  return c === '1' || c === '3' ? c : '2'
})
const gap = computed(() => {
  const g = props.block.props?.gap
  return g === 'small' || g === 'large' ? g : 'medium'
})
const iconTextColor = computed<'dark' | 'light'>(
  () => (props.block.props?.iconTextColor === 'dark' ? 'dark' : 'light'),
)
const iconStyle = computed(() =>
  props.block.props?.iconColor ? { backgroundColor: props.block.props.iconColor } : undefined,
)


const renderedItems = computed(() => {
  const list = Array.isArray(props.block.props?.items) ? props.block.props.items : []
  return list.map(it => ({
    icon: it?.icon || '•',
    title: it?.title || '',
    descriptionHtml: renderInlineMarkdown(it?.description || ''),
  })).filter(x => x.title || x.descriptionHtml || x.icon !== '•')
})
</script>
