<template>
  <!-- access 없으면 즉시 렌더 -->
  <slot v-if="!needsCheck || canAccess" />

  <!-- 체크 중 (로딩) -->
  <div v-else-if="!fetched" class="bag-skeleton" />

  <!-- 미로그인 -->
  <div v-else-if="!isLoggedIn" class="bag-lock">
    <span class="bag-icon">🔒</span>
    <p class="bag-msg">로그인이 필요한 콘텐츠입니다.</p>
    <a href="/login" class="bag-btn">로그인</a>
  </div>

  <!-- 권한 부족 -->
  <div v-else class="bag-lock">
    <span class="bag-icon">⛔</span>
    <p class="bag-msg">이 콘텐츠를 볼 권한이 없습니다.</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ access?: string }>()

const { hasAccess, isLoggedIn, fetchUser, fetched } = useBlockAuth()

const needsCheck = computed(() => !!props.access && props.access !== 'public')
const canAccess  = computed(() => hasAccess(props.access))

onMounted(() => {
  if (needsCheck.value) fetchUser()
})
</script>

<style scoped>
.bag-skeleton {
  height: 80px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: bag-shimmer 1.4s infinite;
  border-radius: 6px;
}
@keyframes bag-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }

.bag-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 36px 24px;
  border: 1px dashed #ddd;
  border-radius: 8px;
  background: #fafafa;
  text-align: center;
}
.bag-icon { font-size: 28px; line-height: 1; }
.bag-msg  { margin: 0; font-size: 14px; color: #666; }
.bag-btn  {
  display: inline-block;
  padding: 7px 20px;
  background: #1a1a1a;
  color: #fff;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.bag-btn:hover { background: #333; }
</style>
