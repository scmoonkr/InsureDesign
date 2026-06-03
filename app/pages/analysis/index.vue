<template>
  <div class="ia-shell">
    <div class="ia-bar">
      <span class="ia-bar-title">{{ data.title }}</span>
      <span class="ia-bar-meta">{{ data.customer?.name }} · {{ data.customer?.age }}세 · {{ data.pages?.length }}p</span>
    </div>

    <div v-if="loadError" class="ia-error">{{ loadError }}</div>

    <div ref="viewport" class="viewport" id="viewport" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderProposal } from './insuranceRenderer.js'
import { buildProposalFromAnalysis } from './buildProposalFromAnalysis.js'
import blueprintData from './planning2_analysis.json'
import openningData from './opening.json'

definePageMeta({ layout: 'default' })

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

const route = useRoute()
const apiBase = useApiBase()

const staticAllPages = [...(openningData as any[]), ...(blueprintData as any).pages]
  .sort((a: any, b: any) => (a.pageNo || 0) - (b.pageNo || 0))
const staticData = { ...(blueprintData as any), pages: staticAllPages }

const data = ref<any>(staticData)
const viewport = ref<HTMLElement | null>(null)
const loadError = ref('')

onMounted(async () => {
  if (!viewport.value) return

  const id = route.query.id as string | undefined
  if (!id) {
    renderProposal(data.value, viewport.value)
    return
  }

  try {
    const res = await $fetch<{ item: any }>(`${apiBase}/api/analysis/${id}`, {
      credentials: 'include',
    })
    const item = res?.item

    if (item?.proposalData) {
      data.value = item.proposalData
    } else if (item?.analysisResult) {
      data.value = buildProposalFromAnalysis(item.analysisResult, {
        customerName: item.customerName,
        agentName:    item.agentName,
      })
    }

    renderProposal(data.value, viewport.value)
  } catch {
    renderProposal(data.value, viewport.value)
  }
})
</script>

<style scoped>
.ia-shell {
  background: var(--bg-outer, #E8D6B4);
  min-height: 100vh;
}
.ia-bar {
  position: sticky;
  top: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: rgba(34, 25, 18, 0.92);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid rgba(229, 168, 98, 0.25);
  font-family: -apple-system, sans-serif;
}
.ia-bar-title { font-size: 12px; font-weight: 600; color: #E5A862; letter-spacing: 0.03em; }
.ia-bar-meta  { font-size: 11px; color: rgba(251, 245, 236, 0.45); }
.ia-error {
  padding: 16px 24px;
  background: #fdecea;
  color: #b71c1c;
  font-family: sans-serif;
  font-size: 14px;
  text-align: center;
}
</style>

<style src="~/assets/css/insurance-proposal.css" />
