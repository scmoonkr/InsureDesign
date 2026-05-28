<template>
  <footer class="theme-footer">
    <div class="theme-footer-inner">
      <section v-for="column in columns" :key="column.title">
        <h4>{{ column.title }}</h4>
        <p>{{ column.body }}</p>
      </section>
    </div>
    <div class="theme-imprint">{{ imprint }}</div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  columns: Array<{
    title: string
    body: string
  }>
  imprint: string
}>()
</script>
