<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Users List."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="users" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head">
          <h1>Users List.</h1>
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
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
                :class="{ current: user.id === selectedUserId }"
                @click="startEdit(user)"
              >
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
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>

    <div v-if="isEditorOpen" class="theme-backend-user-modal" @click="closeEditor">
      <div class="theme-backend-user-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>Edit User</strong>
          <button type="button" class="theme-backend-close" aria-label="Close editor" @click="closeEditor">
            ×
          </button>
        </div>

        <form v-if="selectedUser" class="theme-backend-form" @submit.prevent="saveUser">
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
            <span v-if="selectedUser.email">{{ selectedUser.email }}</span>
            <span>{{ selectedUser.id }}</span>
          </div>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="theme-backend-actions">
            <button class="theme-form-submit theme-form-submit-secondary-soft" type="button" @click="clearForm">
              신규작성
            </button>
            <button class="theme-form-submit theme-form-submit-warning" type="button" :disabled="isSaving" @click="deleteUser">
              삭제
            </button>
            <button class="theme-form-submit" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : '저장' }}
            </button>
          </div>
        </form>
      </div>
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

const apiBase = useApiBase()
const isSidebarOpen = ref(false)
const isEditorOpen = ref(false)
const selectedUserId = ref('')
const message = ref('')
const isError = ref(false)
const isSaving = ref(false)

const { data, pending, error: loadError } = await useFetch<{ users: BackendUser[] }>(
  `${apiBase}/api/backend/users`,
  {
    credentials: 'include',
    server: false,
    default: () => ({ users: [] }),
  },
)

const users = ref<BackendUser[]>([])
watch(
  () => data.value?.users,
  (value) => {
    users.value = value ? [...value] : []
  },
  { immediate: true },
)

const form = reactive({
  name: '',
  nickname: '',
  gender: '',
  status: 'active',
  dob: '',
  avatarUrl: '',
})

const selectedUser = computed(() => users.value.find((user) => user.id === selectedUserId.value) || null)
const initials = computed(() => Array.from((form.name || 'US').trim()).slice(0, 2).join('').toUpperCase())
const providerLabel = computed(() => {
  if (!selectedUser.value) {
    return 'User account'
  }

  return `${selectedUser.value.provider.toUpperCase()} account / ${selectedUser.value.providerId}`
})

function getInitials(user: BackendUser) {
  return Array.from((user.name || user.nickname || 'US').trim()).slice(0, 2).join('').toUpperCase()
}

function fillForm(user: BackendUser) {
  form.name = user.name || ''
  form.nickname = user.nickname || ''
  form.gender = user.gender || ''
  form.status = user.status || 'pending'
  form.dob = user.dob || ''
  form.avatarUrl = user.avatarUrl || ''
}

function startEdit(user: BackendUser) {
  selectedUserId.value = user.id
  fillForm(user)
  message.value = ''
  isError.value = false
  isEditorOpen.value = true
}

function closeEditor() {
  isEditorOpen.value = false
}

function clearForm() {
  form.name = ''
  form.nickname = ''
  form.gender = ''
  form.status = 'pending'
  form.dob = ''
  form.avatarUrl = ''
}

async function saveUser() {
  if (!selectedUser.value) {
    return
  }

  message.value = ''
  isError.value = false
  isSaving.value = true

  try {
    const result = await $fetch<{ user: BackendUser }>(`${apiBase}/api/backend/users/${selectedUser.value.id}`, {
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

    const index = users.value.findIndex((user) => user.id === result.user.id)
    if (index >= 0) {
      users.value[index] = result.user
    }

    fillForm(result.user)
    message.value = 'User saved.'
  } catch {
    isError.value = true
    message.value = 'Unable to save user.'
  } finally {
    isSaving.value = false
  }
}

async function deleteUser() {
  if (!selectedUser.value || isSaving.value) {
    return
  }

  const target = selectedUser.value
  const ok = window.confirm(`Delete user ${target.name}?`)
  if (!ok) {
    return
  }

  message.value = ''
  isError.value = false
  isSaving.value = true

  try {
    await $fetch(`${apiBase}/api/backend/users/${target.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    users.value = users.value.filter((user) => user.id !== target.id)
    selectedUserId.value = ''
    clearForm()
    isEditorOpen.value = false
    message.value = 'User deleted.'
  } catch {
    isError.value = true
    message.value = 'Unable to delete user.'
  } finally {
    isSaving.value = false
  }
}
</script>



