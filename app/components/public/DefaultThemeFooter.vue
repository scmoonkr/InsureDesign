<template>
  <footer :class="['theme-footer', { 'theme-footer-row-mode': isRowMode }]">
    <div class="theme-footer-inner" :style="innerGridStyle">
      <section
        v-for="column in columns"
        :key="(column.title || '') + (column.layout || '')"
        :class="['theme-footer-col', { 'theme-footer-col-row': column.layout === 'row' }]"
      >
        <h4 v-if="column.title" class="theme-footer-col-title">
          <NuxtLink
            v-if="column.titleTo && column.titleTo !== '#'"
            :to="column.titleTo"
            :target="column.titleTarget === 'blank' ? '_blank' : undefined"
          >{{ column.title }}</NuxtLink>
          <span v-else>{{ column.title }}</span>
        </h4>
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
import { computed } from 'vue'

const props = defineProps<{
  columns: Array<{
    title: string
    titleTo?: string
    titleTarget?: 'self' | 'blank'
    body?: string
    links?: Array<{ label: string; to: string; target?: 'self' | 'blank' }>
    layout?: 'row' | 'column'
  }>
  imprint: string
}>()

// Whole footer collapses to a single row when the only column is row-laid-out
// (e.g., a flat nav copied from the main menu). Other shapes keep the grid columns.
const isRowMode = computed(() =>
  props.columns.length === 1 && props.columns[0]?.layout === 'row',
)

// Override the default 3-column grid so however many menu items are configured,
// they all fit in one row on desktop. We pass the count as a CSS custom property
// rather than a direct `grid-template-columns` so the mobile @media rule (which
// sets the property directly) can still collapse the layout to a single column.
const innerGridStyle = computed(() => ({
  '--footer-cols': String(Math.max(1, props.columns.length)),
}))
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

/* Row layout — used when footer menu items are flat (copied main menu pattern). */
.theme-footer-col-row .theme-footer-links {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 28px;
  margin: 0;
}
.theme-footer-col-row .theme-footer-links a {
  font-size: 14px;
}

/* Collapse the 3-column footer grid to a single centered row when row-mode is on.
   Higher specificity than the global `.theme-footer-inner` rule so it wins. */
.theme-footer-row-mode .theme-footer-inner {
  grid-template-columns: 1fr;
  text-align: center;
}
.theme-footer-row-mode .theme-footer-col {
  display: flex;
  justify-content: center;
}
</style>
