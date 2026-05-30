<template>
  <div class="block-highlight">
    <p>{{ content }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: { props: { content?: string } } }>()
const content = computed(() => props.block.props?.content || '')
</script>
