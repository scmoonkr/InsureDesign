<template>
  <div class="theme-default">
    <DefaultThemeTopbar :items="navItems" />

    <main class="my-page-editor-shell">
      <div class="my-page-editor-head">
        <h1>새 글 작성</h1>
        <NuxtLink to="/my-page" class="theme-backend-link">← My Page</NuxtLink>
      </div>

      <ContentEditor
        content-type="post"
        mode="author"
        @saved="onSaved"
        @cancel="onCancel"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import ContentEditor from '~/components/admin/ContentEditor.vue'

definePageMeta({ layout: 'default' })

const navItems = useSiteNav('header')
const router = useRouter()

function onSaved(id: string) {
  router.replace(`/my-page/edit/post/${id}`)
}

function onCancel() {
  router.push('/my-page')
}
</script>

<style scoped>
.my-page-editor-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.my-page-editor-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--theme-line);
}
.my-page-editor-head h1 {
  margin: 0;
  font-family: var(--theme-serif);
  font-size: 28px;
  font-weight: 500;
}
</style>
