<template>
  <div class="theme-backend">
    <DefaultThemeTopbar
      :items="navItems"
      full-width
      backend-mode
      backend-menu-button
      hide-nav
      toolbar-title="Insurance Analysis."
      @backend-menu-toggle="isSidebarOpen = !isSidebarOpen"
    />
    <div v-if="isSidebarOpen" class="theme-backend-menu-backdrop" @click="isSidebarOpen = false" />

    <div class="theme-backend-shell">
      <BackendSidebar :open="isSidebarOpen" current-key="analysis" @close="isSidebarOpen = false" />

      <main class="theme-backend-main">
        <div class="theme-backend-head theme-backend-contents-head">
          <h1>Insurance Analysis.</h1>
          <div class="theme-backend-head-right">
            <span class="theme-meta">{{ items.length }}건</span>
            <button type="button" class="theme-form-submit" @click="openNew">+ 새 설계</button>
          </div>
        </div>

        <div v-if="pending" class="theme-backend-state">불러오는 중...</div>

        <section v-else-if="!items.length" class="theme-backend-state">
          등록된 설계가 없습니다.
        </section>

        <section v-else class="theme-backend-table-wrap">
          <table class="theme-backend-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>고객명</th>
                <th>설계사</th>
                <th>기존보험</th>
                <th>설계서</th>
                <th>분석여부</th>
                <th>생성여부</th>
                <th>PDF</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in items"
                :key="row.id"
                :class="{ current: drawerId === row.id && drawerOpen }"
                @click="openEdit(row)"
              >
                <td><strong>{{ row.title || '(제목 없음)' }}</strong></td>
                <td>{{ row.customerName || '—' }}</td>
                <td>{{ row.agentName || '—' }}</td>
                <td class="theme-meta">{{ row.existingInsurancePdf ? '✓' : '—' }}</td>
                <td class="theme-meta">{{ row.proposalPdfs?.length || 0 }}개</td>
                <td class="theme-meta">{{ (row as any).hasAnalysis ? '✓' : '—' }}</td>
                <td class="theme-meta">{{ (row as any).hasProposal ? '✓' : '—' }}</td>
                <td class="theme-meta" @click.stop>
                  <a
                    v-if="row.pdfPath"
                    :href="`${apiBase}${row.pdfPath}`"
                    target="_blank"
                    rel="noopener"
                    class="ia-table-pdf-link"
                  >PDF</a>
                  <span v-else>—</span>
                </td>
                <td class="theme-meta">{{ formatDate(row.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </main>
    </div>

    <!-- ── Drawer ── -->
    <div v-if="drawerOpen" class="theme-backend-user-modal" @click="closeDrawer">
      <div class="theme-backend-user-drawer ia-drawer" @click.stop>
        <div class="theme-backend-user-drawer-head">
          <strong>{{ isNewMode ? '새 보험 설계' : form.title || '보험 설계' }}</strong>
          <button type="button" class="theme-backend-close" aria-label="Close" @click="closeDrawer">×</button>
        </div>

        <div class="ia-drawer-body">
          <!-- 기본 정보 -->
          <div class="ia-section">
            <label class="theme-form-field">
              <span>Title</span>
              <input v-model="form.title" maxlength="120" placeholder="설계 제목" />
            </label>
            <div class="ia-row-2">
              <label class="theme-form-field">
                <span>고객명</span>
                <input v-model="form.customerName" maxlength="60" placeholder="홍길동" />
              </label>
              <label class="theme-form-field">
                <span>설계사</span>
                <input v-model="form.agentName" maxlength="60" placeholder="김설계" />
              </label>
            </div>
          </div>

          <!-- 기존보험내역 PDF -->
          <div class="ia-section">
            <div class="ia-section-title">기존보험내역</div>
            <div class="ia-pdf-slot">
              <div v-if="form.existingInsurancePdf" class="ia-pdf-chip">
                <span>📄 {{ form.existingInsurancePdf.originalName }}</span>
                <button type="button" class="ia-pdf-remove" @click="form.existingInsurancePdf = null">×</button>
              </div>
              <button
                v-else
                type="button"
                class="ia-pdf-btn"
                :disabled="uploadingSlot !== null"
                @click="triggerPdf('existing')"
              >
                {{ uploadingSlot === 'existing' ? '업로드 중...' : 'PDF 선택' }}
              </button>
            </div>
            <input
              ref="existingPdfRef"
              type="file"
              accept=".pdf,application/pdf"
              style="display:none"
              @change="onPdfSelected('existing', $event)"
            />
          </div>

          <!-- 보험설계서 PDF (최대 4개) -->
          <div class="ia-section">
            <div class="ia-section-title">보험설계서 <span class="theme-meta">(최대 4개)</span></div>
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
                  <button
                    type="button"
                    class="ia-pdf-btn"
                    :disabled="uploadingSlot !== null"
                    @click="triggerPdf(`proposal-${idx - 1}`)"
                  >
                    {{ uploadingSlot === `proposal-${idx - 1}` ? '업로드 중...' : 'PDF 선택' }}
                  </button>
                </template>
                <template v-else>
                  <span class="ia-pdf-empty">—</span>
                </template>
              </div>
            </div>
            <input
              v-for="idx in 4"
              :key="`pinput-${idx}`"
              :ref="el => { if (el) proposalPdfRefs[idx - 1] = el as HTMLInputElement }"
              type="file"
              accept=".pdf,application/pdf"
              style="display:none"
              @change="onPdfSelected(`proposal-${idx - 1}`, $event)"
            />
          </div>

          <!-- 노트 -->
          <div class="ia-section">
            <label class="theme-form-field">
              <span>Note</span>
              <textarea v-model="form.note" rows="3" placeholder="메모" />
            </label>
          </div>

          <!-- 생성된 PDF -->
          <div v-if="form.pdfPath" class="ia-section">
            <div class="ia-section-title">생성된 PDF</div>
            <div class="ia-pdf-slot">
              <a
                :href="`${apiBase}${form.pdfPath}`"
                target="_blank"
                rel="noopener"
                class="ia-pdf-chip ia-pdf-link"
              >
                📄 제안서 PDF 열기
              </a>
            </div>
          </div>

          <!-- 분석 결과 미리보기 -->
          <div v-if="form.analysisResult" class="ia-section ia-analysis-preview">
            <div class="ia-section-title">분석 결과</div>
            <pre class="ia-json-preview">{{ JSON.stringify(form.analysisResult, null, 2) }}</pre>
          </div>

          <!-- 에러/상태 메시지 -->
          <p v-if="statusMsg" :class="['theme-form-status', { error: isError }]">{{ statusMsg }}</p>
        </div>

        <!-- 액션 버튼 -->
        <div class="ia-drawer-actions">
          <button
            v-if="!isNewMode"
            type="button"
            class="ia-btn ia-btn-danger"
            :disabled="isBusy"
            @click="deleteRecord"
          >삭제</button>
          <div class="ia-actions-right">
            <button
              type="button"
              class="ia-btn ia-btn-secondary"
              :disabled="isBusy"
              @click="saveRecord"
            >{{ isBusy && busyAction === 'save' ? '저장 중...' : '저장' }}</button>
            <button
              v-if="!isNewMode"
              type="button"
              class="ia-btn ia-btn-secondary"
              :disabled="isBusy"
              @click="analyzeRecord"
            >{{ isBusy && busyAction === 'analyze' ? '분석 중...' : '분석(LLM)' }}</button>
            <button
              v-if="!isNewMode && form.analysisResult"
              type="button"
              class="ia-btn ia-btn-primary"
              :disabled="isBusy"
              @click="generateProposal"
            >{{ isBusy && busyAction === 'generate' ? 'PDF 생성 중...' : (form.pdfPath ? 'PDF 재생성 ▶' : 'PDF 생성 ▶') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DefaultThemeTopbar from '~/components/public/DefaultThemeTopbar.vue'
import BackendSidebar from '~/components/admin/BackendSidebar.vue'

definePageMeta({ layout: 'default' })

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
  pdfPath: string | null
  createdAt: string
  updatedAt: string
}

const { navItems } = useBackendMenu()
const apiBase = useApiBase()
const isSidebarOpen = ref(false)

// ── List ──────────────────────────────────────────────────────────────────────
const { data: listData, pending, refresh } = await useFetch<{ items: AnalysisItem[] }>(
  () => `${apiBase}/api/analysis`,
  { credentials: 'include', server: false, default: () => ({ items: [] }) },
)

const items = computed(() => listData.value?.items ?? [])

// ── Drawer state ──────────────────────────────────────────────────────────────
const drawerOpen = ref(false)
const isNewMode = ref(false)
const drawerId = ref('')
const statusMsg = ref('')
const isError = ref(false)
const isBusy = ref(false)
const busyAction = ref('')
const uploadingSlot = ref<string | null>(null)

const existingPdfRef = ref<HTMLInputElement | null>(null)
const proposalPdfRefs = ref<HTMLInputElement[]>([])

type FormState = {
  title: string
  customerName: string
  agentName: string
  existingInsurancePdf: PdfFile | null
  proposalPdfs: (PdfFile | null)[]
  note: string
  analysisResult: unknown
  proposalData: unknown
  pdfPath: string | null
}

const form = ref<FormState>({
  title: '',
  customerName: '',
  agentName: '',
  existingInsurancePdf: null,
  proposalPdfs: [null, null, null, null],
  note: '',
  analysisResult: null,
  proposalData: null,
  pdfPath: null,
})

function blankForm(): FormState {
  return {
    title: '',
    customerName: '',
    agentName: '',
    existingInsurancePdf: null,
    proposalPdfs: [null, null, null, null],
    note: '',
    analysisResult: null,
    proposalData: null,
    pdfPath: null,
  }
}

function openNew() {
  form.value = blankForm()
  drawerId.value = ''
  isNewMode.value = true
  drawerOpen.value = true
  statusMsg.value = ''
}

async function openEdit(row: AnalysisItem) {
  const pdfs: (PdfFile | null)[] = [null, null, null, null]
  for (let i = 0; i < 4; i++) pdfs[i] = row.proposalPdfs?.[i] ?? null
  form.value = {
    title: row.title,
    customerName: row.customerName,
    agentName: row.agentName,
    existingInsurancePdf: row.existingInsurancePdf ?? null,
    proposalPdfs: pdfs,
    note: row.note,
    analysisResult: null,
    proposalData: null,
    pdfPath: row.pdfPath ?? null,
  }
  drawerId.value = row.id
  isNewMode.value = false
  drawerOpen.value = true
  statusMsg.value = ''

  // analysisResult / proposalData는 리스트에서 제외되므로 전체 레코드 fetch
  try {
    const res = await $fetch<{ item: AnalysisItem }>(`${apiBase}/api/analysis/${row.id}`, {
      credentials: 'include',
    })
    if (res?.item) {
      form.value.analysisResult = res.item.analysisResult ?? null
      form.value.proposalData = res.item.proposalData ?? null
      form.value.pdfPath = res.item.pdfPath ?? null
    }
  } catch { /* 실패해도 drawer는 유지 */ }
}

function closeDrawer() {
  drawerOpen.value = false
  statusMsg.value = ''
}

// ── PDF upload ────────────────────────────────────────────────────────────────
function triggerPdf(slot: string) {
  if (slot === 'existing') {
    existingPdfRef.value?.click()
    return
  }
  const idx = Number(slot.replace('proposal-', ''))
  proposalPdfRefs.value[idx]?.click()
}

async function uploadPdf(file: File): Promise<PdfFile> {
  const fd = new FormData()
  fd.append('file', file)
  return $fetch<PdfFile>(`${apiBase}/api/analysis/upload-pdf`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  })
}

async function onPdfSelected(slot: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  uploadingSlot.value = slot
  statusMsg.value = ''
  try {
    const result = await uploadPdf(file)
    if (slot === 'existing') {
      form.value.existingInsurancePdf = result
    } else {
      const idx = Number(slot.replace('proposal-', ''))
      const updated = [...form.value.proposalPdfs] as (PdfFile | null)[]
      updated[idx] = result
      form.value.proposalPdfs = updated
    }
  } catch {
    isError.value = true
    statusMsg.value = 'PDF 업로드 실패'
  } finally {
    uploadingSlot.value = null
  }
}

function removeProposalPdf(idx: number) {
  const updated = [...form.value.proposalPdfs] as (PdfFile | null)[]
  updated[idx] = null
  // compact: shift nulls to end
  const filled = updated.filter(Boolean) as PdfFile[]
  form.value.proposalPdfs = [
    filled[0] ?? null,
    filled[1] ?? null,
    filled[2] ?? null,
    filled[3] ?? null,
  ]
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function formPayload() {
  return {
    title: form.value.title,
    customerName: form.value.customerName,
    agentName: form.value.agentName,
    existingInsurancePdf: form.value.existingInsurancePdf,
    proposalPdfs: form.value.proposalPdfs.filter(Boolean),
    note: form.value.note,
  }
}

async function saveRecord() {
  isBusy.value = true
  busyAction.value = 'save'
  statusMsg.value = ''
  isError.value = false
  try {
    if (isNewMode.value) {
      const res = await $fetch<{ item: AnalysisItem }>(`${apiBase}/api/analysis`, {
        method: 'POST', credentials: 'include', body: formPayload(),
      })
      drawerId.value = res.item.id
      isNewMode.value = false
      await refresh()
    } else {
      await $fetch(`${apiBase}/api/analysis/${drawerId.value}`, {
        method: 'PUT', credentials: 'include', body: formPayload(),
      })
      await refresh()
    }
    statusMsg.value = '저장되었습니다'
  } catch {
    isError.value = true
    statusMsg.value = '저장 실패'
  } finally {
    isBusy.value = false
    busyAction.value = ''
  }
}

async function deleteRecord() {
  if (!window.confirm(`'${form.value.title || '이 항목'}'을 삭제할까요?`)) return
  isBusy.value = true
  busyAction.value = 'delete'
  try {
    await $fetch(`${apiBase}/api/analysis/${drawerId.value}`, {
      method: 'DELETE', credentials: 'include',
    })
    await refresh()
    closeDrawer()
  } catch {
    isError.value = true
    statusMsg.value = '삭제 실패'
  } finally {
    isBusy.value = false
    busyAction.value = ''
  }
}

async function analyzeRecord() {
  isBusy.value = true
  busyAction.value = 'analyze'
  statusMsg.value = ''
  isError.value = false
  try {
    const res = await $fetch<{ analysisResult: unknown }>(
      `${apiBase}/api/analysis/${drawerId.value}/analyze`,
      { method: 'POST', credentials: 'include' },
    )
    form.value.analysisResult = res.analysisResult
    await refresh()
    statusMsg.value = '분석 완료'
  } catch (err: unknown) {
    isError.value = true
    statusMsg.value = err instanceof Error ? err.message : '분석 실패'
  } finally {
    isBusy.value = false
    busyAction.value = ''
  }
}

async function generateProposal() {
  isBusy.value = true
  busyAction.value = 'generate'
  statusMsg.value = ''
  isError.value = false
  try {
    const res = await $fetch<{ ok: boolean; pdfPath: string }>(
      `${apiBase}/api/analysis/${drawerId.value}/generate-pdf`,
      { method: 'POST', credentials: 'include' },
    )
    form.value.pdfPath = res.pdfPath
    await refresh()
    statusMsg.value = 'PDF 생성 완료'
  } catch (err: unknown) {
    isError.value = true
    statusMsg.value = err instanceof Error ? err.message : 'PDF 생성 실패'
  } finally {
    isBusy.value = false
    busyAction.value = ''
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return '—'
  return iso.slice(0, 10)
}
</script>

<style scoped>
.ia-drawer {
  width: 560px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.ia-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ia-section { display: flex; flex-direction: column; gap: 10px; }

.ia-section-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--theme-muted, #888);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--theme-rule, #eee);
}

.ia-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.ia-pdf-list { display: flex; flex-direction: column; gap: 8px; }

.ia-pdf-slot { display: flex; align-items: center; gap: 10px; min-height: 34px; }

.ia-pdf-num {
  width: 20px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: var(--theme-muted, #888);
  flex-shrink: 0;
}

.ia-pdf-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  background: var(--theme-bg-2, #f4f4f4);
  border-radius: 4px;
  font-size: 13px;
  flex: 1;
  min-width: 0;
}

.ia-pdf-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ia-pdf-remove {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--theme-muted, #888);
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}

.ia-pdf-btn {
  padding: 5px 14px;
  font-size: 12px;
  border: 1px dashed var(--theme-rule, #ccc);
  background: none;
  cursor: pointer;
  border-radius: 4px;
  color: var(--theme-ink, #333);
}
.ia-pdf-btn:hover { border-color: var(--theme-accent, #555); }
.ia-pdf-btn:disabled { opacity: .5; cursor: not-allowed; }

.ia-pdf-empty { color: var(--theme-muted, #aaa); font-size: 13px; }

.ia-pdf-link {
  text-decoration: none;
  color: var(--theme-ink, #333);
  flex: 1;
}
.ia-pdf-link:hover { background: var(--theme-bg-3, #eaeaea); }

.ia-table-pdf-link {
  display: inline-block;
  padding: 2px 8px;
  background: #2a3e66;
  color: #fff;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: .04em;
}
.ia-table-pdf-link:hover { background: #1e2f52; }

.ia-analysis-preview {
  background: var(--theme-bg-2, #f8f8f8);
  border-radius: 6px;
  padding: 12px;
}

.ia-json-preview {
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.ia-drawer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--theme-rule, #eee);
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: nowrap;
}

.ia-actions-right {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.ia-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
}
.ia-btn:disabled { opacity: .5; cursor: not-allowed; }
.ia-btn-danger   { background: #e8a020; border-color: #d08010; color: #fff; }
.ia-btn-secondary { background: #f0f0f0; border-color: #d0d0d0; color: #333; }
.ia-btn-secondary:hover:not(:disabled) { background: #e4e4e4; }
.ia-btn-primary  { background: #2a3e66; border-color: #1e2f52; color: #fff; }
.ia-btn-primary:hover:not(:disabled)  { background: #1e2f52; }
</style>
