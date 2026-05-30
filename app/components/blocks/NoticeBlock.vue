<template>
  <aside :class="['block-notice', `block-notice-${variant}`]">
    <p>{{ content }}</p>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: {
    props: {
      content?: string
      type?: string
    }
  }
}>()

const VARIANTS = ['info', 'warning', 'success', 'error'] as const

const variant = computed(() => {
  const t = props.block.props?.type
  return (VARIANTS as readonly string[]).includes(t || '') ? t! : 'info'
})

const content = computed(() => props.block.props?.content || '')
</script>
