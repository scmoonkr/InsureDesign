<template>
  <section class="block-insurance-calc">
    <div class="calc-header">
      <h2 class="calc-title">{{ title }}</h2>
      <p v-if="subtitle" class="calc-subtitle">{{ subtitle }}</p>
    </div>

    <div class="calc-body">
      <!-- 입력 폼 -->
      <div class="calc-form">

        <!-- 성별 -->
        <div class="calc-field">
          <span class="calc-label">성별</span>
          <div class="calc-toggle">
            <button
              :class="['toggle-btn', { active: gender === 'male' }]"
              @click="gender = 'male'"
            >남성</button>
            <button
              :class="['toggle-btn', { active: gender === 'female' }]"
              @click="gender = 'female'"
            >여성</button>
          </div>
        </div>

        <!-- 나이 -->
        <div class="calc-field">
          <span class="calc-label">나이</span>
          <div class="calc-input-row">
            <input
              v-model.number="age"
              type="number"
              min="15"
              max="70"
              class="calc-input calc-input-sm"
            />
            <span class="calc-unit">세</span>
            <span v-if="ageWarning" class="calc-warn">{{ ageWarning }}</span>
          </div>
        </div>

        <!-- 보험 종류 -->
        <div class="calc-field">
          <span class="calc-label">보험 종류</span>
          <div class="calc-select-group">
            <button
              v-for="t in INSURANCE_TYPES"
              :key="t.value"
              :class="['select-btn', { active: insuranceType === t.value }]"
              @click="insuranceType = t.value"
            >{{ t.label }}</button>
          </div>
        </div>

        <!-- 보장 금액 -->
        <div class="calc-field">
          <span class="calc-label">보장 금액</span>
          <div class="calc-input-row">
            <input
              v-model.number="coverageInput"
              type="number"
              :min="coverageMin / 10000"
              :max="coverageMax / 10000"
              :step="coverageStep / 10000"
              class="calc-input"
            />
            <span class="calc-unit">만원</span>
          </div>
          <input
            v-model.number="coverageInput"
            type="range"
            :min="coverageMin / 10000"
            :max="coverageMax / 10000"
            :step="coverageStep / 10000"
            class="calc-range"
          />
          <div class="calc-range-labels">
            <span>{{ (coverageMin / 10000).toLocaleString() }}만</span>
            <span>{{ formatCoverage(coverage) }}</span>
            <span>{{ (coverageMax / 10000).toLocaleString() }}만</span>
          </div>
        </div>

        <!-- 보험 기간 -->
        <div class="calc-field">
          <span class="calc-label">보험 기간</span>
          <div class="calc-select-group">
            <button
              v-for="p in availablePeriods"
              :key="p.value"
              :class="['select-btn', { active: insurancePeriod === p.value }]"
              @click="insurancePeriod = p.value"
            >{{ p.label }}</button>
          </div>
        </div>

        <!-- 납입 기간 -->
        <div class="calc-field">
          <span class="calc-label">납입 기간</span>
          <div class="calc-select-group">
            <button
              v-for="p in availablePaymentPeriods"
              :key="p.value"
              :class="['select-btn', { active: paymentPeriod === p.value }]"
              @click="paymentPeriod = p.value"
            >{{ p.label }}</button>
          </div>
        </div>

        <button class="calc-submit" @click="calculate">
          보험료 계산하기
        </button>
      </div>

      <!-- 결과 -->
      <transition name="calc-result-fade">
        <div v-if="result" class="calc-result">
          <div class="result-main">
            <span class="result-label">예상 월 납입 보험료</span>
            <span class="result-amount">
              {{ result.monthly.toLocaleString() }}<em>원</em>
            </span>
          </div>
          <div class="result-breakdown">
            <div class="breakdown-row">
              <span>연간 납입 보험료</span>
              <span>{{ result.yearly.toLocaleString() }}원</span>
            </div>
            <div class="breakdown-row">
              <span>총 납입 보험료</span>
              <span>{{ result.total.toLocaleString() }}원</span>
            </div>
            <div class="breakdown-row">
              <span>보장 만기</span>
              <span>{{ result.expiryLabel }}</span>
            </div>
          </div>
          <p class="result-notice">
            ※ 위 금액은 예시이며 실제 보험료는 가입 조건에 따라 달라집니다.
          </p>
          <a
            v-if="consultUrl"
            :href="consultUrl"
            class="calc-consult-btn"
          >전문가 상담 신청 →</a>
        </div>
      </transition>
    </div>
  </section>
</template>

<script setup lang="ts">
// ── Props (InsureDesign에서 설정) ──────────────────────────────────────
const props = defineProps<{
  block: {
    type?: string
    props: {
      title?: string
      subtitle?: string
      consultUrl?: string        // 상담 신청 링크 (없으면 버튼 숨김)
      defaultAge?: number        // 초기 나이
      defaultType?: string       // 초기 보험 종류
    }
  }
}>()

const title      = computed(() => props.block.props.title    ?? '보험료 계산기')
const subtitle   = computed(() => props.block.props.subtitle ?? '간단한 정보 입력만으로 예상 보험료를 확인하세요.')
const consultUrl = computed(() => props.block.props.consultUrl ?? '')

// ── 상수 ─────────────────────────────────────────────────────
const INSURANCE_TYPES = [
  { value: 'life',   label: '종신보험' },
  { value: 'term',   label: '정기보험' },
  { value: 'health', label: '건강보험' },
  { value: 'cancer', label: '암보험'   },
] as const

type InsuranceType = typeof INSURANCE_TYPES[number]['value']

// 보험 기간 옵션
const PERIOD_OPTIONS: Record<InsuranceType, { value: number | 'life'; label: string }[]> = {
  life:   [{ value: 'life', label: '종신' }],
  term:   [{ value: 10, label: '10년' }, { value: 20, label: '20년' }, { value: 30, label: '30년' }],
  health: [{ value: 10, label: '10년' }, { value: 20, label: '20년' }, { value: 30, label: '30년' }, { value: 'life', label: '100세' }],
  cancer: [{ value: 10, label: '10년' }, { value: 20, label: '20년' }, { value: 30, label: '30년' }, { value: 'life', label: '100세' }],
}

// 납입 기간 옵션
const PAYMENT_PERIODS = [
  { value: 5,  label: '5년납'  },
  { value: 10, label: '10년납' },
  { value: 20, label: '20년납' },
  { value: 30, label: '30년납' },
]

// 보장 금액 설정 (단위: 원)
const COVERAGE_CONFIG: Record<InsuranceType, { min: number; max: number; step: number; default: number }> = {
  life:   { min: 10_000_000, max: 500_000_000, step: 10_000_000, default: 100_000_000 },
  term:   { min: 10_000_000, max: 500_000_000, step: 10_000_000, default: 100_000_000 },
  health: { min: 10_000_000, max: 100_000_000, step: 10_000_000, default: 30_000_000  },
  cancer: { min: 10_000_000, max: 100_000_000, step: 10_000_000, default: 30_000_000  },
}

// ── 기본요율 (30세 남성, 20년납, 1억 기준 월 보험료) ─────────
const BASE_RATE: Record<InsuranceType, number> = {
  life:   195_000,
  term:    28_000,
  health:  82_000,
  cancer:  72_000,
}

// ── 반응형 상태 ───────────────────────────────────────────────
const gender        = ref<'male' | 'female'>('male')
const age           = ref(props.block.props.defaultAge ?? 30)
const insuranceType = ref<InsuranceType>((props.block.props.defaultType as InsuranceType) ?? 'life')
const coverageInput = ref(COVERAGE_CONFIG.life.default / 10_000)
const insurancePeriod = ref<number | 'life'>('life')
const paymentPeriod   = ref(20)

type CalcResult = { monthly: number; yearly: number; total: number; expiryLabel: string }
const result = ref<CalcResult | null>(null)

// ── 파생값 ────────────────────────────────────────────────────
const coverageMin  = computed(() => COVERAGE_CONFIG[insuranceType.value].min)
const coverageMax  = computed(() => COVERAGE_CONFIG[insuranceType.value].max)
const coverageStep = computed(() => COVERAGE_CONFIG[insuranceType.value].step)
const coverage     = computed(() => coverageInput.value * 10_000)

const availablePeriods       = computed(() => PERIOD_OPTIONS[insuranceType.value])
const availablePaymentPeriods = computed(() => {
  const ip = insurancePeriod.value
  if (ip === 'life') return PAYMENT_PERIODS
  return PAYMENT_PERIODS.filter(p => p.value <= (ip as number))
})

const ageWarning = computed(() => {
  if (age.value < 15) return '15세 이상 입력해주세요'
  if (age.value > 70) return '70세 이하 입력해주세요'
  return ''
})

// 보험 종류 변경 시 coverage·period 초기화
watch(insuranceType, (type) => {
  coverageInput.value = COVERAGE_CONFIG[type].default / 10_000
  insurancePeriod.value = PERIOD_OPTIONS[type][PERIOD_OPTIONS[type].length - 1].value
  result.value = null
})

// 보험 기간 변경 시 납입 기간 보정
watch(insurancePeriod, () => {
  const opts = availablePaymentPeriods.value
  if (!opts.find(p => p.value === paymentPeriod.value)) {
    paymentPeriod.value = opts[opts.length - 1].value
  }
  result.value = null
})

watch([gender, age, coverage, paymentPeriod], () => { result.value = null })

// ── 계산 로직 ─────────────────────────────────────────────────
function calculate() {
  if (ageWarning.value) return

  const base = BASE_RATE[insuranceType.value]

  // 나이 계수: 30세 기준 지수 증가
  const ageCoef = Math.exp((age.value - 30) * 0.042)

  // 성별 계수
  const genderCoef = (() => {
    if (insuranceType.value === 'life' || insuranceType.value === 'term') {
      return gender.value === 'male' ? 1.0 : 0.82
    }
    // 건강·암보험은 여성이 더 높음
    return gender.value === 'female' ? 1.12 : 1.0
  })()

  // 납입 기간 계수 (20년 기준)
  const payCoef: Record<number, number> = { 5: 3.4, 10: 1.72, 20: 1.0, 30: 0.72 }
  const paymentCoef = payCoef[paymentPeriod.value] ?? 1.0

  // 보장 금액 계수
  const coverageCoef = coverage.value / 100_000_000  // 1억 = 1.0

  const monthly = Math.round(
    base * ageCoef * genderCoef * paymentCoef * coverageCoef / 100
  ) * 100

  const yearly = monthly * 12
  const total  = monthly * paymentPeriod.value * 12

  const expiryLabel = (() => {
    if (insurancePeriod.value === 'life') {
      return insuranceType.value === 'life' ? '종신' : '100세 만기'
    }
    return `${age.value + (insurancePeriod.value as number)}세 만기 (${insurancePeriod.value}년)`
  })()

  result.value = { monthly, yearly, total, expiryLabel }
}

// ── 유틸 ──────────────────────────────────────────────────────
function formatCoverage(won: number): string {
  if (won >= 100_000_000) return `${won / 100_000_000}억원`
  return `${(won / 10_000).toLocaleString()}만원`
}
</script>

<style scoped>
.block-insurance-calc {
  max-width: 720px;
  margin: 40px auto;
  padding: 0 4px;
}

/* ── Header ── */
.calc-header {
  text-align: center;
  margin-bottom: 32px;
}
.calc-title {
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 10px;
  letter-spacing: -0.02em;
}
.calc-subtitle {
  font-size: 15px;
  color: var(--theme-fg-dim);
  margin: 0;
}

/* ── Body ── */
.calc-body {
  border: 1px solid var(--theme-line);
  background: var(--theme-bg);
  border-radius: 4px;
  overflow: hidden;
}

/* ── Form ── */
.calc-form {
  padding: 32px 36px 28px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.calc-field {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calc-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--theme-fg-dim);
}

/* 성별 토글 */
.calc-toggle {
  display: flex;
  gap: 0;
  width: fit-content;
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  overflow: hidden;
}
.toggle-btn {
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.toggle-btn.active {
  background: var(--theme-fg);
  color: var(--theme-bg);
}

/* 입력 행 */
.calc-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.calc-input {
  padding: 9px 12px;
  border: 1px solid var(--theme-line);
  border-radius: 4px;
  font-size: 15px;
  background: var(--theme-bg);
  color: var(--theme-fg);
  transition: border-color 0.15s;
  width: 140px;
}
.calc-input-sm {
  width: 90px;
}
.calc-input:focus {
  outline: none;
  border-color: #1a6eb8;
}
.calc-unit {
  font-size: 14px;
  color: var(--theme-fg-dim);
}
.calc-warn {
  font-size: 12px;
  color: #e05252;
}

/* 버튼 그룹 선택 */
.calc-select-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.select-btn {
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid var(--theme-line);
  border-radius: 20px;
  background: var(--theme-bg);
  color: var(--theme-fg-dim);
  cursor: pointer;
  transition: all 0.15s;
}
.select-btn:hover {
  border-color: #93b8d4;
  color: #1a6eb8;
}
.select-btn.active {
  border-color: #1a6eb8;
  background: #1a6eb8;
  color: #fff;
}

/* 슬라이더 */
.calc-range {
  width: 100%;
  accent-color: #1a6eb8;
  cursor: pointer;
}
.calc-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--theme-fg-faint);
}
.calc-range-labels span:nth-child(2) {
  color: #1a6eb8;
  font-weight: 600;
}

/* 계산 버튼 */
.calc-submit {
  margin-top: 4px;
  padding: 14px;
  background: #1a6eb8;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.15s;
}
.calc-submit:hover {
  background: #155da0;
}

/* ── 결과 ── */
.calc-result {
  padding: 32px 36px;
  background: #f0f6fb;
  border-top: 1px solid #d0e4f0;
}
.result-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-bottom: 24px;
  text-align: center;
}
.result-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #1a6eb8;
  text-transform: uppercase;
}
.result-amount {
  font-family: var(--theme-serif, var(--theme-sans));
  font-size: 48px;
  font-weight: 700;
  color: #0f4f8a;
  letter-spacing: -0.02em;
  line-height: 1;
}
.result-amount em {
  font-style: normal;
  font-size: 22px;
  font-weight: 500;
  margin-left: 2px;
  color: #1a6eb8;
}

.result-breakdown {
  border-top: 1px solid #c5daea;
  border-bottom: 1px solid #c5daea;
  padding: 16px 0;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.breakdown-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}
.breakdown-row span:first-child {
  color: var(--theme-fg-dim);
}
.breakdown-row span:last-child {
  font-weight: 600;
  color: #0f4f8a;
}

.result-notice {
  font-size: 11px;
  color: var(--theme-fg-faint);
  margin: 0 0 16px;
  line-height: 1.6;
}

.calc-consult-btn {
  display: block;
  text-align: center;
  padding: 12px;
  background: #0f4f8a;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.15s;
}
.calc-consult-btn:hover {
  background: #0a3d6e;
}

/* ── 트랜지션 ── */
.calc-result-fade-enter-active,
.calc-result-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.calc-result-fade-enter-from,
.calc-result-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ── 모바일 ── */
@media (max-width: 600px) {
  .calc-form {
    padding: 24px 20px 20px;
  }
  .calc-result {
    padding: 24px 20px;
  }
  .result-amount {
    font-size: 38px;
  }
  .calc-select-group {
    gap: 6px;
  }
  .select-btn {
    padding: 6px 14px;
    font-size: 12px;
  }
}
</style>
