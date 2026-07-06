<template>
  <div class="theme-default">
    <DefaultThemeTopbar :items="navItems" />

    <DefaultThemeHero
      eyebrow="01 · The Index · Default Theme"
      :corner="siteName"
      title="The"
      emphasis="Index."
      lede="MVP index layout is now the default public InsureDesign theme. It uses a quiet editorial structure with serif display type, thin rules, a sticky topbar, scoped filters, and table-first content."
      foot-left="Scroll for records"
      foot-center="↓"
      foot-right="Template · StyleFamily · Blocks"
    />

    <div class="theme-shell">
      <aside class="theme-sidebar">
        <div class="theme-sidebar-heading">
          <span class="theme-meta">Filters</span>
          <span class="theme-meta">Policy</span>
        </div>
        <div class="theme-filter-list">
          <div class="theme-filter-row"><strong>Division</strong><span>Elite</span></div>
          <div class="theme-filter-row"><strong>Group</strong><span>All</span></div>
          <div class="theme-filter-row"><strong>Stroke</strong><span>Breast</span></div>
          <div class="theme-filter-row"><strong>Course</strong><span>LCM</span></div>
        </div>
      </aside>

      <main class="theme-content">
        <div class="theme-results-head">
          <h2 class="theme-block-title">Men Breast <span class="theme-em">50m LCM</span></h2>
          <span class="theme-meta">Published · Public</span>
        </div>

        <DefaultThemeTable :columns="columns" :rows="rows" />
      </main>
    </div>

    <DefaultThemeFooter
      :columns="footerColumns"
      :imprint="footerImprint"
    />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import DefaultThemeHero from '~/components/public/DefaultThemeHero.vue'
import DefaultThemeTable from '~/components/public/DefaultThemeTable.vue'
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

const navItems = useSiteNav('header')
const siteName = useSiteName()
const footerImprint = computed(() => `© 2026 ${siteName.value} Default Theme · Template controlled · StyleFamily based`)

const columns = [
  { key: 'rank', label: 'Rank' },
  { key: 'name', label: 'Name' },
  { key: 'meta', label: 'Meta' },
  { key: 'date', label: 'Date' },
  { key: 'value', label: 'Value' },
]

const rows = [
  { rank: '01', name: 'Kim Minjun', meta: 'Seoul · Official record', date: '2026-05-18', value: '00:27.85' },
  { rank: '02', name: 'Park Doyun', meta: 'Busan · Verified', date: '2026-05-20', value: '00:28.02' },
  { rank: '03', name: 'Lee Seojun', meta: 'Daegu · Pending issue', date: '2026-05-24', value: '00:28.31' },
  { rank: '04', name: 'Choi Jiho', meta: 'Incheon · Verified', date: '2026-05-26', value: '00:28.77' },
]

const footerColumns = [
  {
    title: 'Contribute',
    body: 'Missing records, corrections, and verifiable source material are accepted through a controlled review process.',
  },
  {
    title: 'Template',
    body: 'Page structure is decided by template. Editors use Markdown and approved blocks only.',
  },
  {
    title: 'Principles',
    body: 'The InsureDesign favors stability, verification, and structured data over free-form page building.',
  },
]
</script>
