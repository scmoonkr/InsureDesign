<template>
  <div class="block-text" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { renderInlineMarkdown } from '~/utils/markdown'

const props = defineProps<{
  block: {
    type?: string
    props: {
      markdown?: string
    }
  }
}>()

const rendered = computed(() => renderInlineMarkdown(props.block.props?.markdown || ''))
</script>
