<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Sites."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="sites" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <h1>Sites.</h1>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ siteList.length }} sites</span>
            <button type="button" class="theme-form-submit" @click="openNew">+ New Site</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">Loading sites...</div>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Name</th>
                <th>Domains</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="site in siteList"
                :key="site.siteId"
                :class="{ current: drawerSiteId === site.siteId && drawerOpen }"
                @click="openEdit(site)"
              >
                <td><code class="theme-backend-content-slug">{{ site.siteId }}</code></td>
                <td><strong>{{ site.name }}</strong></td>
                <td>
                  <div class="theme-backend-domain-chips">
                    <span v-for="d in site.domains" :key="d.host" class="theme-backend-domain-chip">{{ d.host }}</span>
                    <span v-if="!site.domains?.length" class="theme-meta">—</span>
                  </div>
                </td>
                <td>
                  <span :class="['theme-backend-status', site.status || 'active']">{{ site.status || 'active' }}</span>
                </td>
                <td class="theme-meta">{{ formatDate(site.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>

    <!-- ── Drawer ── -->
    <div v-if="drawerOpen" class="theme-backend-user-modal" @click="closeDrawer">
      <div class="theme-backend-user-drawer theme-backend-sites-drawer" @click.stop>

        <div class="theme-backend-user-drawer-head">
          <strong>{{ isNewMode ? 'New Site' : drawerSiteId }}</strong>
          <button type="button" class="theme-backend-close" aria-label="Close" @click="closeDrawer">×</button>
        </div>

        <!-- Tabs (edit mode only) -->
        <nav v-if="!isNewMode" class="theme-backend-drawer-tabs">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            type="button"
            :class="['theme-backend-drawer-tab', { active: activeTab === tab.key }]"
            @click="switchTab(tab.key)"
          >{{ tab.label }}</button>
        </nav>

        <!-- ── Tab: 기본정보 ── -->
        <form v-if="activeTab === 'info'" class="theme-backend-form" @submit.prevent="saveSite">
          <div class="theme-backend-form-grid">
            <label class="theme-form-field">
              <span>Site ID</span>
              <input
                v-model="infoForm.siteId"
                :readonly="!isNewMode"
                :required="isNewMode"
                maxlength="40"
                placeholder="my-site"
              />
            </label>
            <label class="theme-form-field">
              <span>Name</span>
              <input v-model="infoForm.name" required maxlength="100" placeholder="My Site" />
            </label>
            <label class="theme-form-field">
              <span>Status</span>
              <select v-model="infoForm.status">
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
            <label class="theme-form-field">
              <span>Locale</span>
              <select v-model="infoForm.locale">
                <option value="ko">한국어 (ko)</option>
                <option value="en">English (en)</option>
              </select>
            </label>
            <label class="theme-form-field">
              <span>Timezone</span>
              <select v-model="infoForm.timezone">
                <option value="Asia/Seoul">Asia/Seoul (KST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              </select>
            </label>
            <label v-if="!isNewMode" class="theme-form-field">
              <span>Primary Domain</span>
              <select v-model="infoForm.primaryDomain">
                <option value="">— 없음 —</option>
                <option v-for="d in activeSiteDomains" :key="d.host" :value="d.host">{{ d.host }}</option>
              </select>
            </label>
          </div>
          <p v-if="infoMessage" :class="['theme-form-status', { error: infoIsError }]">{{ infoMessage }}</p>
          <div class="theme-backend-actions">
            <button class="theme-form-submit" type="submit" :disabled="infoSaving">
              {{ infoSaving ? 'Saving...' : (isNewMode ? '사이트 생성' : '저장') }}
            </button>
          </div>
        </form>

        <!-- ── Tab: 외관 ── -->
        <div v-if="activeTab === 'appearance'">
          <div v-if="settingsLoading" class="theme-backend-state" style="padding: 32px 0">Loading...</div>
          <template v-else>
            <!-- Logo -->
            <div class="theme-backend-logo-section">
              <div class="theme-backend-logo-preview">
                <img v-if="logoSrc" :src="logoSrc" alt="Logo" />
                <span v-else class="theme-backend-logo-placeholder">LOGO</span>
              </div>
              <div class="theme-backend-logo-actions">
                <p class="theme-form-label">로고 이미지</p>
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <button
                    type="button"
                    class="theme-form-submit theme-form-submit-secondary-soft"
                    :disabled="logoUploading"
                    @click="logoInputRef?.click()"
                  >{{ logoUploading ? '업로드 중...' : '파일 선택' }}</button>
                  <button
                    v-if="settingsForm.logoUrl"
                    type="button"
                    class="theme-backend-link theme-backend-link-danger"
                    style="font-size:12px"
                    @click="settingsForm.logoUrl = ''"
                  >삭제</button>
                </div>
                <input
                  ref="logoInputRef"
                  type="file"
                  accept="image/*"
                  style="display:none"
                  @change="onLogoFile"
                />
                <p v-if="logoError" class="theme-form-status error" style="margin-top:6px">{{ logoError }}</p>
                <p v-if="settingsForm.logoUrl" class="theme-backend-logo-url">{{ settingsForm.logoUrl }}</p>
              </div>
            </div>

            <form class="theme-backend-form" style="padding-top:0" @submit.prevent="saveAppearance">
              <div class="theme-backend-form-grid">
                <label class="theme-form-field">
                  <span>사이트 표시 이름</span>
                  <input v-model="settingsForm.siteName" maxlength="120" placeholder="표시용 사이트 이름" />
                </label>
                <label class="theme-form-field">
                  <span>Site URL</span>
                  <input v-model="settingsForm.siteUrl" type="url" maxlength="500" placeholder="https://example.com" />
                </label>
                <label class="theme-form-field">
                  <span>설명</span>
                  <textarea v-model="settingsForm.description" rows="3" maxlength="300" placeholder="사이트 소개"></textarea>
                </label>
                <label class="theme-form-field">
                  <span>Favicon URL</span>
                  <input v-model="settingsForm.faviconUrl" maxlength="500" placeholder="/favicon.ico 또는 https://..." />
                </label>
                <label class="theme-form-field">
                  <span>테마</span>
                  <div class="theme-backend-theme-picker">
                    <label
                      v-for="t in THEMES"
                      :key="t.value"
                      :class="['theme-backend-theme-card', { selected: settingsForm.theme === t.value }]"
                    >
                      <input v-model="settingsForm.theme" type="radio" :value="t.value" style="display:none" />
                      <div class="theme-backend-theme-swatch" :style="{ background: t.previewColor }"></div>
                      <div class="theme-backend-theme-info">
                        <strong>{{ t.label }}</strong>
                        <small>{{ t.description }}</small>
                      </div>
                      <span v-if="settingsForm.theme === t.value" class="theme-backend-theme-check">✓</span>
                    </label>
                  </div>
                </label>
              </div>
              <p v-if="appearanceMessage" :class="['theme-form-status', { error: appearanceIsError }]">{{ appearanceMessage }}</p>
              <div class="theme-backend-actions">
                <button class="theme-form-submit" type="submit" :disabled="appearanceSaving">
                  {{ appearanceSaving ? 'Saving...' : '저장' }}
                </button>
              </div>
            </form>
          </template>
        </div>

        <!-- ── Tab: 도메인 ── -->
        <template v-if="activeTab === 'domains'">
          <ul class="theme-backend-domains-list" style="margin-top:16px">
            <li v-for="d in activeSiteDomains" :key="d.host" class="theme-backend-domain-row">
              <div class="theme-backend-domain-row-info">
                <span class="theme-backend-domain-host">{{ d.host }}</span>
                <span v-if="d.isPrimary" class="theme-backend-badge badge-type-post" style="font-size:10px">Primary</span>
                <span
                  :class="['theme-backend-status', d.status || 'active']"
                  style="font-size:10px;padding:2px 6px;min-height:auto"
                >{{ d.status || 'active' }}</span>
              </div>
              <button
                type="button"
                class="theme-backend-link theme-backend-link-danger"
                :disabled="domainSaving"
                @click="deleteDomain(d.host)"
              >Remove</button>
            </li>
            <li v-if="!activeSiteDomains.length" class="theme-backend-domain-empty">등록된 도메인이 없습니다.</li>
          </ul>

          <form class="theme-backend-domain-add-form" @submit.prevent="addDomain">
            <input v-model.trim="newDomainHost" placeholder="example.com" maxlength="253" />
            <label class="theme-backend-domain-primary-check">
              <input v-model="newDomainPrimary" type="checkbox" />
              <span>Primary</span>
            </label>
            <button
              type="submit"
              class="theme-form-submit theme-form-submit-secondary-soft"
              :disabled="domainSaving || !newDomainHost"
            >{{ domainSaving ? '...' : '추가' }}</button>
          </form>
          <p v-if="domainMessage" :class="['theme-form-status', { error: domainIsError }]" style="padding:0 24px">
            {{ domainMessage }}
          </p>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'
import { themesMeta } from '~/themes/meta'

definePageMeta({ layout: 'default' })

type SiteDomain = { host: string; isPrimary: boolean; status: string; verifiedAt: string | null }
type Site = {
  id: string; siteId: string; name: string; status: string; locale: string; timezone: string
  themeId: string; domains: SiteDomain[]; primaryDomain: string | null; createdAt: string; updatedAt: string
}
type SiteSettings = { siteName: string; siteUrl: string; description: string; logoUrl: string; faviconUrl: string; theme: string }

const TABS = [
  { key: 'info', label: '기본정보' },
  { key: 'appearance', label: '외관' },
  { key: 'domains', label: '도메인' },
]

const THEMES = themesMeta

const { navItems } = useBackendMenu()
const apiBase = useApiBase()

const isSidebarOpen = ref(false)
const drawerOpen = ref(false)
const isNewMode = ref(false)
const drawerSiteId = ref('')
const activeTab = ref<'info' | 'appearance' | 'domains'>('info')

// Info tab
const infoForm = reactive({ siteId: '', name: '', status: 'active', locale: 'ko', timezone: 'Asia/Seoul', primaryDomain: '' })
const infoMessage = ref('')
const infoIsError = ref(false)
const infoSaving = ref(false)

// Appearance tab
const settingsForm = reactive({ siteName: '', siteUrl: '', description: '', logoUrl: '', faviconUrl: '', theme: 'default' })
const appearanceMessage = ref('')
const appearanceIsError = ref(false)
const appearanceSaving = ref(false)
const settingsLoading = ref(false)
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoUploading = ref(false)
const logoError = ref('')

// Domains tab
const newDomainHost = ref('')
const newDomainPrimary = ref(false)
const domainMessage = ref('')
const domainIsError = ref(false)
const domainSaving = ref(false)

const { data, pending, refresh } = useFetch<{ sites: Site[]; isSuper: boolean }>(
  `${apiBase}/api/admin/sites`,
  { credentials: 'include', server: false, default: () => ({ sites: [], isSuper: false }) },
)

const siteList = computed(() => data.value?.sites ?? [])
const isSuper = computed(() => data.value?.isSuper ?? false)
const activeSite = computed(() => siteList.value.find(s => s.siteId === drawerSiteId.value) ?? null)
const activeSiteDomains = computed(() => activeSite.value?.domains ?? [])
const logoSrc = computed(() => {
  if (!settingsForm.logoUrl) return ''
  return settingsForm.logoUrl.startsWith('http') ? settingsForm.logoUrl : `${apiBase}${settingsForm.logoUrl}`
})

function fillInfoForm(site: Site) {
  infoForm.siteId = site.siteId
  infoForm.name = site.name
  infoForm.status = site.status || 'active'
  infoForm.locale = site.locale || 'ko'
  infoForm.timezone = site.timezone || 'Asia/Seoul'
  infoForm.primaryDomain = site.primaryDomain || ''
}

function openEdit(site: Site) {
  isNewMode.value = false
  drawerSiteId.value = site.siteId
  activeTab.value = 'info'
  fillInfoForm(site)
  infoMessage.value = ''
  infoIsError.value = false
  domainMessage.value = ''
  drawerOpen.value = true
}

function openNew() {
  isNewMode.value = true
  drawerSiteId.value = ''
  activeTab.value = 'info'
  Object.assign(infoForm, { siteId: '', name: '', status: 'active', locale: 'ko', timezone: 'Asia/Seoul', primaryDomain: '' })
  infoMessage.value = ''
  infoIsError.value = false
  drawerOpen.value = true
}

function closeDrawer() { drawerOpen.value = false }

async function switchTab(tab: string) {
  activeTab.value = tab as typeof activeTab.value
  if (tab === 'appearance') await loadSettings()
}

async function loadSettings() {
  if (!drawerSiteId.value || settingsLoading.value) return
  settingsLoading.value = true
  try {
    const result = await $fetch<SiteSettings>(
      `${apiBase}/api/admin/sites/${drawerSiteId.value}/settings`,
      { credentials: 'include' },
    )
    settingsForm.siteName = result.siteName || ''
    settingsForm.siteUrl = result.siteUrl || ''
    settingsForm.description = result.description || ''
    settingsForm.logoUrl = result.logoUrl || ''
    settingsForm.faviconUrl = result.faviconUrl || ''
    settingsForm.theme = result.theme || 'default'
  } catch { /* ignore */ } finally {
    settingsLoading.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function saveSite() {
  infoMessage.value = ''
  infoIsError.value = false
  infoSaving.value = true
  try {
    if (isNewMode.value) {
      const result = await $fetch<{ site: Site }>(`${apiBase}/api/admin/sites`, {
        method: 'POST',
        credentials: 'include',
        body: { siteId: infoForm.siteId, name: infoForm.name, status: infoForm.status, locale: infoForm.locale, timezone: infoForm.timezone },
      })
      await refresh()
      isNewMode.value = false
      drawerSiteId.value = result.site.siteId
      fillInfoForm(result.site)
      infoMessage.value = '사이트가 생성되었습니다.'
    } else {
      const result = await $fetch<{ site: Site }>(`${apiBase}/api/admin/sites/${drawerSiteId.value}`, {
        method: 'PUT',
        credentials: 'include',
        body: { name: infoForm.name, status: infoForm.status, locale: infoForm.locale, timezone: infoForm.timezone, primaryDomain: infoForm.primaryDomain || null },
      })
      await refresh()
      fillInfoForm(result.site)
      infoMessage.value = '저장되었습니다.'
    }
    setTimeout(() => { infoMessage.value = '' }, 2500)
  } catch (err: unknown) {
    infoIsError.value = true
    infoMessage.value = err instanceof Error ? err.message : '저장에 실패했습니다.'
  } finally {
    infoSaving.value = false
  }
}

async function saveAppearance() {
  appearanceMessage.value = ''
  appearanceIsError.value = false
  appearanceSaving.value = true
  try {
    await $fetch(`${apiBase}/api/admin/sites/${drawerSiteId.value}/settings`, {
      method: 'PUT',
      credentials: 'include',
      body: { siteName: settingsForm.siteName, siteUrl: settingsForm.siteUrl, description: settingsForm.description, logoUrl: settingsForm.logoUrl, faviconUrl: settingsForm.faviconUrl, theme: settingsForm.theme },
    })
    appearanceMessage.value = '저장되었습니다.'
    setTimeout(() => { appearanceMessage.value = '' }, 2500)
  } catch (err: unknown) {
    appearanceIsError.value = true
    appearanceMessage.value = err instanceof Error ? err.message : '저장에 실패했습니다.'
  } finally {
    appearanceSaving.value = false
  }
}

async function onLogoFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  input.value = ''
  logoError.value = ''
  logoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('files', file)
    const result = await $fetch<{ items: Array<{ paths: { original: string } }> }>(
      `${apiBase}/api/admin/media/upload`,
      { method: 'POST', credentials: 'include', headers: { 'x-admin-site': drawerSiteId.value }, body: formData },
    )
    const path = result.items?.[0]?.paths?.original
    if (path) settingsForm.logoUrl = path
  } catch (err: unknown) {
    logoError.value = err instanceof Error ? err.message : '업로드 실패'
  } finally {
    logoUploading.value = false
  }
}

async function addDomain() {
  if (!newDomainHost.value || domainSaving.value) return
  domainMessage.value = ''
  domainIsError.value = false
  domainSaving.value = true
  try {
    await $fetch(`${apiBase}/api/admin/sites/${drawerSiteId.value}/domains`, {
      method: 'POST',
      credentials: 'include',
      body: { host: newDomainHost.value, isPrimary: newDomainPrimary.value, status: 'active' },
    })
    await refresh()
    newDomainHost.value = ''
    newDomainPrimary.value = false
    domainMessage.value = '도메인이 추가되었습니다.'
    setTimeout(() => { domainMessage.value = '' }, 2500)
  } catch (err: unknown) {
    domainIsError.value = true
    domainMessage.value = err instanceof Error ? err.message : '추가에 실패했습니다.'
  } finally {
    domainSaving.value = false
  }
}

async function deleteDomain(host: string) {
  if (!confirm(`"${host}" 도메인을 삭제하시겠습니까?`)) return
  domainMessage.value = ''
  domainIsError.value = false
  domainSaving.value = true
  try {
    await $fetch(`${apiBase}/api/admin/sites/${drawerSiteId.value}/domains/${encodeURIComponent(host)}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    await refresh()
    if (infoForm.primaryDomain === host) infoForm.primaryDomain = ''
    domainMessage.value = '도메인이 삭제되었습니다.'
    setTimeout(() => { domainMessage.value = '' }, 2500)
  } catch (err: unknown) {
    domainIsError.value = true
    domainMessage.value = err instanceof Error ? err.message : '삭제에 실패했습니다.'
  } finally {
    domainSaving.value = false
  }
}
</script>
