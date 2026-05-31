<template>
  <div class="block-tabs">
    <div class="block-tabs-bar" role="tablist">
      <button
        v-for="(item, i) in items"
        :key="i"
        type="button"
        :class="['block-tabs-btn', { 'block-tabs-btn-active': i === selectedIndex }]"
        role="tab"
        :aria-selected="i === selectedIndex"
        @click="selectedIndex = i"
      >{{ item.label || `Tab ${i + 1}` }}</button>
    </div>
    <div class="block-tabs-panels">
      <div
        v-for="(item, i) in items"
        :key="i"
        v-show="i === selectedIndex"
        :class="['block-tabs-panel', { 'block-tabs-panel-active': i === selectedIndex }]"
        role="tabpanel"
      >
        <h3 v-if="item.title" class="block-tabs-panel-title">{{ item.title }}</h3>
        <div
          v-if="item.contentHtml"
          class="block-tabs-panel-body"
          v-html="item.contentHtml"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

type Item = {
  label?: string
  title?: string
  content?: string
}

const props = defineProps<{
  block: {
    props: {
      items?: Item[]
    }
  }
}>()


const items = computed(() => {
  const list = Array.isArray(props.block.props?.items) ? props.block.props.items : []
  return list
    .filter(it => it && typeof it === 'object' && (it.label || it.title || it.content))
    .map(it => ({
      label: it.label || '',
      title: it.title || '',
      contentHtml: renderInlineMarkdown(it.content || ''),
    }))
})

const selectedIndex = ref(0)
</script>
