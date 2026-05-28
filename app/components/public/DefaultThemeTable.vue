<template>
  <table class="theme-table">
    <thead>
      <tr>
        <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.rank">
        <td class="rank">{{ row.rank }}</td>
        <td class="name">{{ row.name }}</td>
        <td class="muted">{{ row.meta }}</td>
        <td class="muted">{{ row.date }}</td>
        <td class="mono">{{ row.value }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
defineProps<{
  columns: Array<{
    key: string
    label: string
  }>
  rows: Array<{
    rank: string
    name: string
    meta: string
    date: string
    value: string
  }>
}>()
</script>
