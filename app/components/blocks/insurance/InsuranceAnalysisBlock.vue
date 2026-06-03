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
            :class="{ active: drawerId === row.id && drawerOpen }"
            @click="openEdit(row)"
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

    <!-- Drawer -->
    <div v-if="drawerOpen" class="ia-modal" @click="closeDrawer">
      <div class="ia-drawer" @click.stop>
        <div class="ia-drawer-head">
          <strong>{{ isNewMode ? '새 보험 설계' : form.title || '보험 설계' }}</strong>
          <button type="button" class="ia-drawer-close" @click="closeDrawer">×</button>
        </div>

        <div class="ia-drawer-body">
          <div class="ia-section">
            <label class="ia-field">
              <span>Title</span>
              <input v-model="form.title" maxlength="120" placeholder="설계 제목" />
            </label>
            <div class="ia-row-2">
              <label class="ia-field">
                <span>고객명</span>
                <input v-model="form.customerName" maxlength="60" placeholder="홍길동" />
              </label>
              <label class="ia-field">
                <span>설계사</span>
                <input v-model="form.agentName" maxlength="60" placeholder="김설계" />
              </label>
            </div>
          </div>

          <!-- 기존보험내역 PDF -->
          <div class="ia-section">
            <div class="ia-section-label">기존보험내역</div>
            <div class="ia-pdf-slot">
              <div v-if="form.existingInsurancePdf" class="ia-pdf-chip">
                <span>📄 {{ form.existingInsurancePdf.originalName }}</span>
                <button type="button" class="ia-pdf-remove" @click="form.existingInsurancePdf = null">×</button>
              </div>
              <button v-else type="button" class="ia-pdf-btn" :disabled="uploadingSlot !== null" @click="triggerPdf('existing')">
                {{ uploadingSlot === 'existing' ? '업로드 중...' : 'PDF 선택' }}
              </button>
            </div>
            <input ref="existingPdfRef" type="file" accept=".pdf,application/pdf" style="display:none" @change="onPdfSelected('existing', $event)" />
          </div>

          <!-- 보험설계서 PDF (최대 4개) -->
          <div class="ia-section">
            <div class="ia-section-label">보험설계서 <span class="ia-muted">(최대 4개)</span></div>
            <div class="ia-pdf-list">
              <div v-for="idx in 4" :key="idx" class="ia-pdf-slot">
                <span class="ia-pdf-num">{{ idx }}</span>
                <template v-if="form.proposalPdfs[idx - 1]">
                  <div class="ia-pdf-chip">
                    <span>📄 {{ form.proposalPdfs[idx - 1]!.originalName }}</span>
                    <button type="button" class="ia-pdf-remove" @click="removeProposalPdf(idx - 1)">×</button>
                  </div>
                </template>
                <template v-else-if="idx === 1 || form.proposalPdfs[idx - 2]">
                  <button type="button" class="ia-pdf-btn" :disabled="uploadingSlot !== null" @click="triggerPdf(`proposal-${idx - 1}`)">
                    {{ uploadingSlot === `proposal-${idx - 1}` ? '업로드 중...' : 'PDF 선택' }}
                  </button>
                </template>
                <template v-else>
                  <span class="ia-muted" style="font-size:13px">—</span>
                </template>
              </div>
            </div>
            <input
              v-for="idx in 4"
              :key="`pi-${idx}`"
              :ref="(el) => { if (el) proposalPdfRefs[idx - 1] = el as HTMLInputElement }"
              type="file"
              accept=".pdf,application/pdf"
              style="display:none"
              @change="onPdfSelected(`proposal-${idx - 1}`, $event)"
            />
          </div>

          <!-- 노트 -->
          <div class="ia-section">
            <label class="ia-field">
              <span>Note</span>
              <textarea v-model="form.note" rows="3" placeholder="메모" />
            </label>
          </div>

          <!-- 분석 결과 -->
          <div v-if="form.analysisResult" class="ia-section ia-analysis-box">
            <div class="ia-section-label">분석 결과</div>
            <pre class="ia-json-pre">{{ JSON.stringify(form.analysisResult, null, 2) }}</pre>
          </div>

          <p v-if="statusMsg" :class="['ia-status', { 'ia-status-error': isError }]">{{ statusMsg }}</p>
        </div>

        <!-- 액션 -->
        <div class="ia-drawer-actions">
          <button v-if="!isNewMode" type="button" class="ia-btn ia-btn-danger" :disabled="isBusy" @click="deleteRecord">삭제</button>
          <div class="ia-actions-right">
            <button type="button" class="ia-btn ia-btn-secondary" :disabled="isBusy" @click="saveRecord">
              {{ isBusy && busyAction === 'save' ? '저장 중...' : '저장' }}
            </button>
            <button v-if="!isNewMode" type="button" class="ia-btn ia-btn-secondary" :disabled="isBusy" @click="analyzeRecord">
              {{ isBusy && busyAction === 'analyze' ? '분석 중...' : '분석(LLM)' }}
            </button>
            <button v-if="!isNewMode && form.analysisResult" type="button" class="ia-btn ia-btn-primary" :disabled="isBusy" @click="generateProposal">
              {{ isBusy && busyAction === 'generate' ? '생성 중...' : '생성 ▶' }}
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
  id: string
  title: string
  customerName: string
  agentName: string
  existingInsurancePdf: PdfFile | null
  proposalPdfs: (PdfFile | null)[]
  note: string
  analysisResult: unknown
  proposalData: unknown
  createdAt: string
  updatedAt: string
}

const apiBase = useApiBase()

// ── List ──────────────────────────────────────────────────────────────────────
const { data: listData, pending, refresh } = await useFetch<{ items: AnalysisItem[] }>(
  () => `${apiBase}/api/analysis`,
  { credentials: 'include', server: false, default: () => ({ items: [] }) },
)
const items = computed(() => listData.value?.items ?? [])

// ── Drawer state ──────────────────────────────────────────────────────────────
const drawerOpen = ref(false)
const isNewMode  = ref(false)
const drawerId   = ref('')
const statusMsg  = ref('')
const isError    = ref(false)
const isBusy     = ref(false)
const busyAction = ref('')
const uploadingSlot = ref<string | null>(null)

const existingPdfRef  = ref<HTMLInputElement | null>(null)
const proposalPdfRefs = ref<HTMLInputElement[]>([])

type FormState = {
  title: string; customerName: string; agentName: string
  existingInsurancePdf: PdfFile | null
  proposalPdfs: (PdfFile | null)[]
  note: string; analysisResult: unknown; proposalData: unknown
}

const form = ref<FormState>({
  title: '', customerName: '', agentName: '',
  existingInsurancePdf: null,
  proposalPdfs: [null, null, null, null],
  note: '', analysisResult: null, proposalData: null,
})

function blank(): FormState {
  return { title: '', customerName: '', agentName: '',
    existingInsurancePdf: null, proposalPdfs: [null, null, null, null],
    note: '', analysisResult: null, proposalData: null }
}

function openNew() {
  form.value = blank()
  drawerId.value = ''; isNewMode.value = true; drawerOpen.value = true; statusMsg.value = ''
}

async function openEdit(row: AnalysisItem) {
  const pdfs: (PdfFile | null)[] = [null, null, null, null]
  for (let i = 0; i < 4; i++) pdfs[i] = row.proposalPdfs?.[i] ?? null
  form.value = { title: row.title, customerName: row.customerName, agentName: row.agentName,
    existingInsurancePdf: row.existingInsurancePdf ?? null, proposalPdfs: pdfs,
    note: row.note, analysisResult: null, proposalData: null }
  drawerId.value = row.id; isNewMode.value = false; drawerOpen.value = true; statusMsg.value = ''
  try {
    const res = await $fetch<{ item: AnalysisItem }>(`${apiBase}/api/analysis/${row.id}`, { credentials: 'include' })
    if (res?.item) {
      form.value.analysisResult = res.item.analysisResult ?? null
      form.value.proposalData   = res.item.proposalData   ?? null
    }
  } catch {}
}

function closeDrawer() { drawerOpen.value = false; statusMsg.value = '' }

// ── PDF ───────────────────────────────────────────────────────────────────────
function triggerPdf(slot: string) {
  if (slot === 'existing') { existingPdfRef.value?.click(); return }
  proposalPdfRefs.value[Number(slot.replace('proposal-', ''))]?.click()
}

async function onPdfSelected(slot: string, event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  ;(event.target as HTMLInputElement).value = ''
  uploadingSlot.value = slot; statusMsg.value = ''
  try {
    const fd = new FormData(); fd.append('file', file)
    const result = await $fetch<PdfFile>(`${apiBase}/api/analysis/upload-pdf`, { method: 'POST', credentials: 'include', body: fd })
    if (slot === 'existing') {
      form.value.existingInsurancePdf = result
    } else {
      const idx = Number(slot.replace('proposal-', ''))
      const updated = [...form.value.proposalPdfs] as (PdfFile | null)[]
      updated[idx] = result; form.value.proposalPdfs = updated
    }
  } catch { isError.value = true; statusMsg.value = 'PDF 업로드 실패' }
  finally { uploadingSlot.value = null }
}

function removeProposalPdf(idx: number) {
  const updated = [...form.value.proposalPdfs] as (PdfFile | null)[]
  updated[idx] = null
  const f = updated.filter(Boolean) as PdfFile[]
  form.value.proposalPdfs = [f[0] ?? null, f[1] ?? null, f[2] ?? null, f[3] ?? null]
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
const payload = () => ({
  title: form.value.title, customerName: form.value.customerName, agentName: form.value.agentName,
  existingInsurancePdf: form.value.existingInsurancePdf,
  proposalPdfs: form.value.proposalPdfs.filter(Boolean), note: form.value.note,
})

async function saveRecord() {
  isBusy.value = true; busyAction.value = 'save'; statusMsg.value = ''; isError.value = false
  try {
    if (isNewMode.value) {
      const res = await $fetch<{ item: AnalysisItem }>(`${apiBase}/api/analysis`, { method: 'POST', credentials: 'include', body: payload() })
      drawerId.value = res.item.id; isNewMode.value = false
    } else {
      await $fetch(`${apiBase}/api/analysis/${drawerId.value}`, { method: 'PUT', credentials: 'include', body: payload() })
    }
    await refresh(); statusMsg.value = '저장되었습니다'
  } catch { isError.value = true; statusMsg.value = '저장 실패' }
  finally { isBusy.value = false; busyAction.value = '' }
}

async function deleteRecord() {
  if (!window.confirm(`'${form.value.title || '이 항목'}'을 삭제할까요?`)) return
  isBusy.value = true; busyAction.value = 'delete'
  try {
    await $fetch(`${apiBase}/api/analysis/${drawerId.value}`, { method: 'DELETE', credentials: 'include' })
    await refresh(); closeDrawer()
  } catch { isError.value = true; statusMsg.value = '삭제 실패' }
  finally { isBusy.value = false; busyAction.value = '' }
}

async function analyzeRecord() {
  isBusy.value = true; busyAction.value = 'analyze'; statusMsg.value = ''; isError.value = false
  try {
    const res = await $fetch<{ analysisResult: unknown }>(
      `${apiBase}/api/analysis/${drawerId.value}/analyze`, { method: 'POST', credentials: 'include' })
    form.value.analysisResult = res.analysisResult
    await refresh(); statusMsg.value = '분석 완료'
  } catch (err: unknown) { isError.value = true; statusMsg.value = err instanceof Error ? err.message : '분석 실패' }
  finally { isBusy.value = false; busyAction.value = '' }
}

function generateProposal() {
  window.open(`/analysis?id=${drawerId.value}`, '_blank')
}

function formatDate(iso?: string) { return iso ? iso.slice(0, 10) : '—' }
</script>

<style scoped>
/* ── 컨테이너 ── */
.ia-block {
  padding: 24px;
  font-family: -apple-system, "Apple SD Gothic Neo", sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  position: relative;
}

/* ── 헤더 ── */
.ia-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
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
.ia-block-table tbody tr.active { background: #eff2ff; }
.ia-block-table tbody td { padding: 10px 14px; vertical-align: middle; }
.ia-muted { color: #888; }

/* ── Modal / Drawer ── */
.ia-modal {
  position: fixed; inset: 0; background: rgba(0,0,0,.45);
  z-index: 1000; display: flex; justify-content: flex-end;
}
.ia-drawer {
  width: 560px; max-width: 95vw; background: #fff;
  display: flex; flex-direction: column; max-height: 100vh;
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

/* ── Drawer body ── */
.ia-drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
.ia-section { display: flex; flex-direction: column; gap: 10px; }
.ia-section-label {
  font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: #888; padding-bottom: 4px; border-bottom: 1px solid #eee;
}
.ia-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ia-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 500; color: #555; }
.ia-field input, .ia-field textarea {
  padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px;
  font-size: 13px; font-family: inherit; outline: none;
}
.ia-field input:focus, .ia-field textarea:focus { border-color: #2a3e66; }
.ia-field textarea { resize: vertical; }

/* ── PDF ── */
.ia-pdf-list { display: flex; flex-direction: column; gap: 8px; }
.ia-pdf-slot { display: flex; align-items: center; gap: 10px; min-height: 34px; }
.ia-pdf-num { width: 20px; text-align: center; font-weight: 600; font-size: 12px; color: #888; flex-shrink: 0; }
.ia-pdf-chip {
  display: flex; align-items: center; gap: 8px; padding: 4px 10px;
  background: #f4f4f4; border-radius: 4px; font-size: 13px; flex: 1; min-width: 0;
}
.ia-pdf-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ia-pdf-remove { background: none; border: none; cursor: pointer; color: #888; font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0; }
.ia-pdf-btn {
  padding: 5px 14px; font-size: 12px; border: 1px dashed #ccc;
  background: none; cursor: pointer; border-radius: 4px; color: #333;
}
.ia-pdf-btn:hover { border-color: #555; }
.ia-pdf-btn:disabled { opacity: .5; cursor: not-allowed; }

/* ── 분석 결과 ── */
.ia-analysis-box { background: #f8f8f8; border-radius: 6px; padding: 12px; }
.ia-json-pre {
  font-size: 11px; line-height: 1.5; overflow-x: auto;
  max-height: 200px; overflow-y: auto; margin: 0; white-space: pre-wrap; word-break: break-all;
}

/* ── 상태 메시지 ── */
.ia-status { font-size: 13px; color: #2a7a2a; margin: 0; }
.ia-status-error { color: #c62828; }

/* ── Drawer 버튼 ── */
.ia-drawer-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; border-top: 1px solid #eee; gap: 8px; flex-wrap: nowrap; flex-shrink: 0;
}
.ia-actions-right { display: flex; gap: 6px; flex-wrap: nowrap; flex-shrink: 0; }
.ia-btn {
  padding: 6px 14px; font-size: 13px; font-weight: 500;
  border-radius: 4px; border: 1px solid transparent;
  cursor: pointer; white-space: nowrap; line-height: 1.4;
}
.ia-btn:disabled { opacity: .5; cursor: not-allowed; }
.ia-btn-danger    { background: #e8a020; border-color: #d08010; color: #fff; }
.ia-btn-secondary { background: #f0f0f0; border-color: #d0d0d0; color: #333; }
.ia-btn-secondary:hover:not(:disabled) { background: #e4e4e4; }
.ia-btn-primary   { background: #2a3e66; border-color: #1e2f52; color: #fff; }
.ia-btn-primary:hover:not(:disabled) { background: #1e2f52; }
</style>
