<template>
  <footer class="theme-footer">
    <div class="theme-footer-inner">
      <section v-for="column in columns" :key="column.title">
        <h4>{{ column.title }}</h4>
        <p v-if="column.body">{{ column.body }}</p>
        <ul v-if="column.links?.length" class="theme-footer-links">
          <li v-for="link in column.links" :key="link.to + '-' + link.label">
            <NuxtLink
              :to="link.to"
              :target="link.target === 'blank' ? '_blank' : undefined"
            >{{ link.label }}</NuxtLink>
          </li>
        </ul>
      </section>
    </div>
    <div class="theme-imprint">{{ imprint }}</div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{
  columns: Array<{
    title: string
    body?: string
    links?: Array<{ label: string; to: string; target?: 'self' | 'blank' }>
  }>
  imprint: string
}>()
</script>

<style scoped>
.theme-footer-links {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.theme-footer-links a {
  font-size: 13px;
  color: var(--theme-fg-dim);
  text-decoration: none;
}
.theme-footer-links a:hover {
  color: var(--theme-fg);
  text-decoration: underline;
}
</style>
