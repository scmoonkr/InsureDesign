<template>
  <header class="theme-topbar">
    <div
      :class="[
        'theme-topbar-inner',
        {
          'theme-topbar-inner-full': fullWidth,
          'theme-topbar-inner-backend': backendMode,
        },
      ]"
    >
      <NuxtLink class="theme-brand" to="/theme/default">
        <img class="theme-logo" :src="logoSrc" alt="Default theme logo" />
        <span class="theme-brand-text">{{ title }}</span>
      </NuxtLink>

      <div v-if="toolbarTitle && !backendMode" class="theme-topbar-title">{{ toolbarTitle }}</div>

      <button
        v-if="!hideNav || backendMenuButton"
        :class="['theme-menu-button', { open: isMobileMenuOpen }]"
        type="button"
        :aria-expanded="isMobileMenuOpen"
        :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
        @click="handleMenuButtonClick"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav v-if="!hideNav" :class="['theme-nav', { open: isMobileMenuOpen }]">
        <template v-for="item in items" :key="item.to + '-' + item.label">
          <!-- 대표메뉴 (URL 없음) — 클릭 불가, 하위 항목 있으면 dropdown -->
          <div v-if="item.isHeader || (item.children && item.children.length)" class="theme-nav-group">
            <span
              v-if="item.isHeader"
              :class="['theme-nav-header', { current: item.current }]"
            >{{ item.label }}<span v-if="item.children && item.children.length" class="theme-nav-caret">▾</span></span>
            <NuxtLink
              v-else
              :class="['theme-nav-with-children', { current: item.current }]"
              :to="item.to"
              :target="item.target === 'blank' ? '_blank' : undefined"
              @click="closeMobileMenu"
            >{{ item.label }} <span class="theme-nav-caret">▾</span></NuxtLink>

            <div v-if="item.children && item.children.length" class="theme-nav-dropdown">
              <NuxtLink
                v-for="child in item.children"
                :key="child.to + '-' + child.label"
                :to="child.to"
                :target="child.target === 'blank' ? '_blank' : undefined"
                :class="{ current: child.current }"
                @click="closeMobileMenu"
              >{{ child.label }}</NuxtLink>
            </div>
          </div>

          <NuxtLink
            v-else
            :class="{ current: item.current }"
            :to="item.to"
            :target="item.target === 'blank' ? '_blank' : undefined"
            @click="closeMobileMenu"
          >{{ item.label }}</NuxtLink>
        </template>

        <template v-if="user">
          <div class="theme-mobile-menu-divider"></div>
          <button class="theme-mobile-menu-action" type="button" @click="logout">Logout</button>
        </template>
      </nav>

      <div v-if="!hideNav" class="theme-auth">
        <NuxtLink v-if="!user" class="theme-login" to="/login">Login</NuxtLink>
        <div v-else ref="accountMenuRef" class="theme-user">
          <button
            class="theme-avatar-button"
            type="button"
            :aria-expanded="isAccountMenuOpen"
            aria-label="Account menu"
            @click="toggleAccountMenu"
          >
            <img
              v-if="user.avatarUrl"
              class="theme-avatar"
              :src="user.avatarUrl"
              :alt="user.name"
            />
            <span v-else class="theme-avatar theme-avatar-fallback">{{ initials }}</span>
          </button>

          <div v-if="isAccountMenuOpen" class="theme-account-menu">
            <NuxtLink to="/profile" @click="closeAccountMenu">Profile 정보수정</NuxtLink>
            <NuxtLink to="/my-page" @click="closeAccountMenu">My Page</NuxtLink>
            <button type="button" @click="logout">Logout</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string
  fullWidth?: boolean
  backendMode?: boolean
  toolbarTitle?: string
  hideNav?: boolean
  backendMenuButton?: boolean
  items: Array<{
    label: string
    to: string
    current?: boolean
    target?: 'self' | 'blank'
    isHeader?: boolean
    children?: Array<{
      label: string
      to: string
      current?: boolean
      target?: 'self' | 'blank'
    }>
  }>
}>()
const emit = defineEmits<{
  (e: 'backend-menu-toggle'): void
}>()

const logoSrc = '/themes/default/logo.png'
const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
const authMeUrl = `${apiBase}/api/auth/me`
const logoutUrl = `${apiBase}/api/auth/logout`

const { data, refresh } = await useFetch<{ user: null | {
  id: string
  provider: string
  providerId: string
  name: string
  email?: string
  avatarUrl?: string
} }>(authMeUrl, {
  default: () => ({ user: null }),
  credentials: 'include',
  server: false,
  key: 'auth-me',
})

const user = computed(() => data.value?.user || null)
const isAccountMenuOpen = ref(false)
const isMobileMenuOpen = ref(false)
const accountMenuRef = ref<HTMLElement | null>(null)
const initials = computed(() => {
  const name = user.value?.name?.trim() || ''

  return Array.from(name).slice(0, 2).join('').toUpperCase() || 'US'
})

function toggleAccountMenu() {
  isMobileMenuOpen.value = false
  isAccountMenuOpen.value = !isAccountMenuOpen.value
}

function closeAccountMenu() {
  isAccountMenuOpen.value = false
}

function toggleMobileMenu() {
  isAccountMenuOpen.value = false
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function handleMenuButtonClick() {
  if (props.hideNav && props.backendMenuButton) {
    emit('backend-menu-toggle')
    return
  }

  toggleMobileMenu()
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as Element

  if (!target.closest('.theme-topbar-inner')) {
    closeAccountMenu()
    closeMobileMenu()
    return
  }

  if (!accountMenuRef.value?.contains(event.target as Node)) {
    closeAccountMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

async function logout() {
  await $fetch(logoutUrl, { method: 'POST', credentials: 'include' })
  closeAccountMenu()
  closeMobileMenu()
  await refresh()
  await navigateTo('/')
}
</script>
