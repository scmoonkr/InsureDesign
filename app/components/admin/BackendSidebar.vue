<template>
  <aside :class="['theme-backend-menu', { open: open }]">
    <div class="theme-backend-menu-title">Backend Menu</div>

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
</script>
