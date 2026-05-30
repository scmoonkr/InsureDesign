<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <section class="theme-stub">
      <div class="theme-eyebrow">02 · The Errata · Corrections</div>
      <h1>The <span class="theme-em">Errata.</span></h1>
      <p class="theme-lede">
        The MVP errata pattern is applied as the default correction-log layout. It is built for
        long text, dates, reporters, issue references, and permanent revision history.
      </p>
      <div class="theme-meta">12 corrections · sample</div>
    </section>

    <main class="theme-page-body">
      <section class="theme-block">
        <div class="theme-block-head">
          <h2 class="theme-block-title">Correction <span class="theme-em">Log.</span></h2>
          <span class="theme-meta">Entries · chronological</span>
        </div>

        <DefaultThemeTable :columns="columns" :rows="rows" />
      </section>

      <section class="theme-block">
        <div class="theme-block-head">
          <h2 class="theme-block-title">Operating <span class="theme-em">Rule.</span></h2>
          <span class="theme-meta">Process</span>
        </div>
        <p class="theme-prose">
          Corrections are verified through the admin policy layer and tracked through revision
          history and audit logs. The page does not accept arbitrary HTML or CSS.
        </p>
      </section>
    </main>

    <DefaultThemeFooter :columns="footerColumns" imprint="© 2026 CMS Default Theme · Errata pattern" />
  </div>
</template>

<script setup lang="ts">
import DefaultThemeFooter from '~/components/public/DefaultThemeFooter.vue'
import DefaultThemeTable from '~/components/public/DefaultThemeTable.vue'
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

const navItems = useSiteNav('header')

const columns = [
  { key: 'rank', label: 'No.' },
  { key: 'name', label: 'Correction' },
  { key: 'meta', label: 'Reporter' },
  { key: 'date', label: 'Date' },
  { key: 'value', label: 'Issue' },
]

const rows = [
  {
    rank: '01',
    name: 'Missing record added',
    meta: 'Self report',
    date: '2026-05-18',
    value: 'Issue 07',
  },
  {
    rank: '02',
    name: 'Record typo corrected',
    meta: 'Admin verified',
    date: '2026-05-20',
    value: 'Issue 07',
  },
  {
    rank: '03',
    name: 'Meet name corrected',
    meta: 'Anonymous report',
    date: '2026-05-24',
    value: 'Issue 08',
  },
]

const footerColumns = [
  {
    title: 'Contribute',
    body: 'Only verifiable reports are reflected, and every correction remains traceable.',
  },
  {
    title: 'In Print',
    body: 'Public pages and print-ready records are generated from the same source data.',
  },
  {
    title: 'Principles',
    body: 'The system prioritizes controlled input and verifiable records.',
  },
]
</script>
