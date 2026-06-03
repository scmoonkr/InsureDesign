<template>
  <div class="ip-block">
    <div v-if="loadError" class="ip-block-error">{{ loadError }}</div>
    <div v-else ref="viewport" class="viewport" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderProposal } from '~/pages/analysis/insuranceRenderer.js'
import { buildProposalFromAnalysis } from '~/pages/analysis/buildProposalFromAnalysis.js'

const props = defineProps<{
  block: { type?: string; props: { id?: string } }
  mediaMap?: Record<string, unknown>
}>()

const apiBase = useApiBase()
const viewport = ref<HTMLElement | null>(null)
const loadError = ref('')

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css',
    },
  ],
})

onMounted(async () => {
  if (!viewport.value) return

  const id = props.block.props?.id
  if (!id) {
    loadError.value = '[insurancePlanning] id 옵션을 지정하세요 (:::insurancePlanning\nid: <레코드ID>\n:::)'
    return
  }

  try {
    const res = await $fetch<{ item: any }>(`${apiBase}/api/analysis/${id}`, {
      credentials: 'include',
    })
    const item = res?.item
    if (!item) { loadError.value = '레코드를 찾을 수 없습니다'; return }

    let data
    if (item.proposalData) {
      data = item.proposalData
    } else if (item.analysisResult) {
      data = buildProposalFromAnalysis(item.analysisResult, {
        customerName: item.customerName,
        agentName:    item.agentName,
      })
    } else {
      loadError.value = '분석 데이터가 없습니다. 먼저 분석(LLM)을 실행하세요.'
      return
    }

    renderProposal(data, viewport.value)
  } catch {
    loadError.value = '보험 설계 데이터를 불러올 수 없습니다.'
  }
})
</script>

<style>
@import '~/assets/css/insurance-proposal.css';
</style>

<style scoped>
.ip-block {
  background: var(--bg-outer, #E8D6B4);
  overflow-x: auto;
}

.ip-block-error {
  padding: 20px 24px;
  background: #fdecea;
  color: #b71c1c;
  font-family: monospace;
  font-size: 13px;
  border-left: 4px solid #b71c1c;
}
</style>
