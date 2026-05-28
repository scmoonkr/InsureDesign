<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      title="Korean Swimming Registry"
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Foundation."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false"></div>

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="foundation" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <section class="theme-foundation theme-foundation-mvp theme-backend-foundation">
          <header class="theme-foundation-head">
            <p class="theme-foundation-kicker">MVP / color-default.md</p>
            <h1>Black & White UI Foundation</h1>
            <p>button, label, border, background-color의 실제 톤과 대비를 한 화면에서 비교합니다.</p>
          </header>

          <section class="theme-foundation-block">
            <h2>Buttons</h2>
            <div class="theme-foundation-buttons">
              <button class="theme-btn mvp-btn-primary" type="button">Primary</button>
              <button class="theme-btn mvp-btn-primary-soft" type="button">Primary Soft</button>
              <button class="theme-btn mvp-btn-secondary" type="button">Secondary</button>
              <button class="theme-btn mvp-btn-secondary-soft" type="button">Secondary Soft</button>
              <button class="theme-btn mvp-btn-success" type="button">Success</button>
              <button class="theme-btn mvp-btn-warning" type="button">Warning</button>
              <button class="theme-btn mvp-btn-error" type="button">Error</button>
            </div>
          </section>

          <section class="theme-foundation-block">
            <h2>Labels</h2>
            <div class="theme-foundation-labels">
              <span class="theme-label mvp-border-focus">Primary Label</span>
              <span class="theme-label mvp-border-subtle">Secondary Label</span>
              <span class="theme-label mvp-label-success">Success Label</span>
              <span class="theme-label mvp-label-warning">Warning Label</span>
              <span class="theme-label mvp-label-error">Error Label</span>
            </div>
          </section>

          <section class="theme-foundation-block">
            <h2>Border Samples</h2>
            <div class="theme-foundation-bg-grid">
              <div class="theme-bg-demo mvp-bg-elevated mvp-border-subtle-box">
                <strong>Subtle Border</strong>
                <p>border: #27272A</p>
              </div>
              <div class="theme-bg-demo mvp-bg-elevated mvp-border-focus-box">
                <strong>Focus Border</strong>
                <p>border: #3B82F6</p>
              </div>
              <div class="theme-bg-demo mvp-bg-elevated mvp-border-success-box">
                <strong>Success Border</strong>
                <p>border: #10B981</p>
              </div>
              <div class="theme-bg-demo mvp-bg-elevated mvp-border-warning-box">
                <strong>Warning Border</strong>
                <p>border: #F59E0B</p>
              </div>
              <div class="theme-bg-demo mvp-bg-elevated mvp-border-error-box">
                <strong>Error Border</strong>
                <p>border: #EF4444</p>
              </div>
            </div>
          </section>

          <section class="theme-foundation-block">
            <h2>Background Color Samples</h2>
            <div class="theme-foundation-bg-grid">
              <div class="theme-bg-demo mvp-bg-base">
                <strong>Base</strong>
                <p>#FFFFFF</p>
              </div>
              <div class="theme-bg-demo mvp-bg-elevated">
                <strong>Elevated</strong>
                <p>#F8F9FB</p>
              </div>
              <div class="theme-bg-demo mvp-bg-overlay">
                <strong>Overlay</strong>
                <p>#F1F3F5</p>
              </div>
              <div class="theme-bg-demo mvp-bg-success-soft">
                <strong>Success Tint</strong>
                <p>#10B981 @ 14%</p>
              </div>
              <div class="theme-bg-demo mvp-bg-warning-soft">
                <strong>Warning Tint</strong>
                <p>#F59E0B @ 14%</p>
              </div>
              <div class="theme-bg-demo mvp-bg-error-soft">
                <strong>Error Tint</strong>
                <p>#EF4444 @ 14%</p>
              </div>
            </div>
          </section>
        </section>
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

const { navItems } = useBackendMenu()

const isSidebarOpen = ref(false)
</script>



