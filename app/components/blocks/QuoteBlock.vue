<template>
  <blockquote class="block-quote">
    <p>{{ content }}</p>
    <cite v-if="cite" class="block-quote-cite">— {{ cite }}</cite>
  </blockquote>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: {
    props: { content?: string; cite?: string }
  }
}>()
const content = computed(() => props.block.props?.content || '')
const cite = computed(() => props.block.props?.cite || '')
</script>
