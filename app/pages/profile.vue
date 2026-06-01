<template>
  <div class="theme-default">
    <DefaultThemeTopbar title="Korean Swimming Registry" :items="navItems" />

    <main class="theme-page-body theme-profile-page">
      <section class="theme-profile-section">
        <p class="theme-eyebrow">Account</p>
        <h1>Profile</h1>
        <p>Update your public profile information.</p>

        <div v-if="pending" class="theme-form-status">Loading profile...</div>
        <div v-else-if="loadError" class="theme-form-status error">
          Login is required to edit your profile.
        </div>

        <form v-else class="theme-profile-form" @submit.prevent="saveProfile">
          <div class="theme-profile-preview">
            <img
              v-if="form.avatarUrl"
              class="theme-profile-avatar"
              :src="form.avatarUrl"
              :alt="form.name"
            />
            <span v-else class="theme-profile-avatar fallback">{{ initials }}</span>
          </div>

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
            <span>Date of Birth</span>
            <input v-model="form.dob" name="dob" type="date" />
          </label>

          <label class="theme-form-field">
            <span>Avatar URL</span>
            <input v-model="form.avatarUrl" name="avatarUrl" type="url" placeholder="https://..." />
          </label>

          <div class="theme-form-meta">
            <span>{{ providerLabel }}</span>
            <span v-if="user?.email">{{ user.email }}</span>
          </div>

          <p v-if="message" :class="['theme-form-status', { error: isError }]">{{ message }}</p>

          <div class="theme-form-actions">
            <button class="theme-form-submit" type="submit" :disabled="isSaving">
              {{ isSaving ? 'Saving...' : 'Save Profile' }}
            </button>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'

definePageMeta({
  layout: 'default',
})

const navItems = useSiteNav('header')

type ProfileUser = {
  id: string
  provider: string
  providerId: string
  name: string
  nickname?: string
  email?: string
  avatarUrl?: string
  gender?: string
  dob?: string
}

const apiBase = useApiBase()
const message = ref('')
const isError = ref(false)
const isSaving = ref(false)
const form = reactive({
  name: '',
  nickname: '',
  gender: '',
  dob: '',
  avatarUrl: '',
})

const { data, pending, error: loadError } = await useFetch<{ user: ProfileUser }>(
  `${apiBase}/api/users/me`,
  {
    credentials: 'include',
    server: false,
    default: () => ({ user: null as unknown as ProfileUser }),
  },
)

const user = computed(() => data.value?.user || null)
const initials = computed(() => Array.from(form.name.trim()).slice(0, 2).join('').toUpperCase() || 'US')
const providerLabel = computed(() => {
  if (!user.value?.provider) {
    return 'Account'
  }

  return `${user.value.provider.toUpperCase()} account`
})

watch(
  user,
  (value) => {
    if (!value) {
      return
    }

    form.name = value.name || ''
    form.nickname = value.nickname || ''
    form.gender = value.gender || ''
    form.dob = value.dob || ''
    form.avatarUrl = value.avatarUrl || ''
  },
  { immediate: true },
)

async function saveProfile() {
  message.value = ''
  isError.value = false
  isSaving.value = true

  try {
    const result = await $fetch<{ user: ProfileUser }>(`${apiBase}/api/users/me`, {
      method: 'PUT',
      credentials: 'include',
      body: {
        name: form.name,
        nickname: form.nickname,
        gender: form.gender,
        dob: form.dob,
        avatarUrl: form.avatarUrl,
      },
    })

    data.value = result
    await refreshNuxtData('auth-me')
    message.value = 'Profile saved.'
  } catch {
    isError.value = true
    message.value = 'Unable to save profile.'
  } finally {
    isSaving.value = false
  }
}
</script>
