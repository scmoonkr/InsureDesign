<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="User Edit."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="users" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>User Edit.</h1>
          <NuxtLink class="theme-backend-link" to="/backend/users">Back to users</NuxtLink>
        </div>

        <div v-if="!userId" class="theme-backend-state error">User id is required.</div>
        <div v-else-if="pending" class="theme-backend-state">Loading user...</div>
        <div v-else-if="loadError" class="theme-backend-state error">
          Unable to load user information.
        </div>

        <form v-else class="theme-backend-form" @submit.prevent="saveUser">
          <div class="theme-backend-profile-preview">
            <img v-if="form.avatarUrl" :src="form.avatarUrl" :alt="form.name" />
            <span v-else>{{ initials }}</span>
            <div>
              <strong>{{ form.name || 'Unnamed user' }}</strong>
              <small>{{ providerLabel }}</small>
            </div>
          </div>

          <div class="theme-backend-form-grid">
            <label class="theme-form-field">
              <span>Name</span>
              <input v-model="form.name" name="name" maxlength="80" required />
            </label>

            <label class="theme-form-field">
              <span>Nickname</span>
              <input v-model="form.nickname" name="nickname" maxlength="80" />
            </label>

            <label class="theme-form-field">
              <span>Gender</span>
              <select v-model="form.gender" name="gender">
                <option value="">Not set</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="U">Unknown</option>
              </select>
            </label>

            <label class="theme-form-field">
              <span>Status</span>
              <select v-model="form.status" name="status">
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="pending">Pending</option>
              </select>
            </label>

            <label class="theme-form-field">
              <span>Date of Birth</span>
              <input v-model="form.dob" name="dob" type="date" />
            </label>

            <label class="theme-form-field">
              <span>Avatar URL</span>
              <input v-model="form.avatarUrl" name="avatarUrl" type="url" placeholder="https://..." />
            </label>
          </div>

          <div class="theme-form-meta">
            <span v-if="user?.email">{{ user.email }}</span>
            <span>{{ user?.id }}</span>
          </div>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="theme-backend-actions">
            <button class="theme-form-submit" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save User' }}
            </button>
          </div>
        </form>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({
  layout: 'default',
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

const { navItems } = useBackendMenu()

const route = useRoute()
const apiBase = useApiBase()
const userId = computed(() => String(route.query.id || ''))
const message = ref('')
const isError = ref(false)
const isSaving = ref(false)
const form = reactive({
  name: '',
  nickname: '',
  gender: '',
  status: 'active',
  dob: '',
  avatarUrl: '',
})

const { data, pending, error: loadError } = await useFetch<{ user: BackendUser }>(
  () => userId.value ? `${apiBase}/api/backend/users/${userId.value}` : '',
  {
    credentials: 'include',
    server: false,
    immediate: computed(() => Boolean(userId.value)),
    default: () => ({ user: null as unknown as BackendUser }),
  },
)

const user = computed(() => data.value?.user || null)
const initials = computed(() => Array.from((form.name || 'US').trim()).slice(0, 2).join('').toUpperCase())
const providerLabel = computed(() => {
  if (!user.value) {
    return 'User account'
  }

  return `${user.value.provider.toUpperCase()} account / ${user.value.providerId}`
})
const isSidebarOpen = ref(false)

watch(
  user,
  (value) => {
    if (!value) {
      return
    }

    form.name = value.name || ''
    form.nickname = value.nickname || ''
    form.gender = value.gender || ''
    form.status = value.status || 'pending'
    form.dob = value.dob || ''
    form.avatarUrl = value.avatarUrl || ''
  },
  { immediate: true },
)

async function saveUser() {
  if (!userId.value) {
    return
  }

  message.value = ''
  isError.value = false
  isSaving.value = true

  try {
    const result = await $fetch<{ user: BackendUser }>(`${apiBase}/api/backend/users/${userId.value}`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        name: form.name,
        nickname: form.nickname,
        gender: form.gender,
        status: form.status,
        dob: form.dob,
        avatarUrl: form.avatarUrl,
      },
    })

    data.value = result
    message.value = 'User saved.'
  } catch {
    isError.value = true
    message.value = 'Unable to save user.'
  } finally {
    isSaving.value = false
  }
}
</script>



