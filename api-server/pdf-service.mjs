import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ANALYSIS_DIR = path.resolve(__dirname, '../app/pages/analysis')
const CSS_PATH     = path.resolve(__dirname, '../app/assets/css/insurance-proposal.css')

const FONT_DIR_CANDIDATES = [
  path.resolve(__dirname, '../app/public/fonts'),
  path.join(os.homedir(), '.local/share/fonts'),
  '/usr/share/fonts/pretendard',
]

const STATIC_WEIGHTS = [
  { file: 'Pretendard-Thin.ttf',       weight: 100 },
  { file: 'Pretendard-ExtraLight.ttf', weight: 200 },
  { file: 'Pretendard-Light.ttf',      weight: 300 },
  { file: 'Pretendard-Regular.ttf',    weight: 400 },
  { file: 'Pretendard-Medium.ttf',     weight: 500 },
  { file: 'Pretendard-SemiBold.ttf',   weight: 600 },
  { file: 'Pretendard-Bold.ttf',       weight: 700 },
  { file: 'Pretendard-ExtraBold.ttf',  weight: 800 },
  { file: 'Pretendard-Black.ttf',      weight: 900 },
]

async function toBase64Font(filePath) {
  try {
    const data = await readFile(filePath)
    return data.toString('base64')
  } catch { return null }
}

async function buildFontCss() {
  const rules = []

  // 1) static weight fonts
  for (const dir of FONT_DIR_CANDIDATES) {
    let found = 0
    for (const { file, weight } of STATIC_WEIGHTS) {
      const p = path.join(dir, file)
      if (!existsSync(p)) continue
      const b64 = await toBase64Font(p)
      if (!b64) continue
      found++
      rules.push(`@font-face {
  font-family: 'Pretendard';
  font-weight: ${weight};
  src: url('data:font/truetype;base64,${b64}') format('truetype');
  font-display: block;
}
@font-face {
  font-family: 'Pretendard Variable';
  font-weight: ${weight};
  src: url('data:font/truetype;base64,${b64}') format('truetype');
  font-display: block;
}`)
    }
    if (found > 0) break
  }

  // 2) variable font fallback
  if (rules.length === 0) {
    for (const dir of FONT_DIR_CANDIDATES) {
      const p = path.join(dir, 'PretendardVariable.ttf')
      if (!existsSync(p)) continue
      const b64 = await toBase64Font(p)
      if (!b64) continue
      rules.push(`@font-face {
  font-family: 'Pretendard Variable';
  src: url('data:font/truetype;base64,${b64}') format('truetype');
  font-weight: 100 900;
  font-display: block;
}`)
      break
    }
  }

  if (rules.length === 0) return ''
  return rules.join('\n') + `\n* { font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans CJK KR', 'Noto Serif CJK KR', sans-serif; }`
}

const PRINT_CSS = `
@media print {
  @page { size: 297mm 210mm; margin: 0; }
  body  { background: var(--bg-outer, #E8D6B4); }
  .viewport {
    display: block !important;
    padding: 0 !important;
    gap:     0 !important;
    background: transparent !important;
  }
  .page {
    break-after:          page;
    page-break-after:     always;
    break-inside:         avoid;
    page-break-inside:    avoid;
    box-shadow:           none !important;
    margin:               0 !important;
  }
}
`

async function buildHtml(proposalData) {
  const [css, rendererRaw, fontCss] = await Promise.all([
    readFile(CSS_PATH, 'utf8'),
    readFile(path.join(ANALYSIS_DIR, 'insuranceRenderer.js'), 'utf8'),
    buildFontCss(),
  ])

  // Strip ES module export keywords so the script runs inline
  const rendererJs = rendererRaw.replace(/^export\s+/gm, '')
  const dataJson   = JSON.stringify(proposalData)

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
<style>
${fontCss}
body { margin: 0; padding: 0; background: var(--bg-outer, #E8D6B4); }
${css}
${PRINT_CSS}
</style>
</head>
<body>
<div id="vp" class="viewport"></div>
<script>
${rendererJs}
renderProposal(${dataJson}, document.getElementById('vp'));
</script>
</body>
</html>`
}

// ── Server-side proposalData builder (mirrors buildProposalFromAnalysis.js) ──

const EPITHET_DEFAULTS = ['The Vanguard', 'The Access Pass', 'The Guardian', 'The Protector']
const SEAL_CHARS       = ['先', '通', '守', '全']
const POSITION_MAP     = ['tl', 'tr', 'bl', 'br']

function renumber(pages) {
  const total = pages.length
  pages.forEach((p, i) => {
    if (!p || typeof p !== 'object') return // skip malformed (non-object) page entries
    p.pageNo = i + 1
    if (p.eyebrow) p.eyebrow.pagination = { current: i + 1, total }
    if (p.footer)  p.footer.pageNumber  = i + 1
  })
}

export async function buildProposalData(analysisResult, customerName = '고객', agentName = '설계사') {
  const a            = analysisResult || {}
  const openingPages = JSON.parse(await readFile(path.join(ANALYSIS_DIR, 'opening.json'), 'utf8'))

  // Patch opening page footers with the actual customer name
  const brandText = `${customerName} 고객님 맞춤 통합 보장 블루프린트 · `
  openingPages.forEach(p => {
    if (p.footer?.brand) p.footer.brand.text = brandText
  })

  // Format A — already contains a pages array
  if (Array.isArray(a.pages)) {
    // Drop malformed (non-object) page entries — corrupted LLM output can leave
    // raw strings in the array, which would otherwise crash renumber().
    const validPages = a.pages.filter(p => p && typeof p === 'object' && !Array.isArray(p))
    const all = [...JSON.parse(JSON.stringify(openingPages)), ...JSON.parse(JSON.stringify(validPages))]
      .sort((x, y) => (x.pageNo || 0) - (y.pageNo || 0))
    renumber(all)
    return { ...JSON.parse(JSON.stringify(a)), pages: all, totalPages: all.length }
  }

  // Format B — LLM analysis result { customer, proposals, ... }
  const customer     = a.customer  || {}
  const proposals    = a.proposals || []
  const n            = proposals.length
  const cname        = customer.name       || customerName
  const aname        = customer.contractor || agentName
  const totalMonthly = a.recommendations?.totalMonthly
    || proposals.reduce((s, p) => s + (p.monthlyPremium || 0), 0)

  const footerBrand = {
    text:     `${cname} 고객님 맞춤 통합 보장 블루프린트 · `,
    emphasis: `${n}개사 강점 조립형 설계`,
  }

  const pages = []

  pages.push({
    id: 'page-cover', type: 'sectionCover',
    eyebrow: { seal: '藍', subtitle: 'Bespoke Protection Blueprint' },
    cover: {
      title:       `${cname} 고객님을 위한\n노후 리스크 대비\n맞춤형 통합 보장\n블루프린트`,
      description: `단일 상품의 한계를 극복하고 ${n}개사의 강점만을 결합한\n가족 보호 설계 제안서`,
    },
    footer: { brand: footerBrand },
  })

  pages.push({
    id: 'page-mission', type: 'missionStatement',
    eyebrow: { seal: '護', subtitle: '보험의 진정한 목적' },
    title: {
      text:     '단순한 보험 가입이 아닌,\n가족의 존엄과 경제적 안정을 지키는 준비입니다',
      emphasis: '가족의 존엄과 경제적 안정',
    },
    body: {
      missionCard: {
        text: `${cname} 고객님 연령대에서 보험의 진정한 목적은 단순한 가입이 아닙니다.\n`
            + '가장 중요한 것은 큰 병이 발생했을 때 가족의 경제적 부담을 줄이고,\n'
            + '돈 때문에 최선의 치료 선택을 포기하지 않도록 만드는 실제적인 방어력입니다.',
        emphases: ['가족의 경제적 부담', '실제적인 방어력'],
      },
      pillars: [
        { heading: '가족 부담 감소',   body: '고액 치료와 장기 간병 상황에서도 가족의 경제적 부담을 줄일 수 있도록 실제 생활 리스크까지 함께 고려한 준비입니다.' },
        { heading: '치료 선택권 확보', body: '최신 치료와 상급병원 치료 앞에서도 비용 때문에 치료를 포기하지 않도록 선택의 폭을 넓히는 구조입니다.' },
        { heading: '장기 치료 대비',   body: '한 번의 치료로 끝나지 않는 현실을 고려하여 반복 치료·간병·생활비 공백까지 함께 대비합니다.' },
      ],
    },
    footer: { brand: footerBrand },
  })

  const ageSuffix = customer.age ? `${customer.age}세의 질병은` : '중장년의 질병은'
  pages.push({
    id: 'page-risk', type: 'riskIceberg',
    eyebrow: { seal: '氷', subtitle: '복합 질환의 현실' },
    title: {
      text:     `${ageSuffix}\n수면 아래의 거대한 연쇄 비용과 싸우는 과정입니다`,
      emphasis: '거대한 연쇄 비용',
    },
    body: {
      iceberg: {
        visible: { title: '눈에 보이는 직접 치료비', items: ['진단비', '수술비', '입원비', '초기 치료비'] },
        hidden:  { title: '숨겨진 장기 연쇄 비용',   items: ['수개월~수년의 간병비', '반복되는 재활 및 통원', '후유장해 이후 생활비', '가족의 생업 중단 위험'] },
      },
      aside: {
        heading: '복합 질환의 현실',
        body:    '노년층에서는 단일 질환보다 여러 리스크가 동시에 발생하는 경우가 많습니다.',
        pairs:   ['암 + 심장질환', '암 + 뇌혈관질환', '대형 수술 + 장기 간병', '치매 + 장기 입원'],
      },
    },
    footer: { brand: footerBrand },
  })

  pages.push({
    id: 'page-puzzle', type: 'companyPuzzleOverview',
    eyebrow: { seal: '合', subtitle: `${n}개사 강점 조립` },
    title: {
      text:     `단일 상품의 한계를 넘어,\n${n}개사의 핵심 강점을 조립해\n보장 공백을 줄였습니다`,
      emphasis: '보장 공백',
    },
    body: {
      quote: {
        text:     '한 회사의 상품만으로는 간병·생활비와 고액 치료비를 동시에 충분히 대비하기 어렵습니다.\n그래서 각 보험사의 강점 보장을 조합하여 하나의 통합 구조로 설계했습니다.',
        emphases: ['간병·생활비', '고액 치료비', '강점 보장'],
      },
      pieces: proposals.map((p, i) => ({
        position: POSITION_MAP[i] || 'tl',
        order:    i + 1,
        company:  p.company,
        epithet:  p.epithet || EPITHET_DEFAULTS[i] || `Carrier ${i + 1}`,
        role:     p.role || p.product || '',
      })),
    },
    footer: { brand: footerBrand },
  })

  pages.push({
    id: 'page-matrix', type: 'companyMatrix',
    eyebrow: { seal: '陣', subtitle: '전략적 역할 분담' },
    title: { text: '각 보험사의 전략적 역할을 분담한\n통합 진단 매트릭스', emphasis: '통합 진단 매트릭스' },
    body: {
      table: {
        columns: ['보험사', '전략적 역할', '핵심 보장 기능', '고객이 얻는 혜택'],
        rows: proposals.map((p, i) => ({
          company:  p.company,
          epithet:  p.epithet || EPITHET_DEFAULTS[i] || '',
          role:     { main: p.role || '핵심 보장', sub: p.product || '' },
          coverage: Array.isArray(p.coverage) ? p.coverage.join(', ') : (p.coverage || p.role || ''),
          benefit:  Array.isArray(p.keyBenefits) ? p.keyBenefits[0] : (p.keyBenefits || p.role || ''),
        })),
      },
    },
    footer: { brand: footerBrand },
  })

  proposals.forEach((p, i) => {
    const epithet     = p.epithet || EPITHET_DEFAULTS[i] || `Carrier ${i + 1}`
    const benefits    = Array.isArray(p.keyBenefits) ? p.keyBenefits : [p.role || ''].filter(Boolean)
    const coverageList = Array.isArray(p.coverage) ? p.coverage : []
    pages.push({
      id:   `page-detail-${i + 1}`,
      type: 'companyDetail',
      eyebrow: { seal: SEAL_CHARS[i] || '保', subtitle: `${epithet} · ${p.role || p.product || ''}` },
      title:   { text: `${p.company} — ${p.role || p.product || '핵심 보장'}`, emphasis: p.role || p.product || p.company },
      premium: {
        monthly:  p.monthlyPremium || 0,
        currency: 'KRW',
        display:  `${(p.monthlyPremium || 0).toLocaleString('ko-KR')}원`,
      },
      visual: {
        type:         'barChart',
        label:        'Coverage Snapshot',
        bars:         [],
        coverageList: coverageList.length ? coverageList : benefits,
      },
      strategy: {
        heading: '핵심 전략',
        items:   benefits.slice(0, 3).map(b => ({ key: b, desc: b })),
        quote:   p.role || p.product || '',
      },
      footer: { brand: footerBrand },
    })
  })

  pages.push({
    id: 'page-journey', type: 'careJourney',
    eyebrow: { seal: '途', subtitle: 'The Zero-Gap Care Journey' },
    title: {
      text:     `질병의 발견부터 회복 이후까지,\n${n}개의 보장이 단계별로 연결됩니다`,
      emphasis: `${n}개의 보장이 단계별로 연결`,
    },
    body: {
      journeyTag: 'The Zero-Gap Care Journey',
      journey: proposals.map((p, i) => ({
        stage:    i + 1,
        company:  p.company,
        heading:  p.role || p.product || `${p.company} 보장`,
        action:   Array.isArray(p.keyBenefits) ? p.keyBenefits[0] : (p.role || ''),
        emphasis: p.company,
      })),
    },
    footer: { brand: footerBrand },
  })

  pages.push({
    id: 'page-closing', type: 'closingBalance',
    eyebrow: { seal: '愛', subtitle: '우리가 진짜 준비하는 것' },
    title: {
      text:     '우리가 지불하는 것은 매월의 보험료가 아니라,\n가족이 짊어질 미래 부담을 줄이기 위한 준비입니다',
      emphasis: '미래 부담을 줄이기 위한 준비',
    },
    body: {
      balance: {
        left: {
          label:  'PAY',
          title:  `${n}개사 통합 플랜의 월 보험료`,
          detail: {
            amount: totalMonthly,
            unit:   '원',
            text:   `월 ${totalMonthly.toLocaleString('ko-KR')}원의 예측 가능한 정액 지출`,
          },
        },
        right: {
          label:  'REMOVE',
          title:  '가족이 짊어질 수 있는 미래 부담',
          detail: { items: ['수천만 원의 치료비', '기약 없는 장기 간병 부담', '자녀의 경제적 희생 가능성'] },
        },
      },
      closingStatement: {
        lead:      '고객님 연령에서는 가장 싼 보험보다',
        main:      '가족의 부담을 실제로 줄일 수 있는 설계를 선택하는 것이 중요합니다.',
        closing:   `이 맞춤형 통합 플랜은 ${cname} 고객님께서 가족을 위해 준비하실 수 있는 현실적인 사랑의 표현이 될 수 있습니다.`,
        signature: `${cname} 고객님께 드리는 약속`,
      },
    },
    footer: { brand: footerBrand },
  })

  const all = [...JSON.parse(JSON.stringify(openingPages)), ...pages]
    .sort((x, y) => (x.pageNo || 999) - (y.pageNo || 999))

  renumber(all)

  return {
    id:           `proposal-${Date.now()}`,
    title:        `${cname} 고객님 맞춤 통합 보장 블루프린트`,
    subtitle:     `${n}개사 강점 조립형 설계`,
    documentType: 'customerProposal',
    totalPages:   all.length,
    customer: {
      name:       cname,
      age:        customer.age    || 0,
      gender:     customer.gender || '',
      contractor: aname,
    },
    disclaimer: {
      text: '본 자료는 보험 가입 검토를 돕기 위한 요약 제안서이며, 실제 보장 내용과 보험금 지급 기준은 각 보험사의 약관 및 상품설명서를 기준으로 합니다.',
    },
    renderHint: { theme: 'luxury', layout: 'center-focus', background: 'dark-navy', accent: 'gold' },
    pages: all,
  }
}

// ── PDF generator ────────────────────────────────────────────────────────────

function sanitizeFilename(name) {
  return (name || 'proposal')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')   // 파일명 금지 문자 제거
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'proposal'
}

export async function generatePdf(proposalData, uploadDir, title = 'proposal') {
  let puppeteer
  try {
    const mod = await import('puppeteer')
    puppeteer = mod.default
  } catch {
    throw new Error('puppeteer가 설치되지 않았습니다. npm install을 실행하세요.')
  }

  const html    = await buildHtml(proposalData)
  const launchOpts = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  }
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
  }
  const browser = await puppeteer.launch(launchOpts)

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1122, height: 794 })
    await page.setContent(html, { waitUntil: 'networkidle2', timeout: 60_000 })
    await page.evaluate(() => document.fonts.ready)
    // 폰트 로딩 완료 후 본문이 footer를 넘치지 않도록 페이지별 자동 축소 적용
    await page.evaluate(() => { if (window.__fitPages) window.__fitPages() })

    const pdfBuf = await page.pdf({
      printBackground: true,
      format:          'A4',
      landscape:       true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    })

    const filename = `${sanitizeFilename(title)}.pdf`

    const now  = new Date()
    const yyyy = now.getFullYear().toString()
    const mm   = String(now.getMonth() + 1).padStart(2, '0')
    const dir  = path.resolve(uploadDir, yyyy, mm, 'pdf')
    const urlPath = `/uploads/${yyyy}/${mm}/pdf/${filename}?t=${Date.now()}`

    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), pdfBuf)

    return { filename, urlPath }
  } finally {
    await browser.close()
  }
}
