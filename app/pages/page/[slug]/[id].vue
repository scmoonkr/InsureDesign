<template>
  <div class="ip-page">
    <div class="ip-bar">
      <div class="ip-bar-left">
        <button type="button" class="ip-back" @click="$router.back()">← 목록</button>
        <span class="ip-bar-title">{{ pageTitle }}</span>
      </div>
      <div class="ip-bar-right">
        <button v-if="canEdit" type="button" class="ip-btn ip-btn-secondary" @click="goEdit">편집</button>
        <button v-if="record?.analysisResult" type="button" class="ip-btn ip-btn-primary" @click="openProposal">
          제안서 보기 ▶
        </button>
      </div>
    </div>

    <div v-if="pending" class="ip-state">불러오는 중...</div>
    <div v-else-if="loadError" class="ip-state ip-error">{{ loadError }}</div>
    <div v-else ref="viewport" class="viewport" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderProposal } from '~/pages/analysis/insuranceRenderer.js'
import { buildProposalFromAnalysis } from '~/pages/analysis/buildProposalFromAnalysis.js'

definePageMeta({ layout: 'default' })

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap' },
    { rel: 'stylesheet', href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css' },
  ],
})

const route   = useRoute()
const apiBase = useApiBase()
const id      = route.params.id as string

const viewport  = ref<HTMLElement | null>(null)
const pending   = ref(true)
const loadError = ref('')
const record    = ref<any>(null)
const canEdit   = ref(false)

const pageTitle = computed(() =>
  record.value
    ? `${record.value.customerName || ''} · ${record.value.title || '보험 설계서'}`
    : '보험 설계서',
)

function goEdit() { navigateTo('/backend/analysis') }
function openProposal() { window.open(`/analysis?id=${id}`, '_blank') }

onMounted(async () => {
  try {
    const res = await $fetch<{ item: any }>(`${apiBase}/api/analysis/${id}`, {
      credentials: 'include',
    })
    const item = res?.item
    if (!item) { loadError.value = '설계서를 찾을 수 없습니다'; pending.value = false; return }

    record.value  = item
    canEdit.value = true

    let data: any
    if (item.proposalData) {
      data = item.proposalData
    } else if (item.analysisResult) {
      data = buildProposalFromAnalysis(item.analysisResult, {
        customerName: item.customerName,
        agentName:    item.agentName,
      })
    } else {
      loadError.value = '분석 데이터가 없습니다. 먼저 분석(LLM)을 실행하세요.'
      pending.value = false
      return
    }

    pending.value = false
    await nextTick()
    if (viewport.value) renderProposal(data, viewport.value)
  } catch {
    loadError.value = '데이터를 불러올 수 없습니다.'
    pending.value = false
  }
})
</script>

<style scoped>
.ip-page { background: var(--bg-outer, #E8D6B4); min-height: 100vh; }

.ip-bar {
  position: sticky; top: 0; z-index: 200;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px; gap: 12px;
  background: rgba(34, 25, 18, 0.92);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(229, 168, 98, 0.25);
  font-family: -apple-system, sans-serif;
}
.ip-bar-left  { display: flex; align-items: center; gap: 14px; }
.ip-bar-right { display: flex; align-items: center; gap: 8px; }
.ip-back { background: none; border: none; cursor: pointer; font-size: 12px; color: rgba(251,245,236,.6); padding: 0; }
.ip-back:hover { color: #E5A862; }
.ip-bar-title { font-size: 12px; font-weight: 600; color: #E5A862; letter-spacing: .03em; }

.ip-btn { padding: 5px 14px; font-size: 12px; font-weight: 600; border-radius: 4px; border: 1px solid transparent; cursor: pointer; }
.ip-btn-secondary { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.2); color: #fff; }
.ip-btn-secondary:hover { background: rgba(255,255,255,.18); }
.ip-btn-primary { background: #C97A2A; border-color: #A0601E; color: #fff; }
.ip-btn-primary:hover { background: #A0601E; }

.ip-state { padding: 60px 24px; text-align: center; font-family: sans-serif; font-size: 14px; color: #7A6249; }
.ip-error { color: #b71c1c; }
</style>

<style src="~/assets/css/insurance-proposal.css" />
