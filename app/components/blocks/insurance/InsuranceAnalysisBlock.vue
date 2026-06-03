<template>
  <div class="ia-block">
    <!-- 헤더 -->
    <div class="ia-block-head">
      <h2>{{ block.props?.title || 'Insurance Analysis' }}</h2>
      <div class="ia-block-head-right">
        <span class="ia-block-meta">{{ items.length }}건</span>
        <button type="button" class="ia-block-btn-primary" @click="openNew">+ 새 설계</button>
      </div>
    </div>

    <!-- 테이블 -->
    <div v-if="pending" class="ia-block-state">불러오는 중...</div>
    <div v-else-if="!items.length" class="ia-block-state">등록된 설계가 없습니다.</div>
    <div v-else class="ia-block-table-wrap">
      <table class="ia-block-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>고객명</th>
            <th>설계사</th>
            <th>기존보험</th>
            <th>설계서</th>
            <th>분석</th>
            <th>생성</th>
            <th>등록일</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.id"
            @click="navigateTo('/page/보험설계서/' + row.id)"
          >
            <td><strong>{{ row.title || '(제목 없음)' }}</strong></td>
            <td>{{ row.customerName || '—' }}</td>
            <td>{{ row.agentName || '—' }}</td>
            <td class="ia-muted">{{ row.existingInsurancePdf ? '✓' : '—' }}</td>
            <td class="ia-muted">{{ row.proposalPdfs?.length || 0 }}개</td>
            <td class="ia-muted">{{ (row as any).hasAnalysis ? '✓' : '—' }}</td>
            <td class="ia-muted">{{ (row as any).hasProposal ? '✓' : '—' }}</td>
            <td class="ia-muted">{{ formatDate(row.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 새 설계 생성 미니 모달 -->
    <div v-if="newOpen" class="ia-modal" @click="newOpen = false">
      <div class="ia-mini-drawer" @click.stop>
        <div class="ia-drawer-head">
          <strong>새 보험 설계</strong>
          <button type="button" class="ia-drawer-close" @click="newOpen = false">×</button>
        </div>
        <div class="ia-mini-body">
          <label class="ia-field">
            <span>Title</span>
            <input v-model="newForm.title" maxlength="120" placeholder="설계 제목" autofocus />
          </label>
          <div class="ia-row-2">
            <label class="ia-field">
              <span>고객명</span>
              <input v-model="newForm.customerName" maxlength="60" placeholder="홍길동" />
            </label>
            <label class="ia-field">
              <span>설계사</span>
              <input v-model="newForm.agentName" maxlength="60" placeholder="김설계" />
            </label>
          </div>
          <p v-if="newError" class="ia-status ia-status-error">{{ newError }}</p>
        </div>
        <div class="ia-drawer-actions">
          <div />
          <div class="ia-actions-right">
            <button type="button" class="ia-btn ia-btn-secondary" :disabled="creating" @click="newOpen = false">취소</button>
            <button type="button" class="ia-btn ia-btn-primary" :disabled="creating" @click="createAndNavigate">
              {{ creating ? '생성 중...' : '생성 →' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  block: { type?: string; props: { title?: string } }
  mediaMap?: Record<string, unknown>
}>()

type PdfFile = { filename: string; originalName: string; urlPath: string }
type AnalysisItem = {
  id: string; title: string; customerName: string; agentName: string
  existingInsurancePdf: PdfFile | null; proposalPdfs: (PdfFile | null)[]
  note: string; createdAt: string
}

const apiBase = useApiBase()

const { data: listData, pending, refresh } = await useFetch<{ items: AnalysisItem[] }>(
  () => `${apiBase}/api/analysis`,
  { credentials: 'include', server: false, default: () => ({ items: [] }) },
)
const items = computed(() => listData.value?.items ?? [])

// ── 새 설계 미니 폼 ───────────────────────────────────────────────────────────
const newOpen  = ref(false)
const creating = ref(false)
const newError = ref('')
const newForm  = ref({ title: '', customerName: '', agentName: '' })

function openNew() {
  newForm.value = { title: '', customerName: '', agentName: '' }
  newError.value = ''
  newOpen.value  = true
}

async function createAndNavigate() {
  creating.value = true; newError.value = ''
  try {
    const res = await $fetch<{ item: AnalysisItem }>(`${apiBase}/api/analysis`, {
      method: 'POST', credentials: 'include',
      body: { ...newForm.value, proposalPdfs: [], note: '' },
    })
    newOpen.value = false
    await navigateTo('/page/보험설계서/' + res.item.id)
  } catch {
    newError.value = '생성 실패'
  } finally {
    creating.value = false
  }
}

function formatDate(iso?: string) { return iso ? iso.slice(0, 10) : '—' }
</script>

<style scoped>
/* ── 전체 너비 (page body width) ── */
/* public-content(880px) → public-content-shell(1200px)까지 확장.
   block-title과 동일한 50% - 50vw 기법 사용. */
.ia-block {
  margin-left:  calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  /* shell padding(24px)과 맞추되 viewport > 1200px 이면 여백 유지 */
  padding: 28px max(24px, calc(50vw - 576px)) 40px;
  font-family: -apple-system, "Apple SD Gothic Neo", sans-serif;
  font-size: 14px;
  color: #1a1a1a;
}

/* ── 헤더 ── */
.ia-block-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; gap: 12px;
}
.ia-block-head h2 { margin: 0; font-size: 20px; font-weight: 700; }
.ia-block-head-right { display: flex; align-items: center; gap: 10px; }
.ia-block-meta { font-size: 12px; color: #888; }
.ia-block-btn-primary {
  padding: 7px 16px; font-size: 13px; font-weight: 600;
  background: #2a3e66; color: #fff; border: none; border-radius: 4px; cursor: pointer;
}
.ia-block-btn-primary:hover { background: #1e2f52; }

/* ── 상태 ── */
.ia-block-state { padding: 32px; text-align: center; color: #888; }

/* ── 테이블 ── */
.ia-block-table-wrap { overflow-x: auto; border: 1px solid #e5e5e5; border-radius: 6px; }
.ia-block-table { border-collapse: collapse; width: 100%; font-size: 13px; }
.ia-block-table thead th {
  padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600;
  letter-spacing: .06em; text-transform: uppercase; color: #666;
  background: #f9f9f9; border-bottom: 1px solid #e5e5e5;
}
.ia-block-table tbody tr { cursor: pointer; border-bottom: 1px solid #f0f0f0; }
.ia-block-table tbody tr:last-child { border-bottom: none; }
.ia-block-table tbody tr:hover { background: #f5f7ff; }
.ia-block-table tbody td { padding: 11px 14px; vertical-align: middle; }
.ia-muted { color: #888; }

/* ── 모달 / 미니 drawer ── */
.ia-modal {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 1000; display: flex; justify-content: flex-end;
}
.ia-mini-drawer {
  width: 400px; max-width: 95vw; background: #fff;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 24px rgba(0,0,0,.15);
}
.ia-drawer-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #eee; font-weight: 600; font-size: 15px;
}
.ia-drawer-close {
  background: none; border: none; font-size: 22px; line-height: 1;
  cursor: pointer; color: #888; padding: 0 4px;
}
.ia-mini-body {
  padding: 20px 24px; display: flex; flex-direction: column; gap: 14px;
}
.ia-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ia-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 500; color: #555; }
.ia-field input {
  padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px;
  font-size: 13px; font-family: inherit; outline: none;
}
.ia-field input:focus { border-color: #2a3e66; }

.ia-drawer-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; border-top: 1px solid #eee; gap: 8px; flex-shrink: 0;
}
.ia-actions-right { display: flex; gap: 6px; }
.ia-btn {
  padding: 7px 16px; font-size: 13px; font-weight: 500;
  border-radius: 4px; border: 1px solid transparent; cursor: pointer; white-space: nowrap;
}
.ia-btn:disabled { opacity: .5; cursor: not-allowed; }
.ia-btn-secondary { background: #f0f0f0; border-color: #d0d0d0; color: #333; }
.ia-btn-secondary:hover:not(:disabled) { background: #e4e4e4; }
.ia-btn-primary   { background: #2a3e66; border-color: #1e2f52; color: #fff; }
.ia-btn-primary:hover:not(:disabled)   { background: #1e2f52; }

.ia-status { font-size: 13px; margin: 0; }
.ia-status-error { color: #c62828; }
</style>
