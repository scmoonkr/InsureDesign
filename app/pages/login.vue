<template>
  <div class="theme-default">
    <DefaultThemeTopbar :items="navItems" />

    <main class="theme-auth-page">
      <section class="theme-auth-panel">
        <p class="theme-eyebrow">Account</p>
        <h1>Login <span class="theme-em">or Join.</span></h1>
        <p>
          Kakao 또는 Naver 계정으로 로그인합니다. 처음 로그인하면 자동으로 회원가입됩니다.
        </p>

        <div class="theme-social-actions">
          <a class="theme-social-button kakao" :href="authUrl('kakao')">Kakao로 계속하기</a>
          <a class="theme-social-button naver" :href="authUrl('naver')">Naver로 계속하기</a>
        </div>
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

const apiBase = useApiBase()

function authUrl(provider: 'kakao' | 'naver') {
  return `${apiBase}/api/auth/${provider}`
}
</script>
