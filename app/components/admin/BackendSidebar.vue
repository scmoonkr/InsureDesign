<template>
  <aside :class="['theme-backend-menu', { open: open }]">
    <div class="theme-backend-menu-title">Backend Menu</div>

    <div v-if="sites.length > 1" class="theme-backend-site-select">
      <select :value="activeSiteId" @change="selectSite(($event.target as HTMLSelectElement).value)">
        <option v-for="site in sites" :key="site.siteId" :value="site.siteId">
          {{ site.name }}
        </option>
      </select>
    </div>
    <div v-else-if="activeSite" class="theme-backend-site-badge">
      {{ activeSite.name }}
      <span v-if="isSuper" class="theme-backend-site-super">super</span>
    </div>

    <nav class="theme-backend-nav">
      <NuxtLink
        v-for="item in menuItems"
        :key="item.key"
        :class="{ current: item.key === currentKey }"
        :to="item.to"
        @click="$emit('close')"
      >
        {{ item.label }}
        <span>{{ item.key }}</span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  currentKey: string
}>()

defineEmits<{ close: [] }>()

const { menuItems } = useBackendMenu()
const { activeSiteId, activeSite, sites, isSuper, selectSite } = useSiteAdmin()
</script>
