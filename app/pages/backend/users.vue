<template>
  <div class="theme-backend">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <div class="theme-backend-shell">
      <aside class="theme-backend-menu">
        <div class="theme-backend-menu-title">Backend Menu</div>
        <nav class="theme-backend-nav">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.key"
            :class="{ current: item.key === 'users' }"
            :to="item.to"
          >
            {{ item.label }}
            <span>{{ item.key }}</span>
          </NuxtLink>
        </nav>
      </aside>

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Users <span class="theme-em">List.</span></h1>
          <span class="theme-meta">{{ users.length }} accounts</span>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading users...</div>
        <div v-else-if="loadError" class="theme-backend-state error">
          Login is required to view backend users.
        </div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Provider</th>
                <th>Gender</th>
                <th>DOB</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <div class="theme-backend-user-cell">
                    <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
                    <span v-else>{{ getInitials(user) }}</span>
                    <div>
                      <strong>{{ user.name }}</strong>
                      <small>{{ user.nickname || user.email || user.id }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ user.provider }}</td>
                <td>{{ user.gender || '-' }}</td>
                <td>{{ user.dob || '-' }}</td>
                <td>
                  <span :class="['theme-backend-status', user.status || 'pending']">
                    {{ user.status || 'pending' }}
                  </span>
                </td>
                <td>
                  <NuxtLink class="theme-backend-link" :to="`/backend/user?id=${user.id}`">
                    Edit
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

definePageMeta({
  layout: false,
})

type BackendUser = {
  id: string
  provider: string
  providerId: string
  name: string
  nickname?: string
  email?: string
  avatarUrl?: string
  gender?: string
  dob?: string
  status?: string
}

const navItems = [
  { label: 'The Index', to: '/' },
  { label: 'The Errata', to: '/errata' },
  { label: 'Backend', to: '/backend', current: true },
  { label: 'Admin', to: '/admin' },
]

const menuItems = [
  { key: 'pages', label: 'Pages', to: '/backend' },
  { key: 'posts', label: 'Posts', to: '/backend' },
  { key: 'categories', label: 'Categories', to: '/backend' },
  { key: 'tags', label: 'Tags', to: '/backend' },
  { key: 'images', label: 'Images', to: '/backend' },
  { key: 'users', label: 'Users', to: '/backend/users' },
]

const config = useRuntimeConfig()
const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

const { data, pending, error: loadError } = await useFetch<{ users: BackendUser[] }>(
  `${apiBase}/api/backend/users`,
  {
    credentials: 'include',
    server: false,
    default: () => ({ users: [] }),
  },
)

const users = computed(() => data.value?.users || [])

function getInitials(user: BackendUser) {
  return Array.from((user.name || user.nickname || 'US').trim()).slice(0, 2).join('').toUpperCase()
}
</script>
