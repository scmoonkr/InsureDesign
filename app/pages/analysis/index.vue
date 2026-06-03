<template>
  <div class="ia-shell">
    <!-- 개발용 컨트롤 바 (프로덕션에서 제거 가능) -->
    <div class="ia-bar">
      <span class="ia-bar-title">{{ data.title }}</span>
      <span class="ia-bar-meta">{{ data.customer.name }} · {{ data.customer.age }}세 · {{ data.totalPages }}p</span>
    </div>

    <!-- 원본 HTML과 동일한 viewport -->
    <div ref="viewport" class="viewport" id="viewport" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderProposal } from './insuranceRenderer.js'
import blueprintData from './blueprint_pages_v2.json'
import openingPages from './opening.json'
import existingAnalysisPages from './existingAnalysis.json'

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

// 각 JSON 파일을 합산 후 pageNo 순 정렬
// opening.json            → p1, p2  (고정)
// existingAnalysis.json   → p3, p4  (기존보험 있을 때만, 없으면 빈 배열)
// blueprint_pages_v2.json → p5~     (LLM 생성, 보험사 수에 따라 가변)
const bp = blueprintData as any
const mergedPages = [
  ...(openingPages as any[]),
  ...(existingAnalysisPages as any[]),
  ...(bp.pages as any[]),
].sort((a: any, b: any) => a.pageNo - b.pageNo)

const data = {
  ...bp,
  totalPages: mergedPages.length,  // 실제 페이지 수로 자동 계산
  pages: mergedPages,
}

const viewport = ref<HTMLElement | null>(null)

onMounted(() => {
  if (viewport.value) {
    renderProposal(data, viewport.value)
  }
})
</script>

<style scoped>
/* ── 개발용 쉘 (Vue 페이지 전용, 원본 HTML body에 해당) ── */
.ia-shell {
  background: var(--bg-outer, #E8D6B4);
  min-height: 100vh;
}

/* ── 개발용 컨트롤 바 ─────────────────────────────────── */
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
.ia-bar-title {
  font-size: 12px;
  font-weight: 600;
  color: #E5A862;
  letter-spacing: 0.03em;
}
.ia-bar-meta {
  font-size: 11px;
  color: rgba(251, 245, 236, 0.45);
}
</style>

<style>
/* ══════════════════════════════════════════════════════════════
   원본 insurance_analysis.html CSS — 그대로 이식
   (font-face UUID → CDN URL 교체, 나머지 완전 동일)
   ══════════════════════════════════════════════════════════════ */

/* ── CSS 변수 ──────────────────────────────────────────────── */
:root {
  --pg-w: 297mm;
  --pg-h: 210mm;
  --pad-x: 16mm;
  --pad-t: 13mm;
  --pad-b: 11mm;

  --ivory:   #FBF5EC;
  --ivory-2: #F4E6CE;
  --paper:   #FFFCF6;
  --bg-outer:#E8D6B4;

  --ink:    #221912;
  --ink-2:  #463528;
  --muted:  #7A6249;
  --muted-2:#A0876A;
  --rule:   #D9C5A0;
  --rule-2: #ECDDC0;

  --dark:      #6B2D14;
  --dark-2:    #4A1F0E;
  --dark-warm: #8C3A1A;

  --seal:      #B23A12;
  --seal-deep: #7A2810;
  --bronze:    #C97A2A;
  --gold-line: #E5A862;
  --ok:        #6B4A14;

  --c-heungkuk: #2A3E66;
  --c-lina:     #5C2A66;
  --c-kb:       #6E5A1B;
  --c-hanwha:   #2C5E54;

  --shadow-page: 0 1px 2px rgba(60,30,10,.08), 0 24px 50px -20px rgba(80,40,10,.28);

  --f-serif: "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif;
  --f-sans:  "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif;
  --f-disp:  "Cormorant Garamond", "Pretendard Variable", "Pretendard", serif;
}

/* ── Reset ─────────────────────────────────────────────────── */
* { box-sizing: border-box; }

/* ── Viewport ──────────────────────────────────────────────── */
.viewport {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14mm;
  padding: 14mm 0;
}

/* ══════════════════════════════════════════════════════════════
   Page shell
   ══════════════════════════════════════════════════════════════ */
.page {
  position: relative;
  width: var(--pg-w);
  height: var(--pg-h);
  background: var(--ivory);
  color: var(--ink);
  box-shadow: var(--shadow-page);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: var(--pad-t) var(--pad-x) var(--pad-b);
  font-size: 10.5pt;
  line-height: 1.55;
  min-height: 0;
}
.page::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 8%, rgba(168,122,58,.04), transparent 40%),
    radial-gradient(circle at 90% 95%, rgba(139,31,31,.03), transparent 40%);
  pointer-events: none;
  z-index: 0;
}
.page > * { position: relative; z-index: 1; }

/* ══════════════════════════════════════════════════════════════
   Header
   ══════════════════════════════════════════════════════════════ */
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 6mm;
  border-bottom: 0.4pt solid var(--rule);
  margin-bottom: 7mm;
}
.eyebrow { display: flex; align-items: center; gap: 10px; }
.seal {
  width: 38px; height: 38px;
  background: var(--seal);
  color: var(--ivory);
  display: grid;
  place-items: center;
  font-family: var(--f-serif);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -.02em;
  border-radius: 2px;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 1px 1px rgba(0,0,0,.18);
}
.seal::after {
  content: "";
  position: absolute;
  inset: 2px;
  border: 0.5px solid rgba(255,255,255,.28);
  border-radius: 1px;
  pointer-events: none;
}
.eyebrow-text { display: flex; flex-direction: column; gap: 1px; }
.eyebrow-label {
  font-family: var(--f-disp);
  font-style: italic;
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--bronze);
}
.eyebrow-sub {
  font-family: var(--f-serif);
  font-weight: 500;
  font-size: 12.5px;
  letter-spacing: .02em;
  color: var(--ink);
}
.head-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-family: var(--f-disp);
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--muted);
}
.head-meta .doc-title {
  font-family: var(--f-serif);
  font-weight: 500;
  font-size: 10.5px;
  letter-spacing: .02em;
  color: var(--ink-2);
  text-transform: none;
}
.head-meta .doc-section { font-size: 9.5px; letter-spacing: .22em; }

/* ══════════════════════════════════════════════════════════════
   Footer
   ══════════════════════════════════════════════════════════════ */
.page-foot {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: end;
  padding-top: 5mm;
  border-top: 0.4pt solid var(--rule);
  margin-top: 6mm;
}
.foot-left { display: flex; flex-direction: column; gap: 3px; max-width: 230mm; }
.disclaimer { font-size: 8pt; line-height: 1.45; color: var(--muted); font-weight: 300; }
.disclaimer-label {
  display: inline-block;
  font-family: var(--f-disp);
  font-style: italic;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--bronze);
  margin-right: 6px;
  font-size: 8.5pt;
}
.foot-brand-line {
  font-family: var(--f-disp);
  font-style: italic;
  font-size: 9pt;
  letter-spacing: .04em;
  color: var(--muted-2);
}
.foot-brand-line .brand-em {
  font-family: var(--f-sans);
  font-style: normal;
  font-weight: 600;
  color: var(--ink-2);
  letter-spacing: 0;
}
.foot-pg {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--f-disp);
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--muted);
}
.foot-pg .num { font-family: var(--f-serif); font-weight: 600; font-size: 16px; letter-spacing: 0; color: var(--ink); }
.foot-pg .total { color: var(--muted-2); }

/* ══════════════════════════════════════════════════════════════
   Common type
   ══════════════════════════════════════════════════════════════ */
.page-title {
  font-family: var(--f-serif);
  font-weight: 800;
  font-size: 26pt;
  line-height: 1.22;
  letter-spacing: -.028em;
  color: var(--ink);
  margin: 0;
}
.page-title em.em,
.page-title-sm em.em {
  font-style: normal;
  color: var(--seal);
  background: linear-gradient(transparent 62%, rgba(229,168,98,.4) 62%, rgba(229,168,98,.4) 92%, transparent 92%);
  padding: 0 .04em;
}
.page-title-sm {
  font-family: var(--f-serif);
  font-weight: 800;
  font-size: 22pt;
  line-height: 1.22;
  letter-spacing: -.025em;
}
.page-desc { font-size: 11pt; color: var(--ink-2); max-width: 220mm; font-weight: 400; }
.kicker {
  font-family: var(--f-disp);
  font-style: italic;
  font-size: 11.5pt;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--bronze);
}
.rule-thin { height: 0.4pt; background: var(--rule); width: 100%; }
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border: 0.4pt solid var(--rule);
  border-radius: 999px;
  font-size: 9pt;
  color: var(--ink-2);
  font-weight: 500;
  background: rgba(255,255,255,.5);
}
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; }
.num-marker {
  font-family: var(--f-disp);
  font-style: italic;
  font-weight: 500;
  font-size: 20pt;
  line-height: 1;
  color: var(--bronze);
  letter-spacing: .02em;
}
.num-marker.lg { font-size: 26pt; }

/* Print */
@page { size: A4 landscape; margin: 0; }
@media print {
  html, body { background: white; width: 297mm; }
  .viewport { gap: 0; padding: 0; margin: 0; display: block; }
  .page {
    box-shadow: none; margin: 0;
    width: 297mm; height: 209.9mm;
    overflow: hidden;
    page-break-after: always; break-after: page;
    page-break-inside: avoid; break-inside: avoid;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .t-sectionCover,
  .summary-box, .callout, .mission-card,
  .t-companyMatrix thead th, .pivot, .ice-half.hidden, .seal, .seal-mini {
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
}
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* ══════════════════════════════════════════════════════════════
   p1 · Opening Essay
   ══════════════════════════════════════════════════════════════ */
.t-openingEssay .body { display: grid; grid-template-columns: 1.05fr 1fr; gap: 18mm; align-items: stretch; }
.t-openingEssay .ttl-block { display: flex; flex-direction: column; gap: 8mm; }
.t-openingEssay .big-title {
  font-family: var(--f-serif);
  font-weight: 600;
  font-size: 56pt;
  line-height: 1.05;
  letter-spacing: -.02em;
  color: var(--ink);
  margin: 0;
}
.t-openingEssay .big-title .line-em {
  font-style: italic; font-weight: 700; color: var(--seal); font-family: var(--f-serif);
}
.t-openingEssay .quote-row { display: flex; flex-direction: column; gap: 8px; margin-top: 6mm; }
.t-openingEssay .quote-card {
  border: 0.6pt solid var(--rule); background: var(--paper); padding: 22px 20px 16px; position: relative;
}
.t-openingEssay .quote-card::before {
  content: "\201C";
  position: absolute; top: 4px; left: 12px;
  font-family: var(--f-serif); font-weight: 700; font-size: 28pt; line-height: 1; color: var(--bronze);
}
.t-openingEssay .quote-card .qt {
  font-family: var(--f-serif); font-weight: 600; font-size: 14pt; color: var(--ink); padding-left: 22px;
}
.t-openingEssay .essay {
  display: flex; flex-direction: column; gap: 9px;
  border-left: 0.8pt solid var(--rule); padding-left: 10mm;
}
.t-openingEssay .essay p { margin: 0; font-size: 13pt; line-height: 1.7; color: var(--ink-2); }
.t-openingEssay .essay p:first-child::first-letter {
  font-family: var(--f-serif); font-weight: 700; font-size: 36pt;
  float: left; line-height: .92; padding: 2px 8px 0 0; color: var(--seal);
}
.t-openingEssay .closer {
  margin-top: 6mm;
  font-family: var(--f-serif); font-style: italic; font-weight: 500; font-size: 14pt; color: var(--ink);
  border-top: 0.4pt solid var(--rule); padding-top: 5mm;
}

/* ══════════════════════════════════════════════════════════════
   p2 · Empathy Cards
   ══════════════════════════════════════════════════════════════ */
.t-empathyCards .body { display: grid; grid-template-rows: auto minmax(0,1fr) auto; gap: 7mm; min-height: 0; }
.t-empathyCards .cards { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; }
.t-empathyCards .card {
  background: var(--paper); border: 0.5pt solid var(--rule); border-top: 2pt solid var(--seal);
  padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 8px;
}
.t-empathyCards .card .num-marker { font-size: 24pt; }
.t-empathyCards .card h4 { font-family: var(--f-serif); font-weight: 700; font-size: 12.5pt; line-height: 1.3; margin: 0; color: var(--ink); letter-spacing: -.008em; }
.t-empathyCards .card p { font-size: 9.6pt; color: var(--ink-2); line-height: 1.55; margin: 0; }
.t-empathyCards .callout {
  background: var(--dark); color: var(--ivory);
  padding: 12mm 14mm; display: flex; align-items: center; gap: 14mm; position: relative;
}
.t-empathyCards .callout::before {
  content: "?";
  font-family: var(--f-serif); font-style: italic; font-weight: 600; font-size: 70pt; line-height: .7;
  color: var(--bronze); opacity: .5;
}
.t-empathyCards .callout .ct {
  font-family: var(--f-serif); font-weight: 500; font-size: 16pt; line-height: 1.4; letter-spacing: -.01em; color: var(--ivory);
}

/* ══════════════════════════════════════════════════════════════
   p3 · Existing Analysis
   ══════════════════════════════════════════════════════════════ */
.t-existingAnalysis .body { display: grid; grid-template-rows: auto auto minmax(0,1fr); gap: 6mm; min-height: 0; }
.t-existingAnalysis .desc { color: var(--ink-2); font-size: 11pt; max-width: 200mm; }
.t-existingAnalysis .summary-box {
  background: var(--dark); color: var(--ivory);
  padding: 9mm 11mm; display: grid; grid-template-columns: auto 1fr auto; gap: 11mm; align-items: center;
}
.t-existingAnalysis .summary-box .lbl { display: flex; flex-direction: column; gap: 4px; }
.t-existingAnalysis .summary-box .lbl .k { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; font-size: 10pt; text-transform: uppercase; color: var(--bronze); }
.t-existingAnalysis .summary-box .lbl .v { font-family: var(--f-serif); font-weight: 700; font-size: 15pt; color: var(--ivory); }
.t-existingAnalysis .summary-box .lbl::after { content: ""; width: 36px; height: 0.6pt; background: var(--gold-line); margin-top: 6px; }
.t-existingAnalysis .summary-box .heading { font-family: var(--f-serif); font-weight: 600; font-size: 13.5pt; line-height: 1.35; }
.t-existingAnalysis .summary-box .heading .b { display: block; font-family: var(--f-sans); font-weight: 400; font-size: 10pt; color: rgba(251,247,238,.75); margin-top: 5px; line-height: 1.5; letter-spacing: 0; }
.t-existingAnalysis .summary-box .verdict { max-width: 70mm; font-size: 10pt; line-height: 1.45; color: var(--gold-line); border-left: 0.6pt solid var(--gold-line); padding-left: 10px; font-family: var(--f-serif); font-weight: 500; }
.t-existingAnalysis .findings { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; }
.t-existingAnalysis .find { padding: 12px 12px 14px; border-top: 0.6pt solid var(--dark); display: flex; flex-direction: column; gap: 7px; }
.t-existingAnalysis .find .num-marker { font-size: 16pt; color: var(--ink); }
.t-existingAnalysis .find h5 { font-family: var(--f-serif); font-weight: 700; font-size: 11.5pt; line-height: 1.32; margin: 0; color: var(--ink); }
.t-existingAnalysis .find p { font-size: 9.4pt; line-height: 1.5; color: var(--ink-2); margin: 0; }

/* ══════════════════════════════════════════════════════════════
   p4 · Issue List
   ══════════════════════════════════════════════════════════════ */
.t-issueList .body { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 6mm; min-height: 0; }
.t-issueList .desc { color: var(--ink-2); font-size: 11pt; }
.t-issueList .grid { display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: repeat(2,1fr); gap: 10px; }
.t-issueList .issue { background: var(--paper); border: 0.5pt solid var(--rule); padding: 14px 16px 14px; display: grid; grid-template-columns: auto 1fr; gap: 10px 14px; position: relative; }
.t-issueList .issue .nm { font-family: var(--f-disp); font-style: italic; font-weight: 500; font-size: 26pt; line-height: .9; color: var(--seal); border-right: 0.6pt solid var(--rule); padding-right: 12px; align-self: start; }
.t-issueList .issue h4 { font-family: var(--f-serif); font-weight: 700; font-size: 13pt; line-height: 1.25; margin: 0 0 6px 0; color: var(--ink); }
.t-issueList .issue p { font-size: 9.6pt; line-height: 1.5; color: var(--ink-2); margin: 0 0 9px 0; }
.t-issueList .issue .tag-row { grid-column: 2; gap: 6px; flex-wrap: nowrap; }
.t-issueList .issue .tag { font-size: 8pt; background: var(--ivory-2); border-color: var(--rule-2); color: var(--ink-2); border-radius: 5px; width: 74px; padding: 6px 4px; justify-content: center; text-align: center; white-space: nowrap; }

/* ══════════════════════════════════════════════════════════════
   p5 · Section Cover
   ══════════════════════════════════════════════════════════════ */
.t-sectionCover { background: var(--dark); color: var(--ivory); }
.t-sectionCover.page::before { display: none; }
.t-sectionCover .page-head { border-bottom-color: rgba(251,247,238,.18); }
.t-sectionCover .eyebrow-label { color: var(--gold-line); }
.t-sectionCover .eyebrow-sub { color: var(--ivory); }
.t-sectionCover .head-meta { color: rgba(251,247,238,.5); }
.t-sectionCover .head-meta .doc-title { color: rgba(251,247,238,.7); }
.t-sectionCover .seal { background: var(--ivory); color: var(--seal); }
.t-sectionCover .body { display: grid; grid-template-rows: minmax(0,1fr) auto; align-items: center; min-height: 0; }
.t-sectionCover .cover-wrap { display: grid; grid-template-columns: 50% 1fr; gap: 12mm; align-items: center; padding: 4mm 0 10mm; }
.t-sectionCover .cover-title { font-family: var(--f-serif); font-weight: 600; font-size: 40pt; line-height: 1.15; letter-spacing: -.018em; color: var(--ivory); margin: 0; }
.t-sectionCover .cover-side { border-left: 0.6pt solid rgba(251,247,238,.3); padding-left: 9mm; display: flex; flex-direction: column; gap: 6mm; }
.t-sectionCover .cover-desc { font-size: 12pt; line-height: 1.7; color: rgba(251,247,238,.85); font-family: var(--f-serif); font-weight: 400; }
.t-sectionCover .cover-side .meta-grid { display: grid; grid-template-columns: auto 1fr; row-gap: 6px; column-gap: 14px; font-size: 9.5pt; letter-spacing: .04em; }
.t-sectionCover .cover-side .meta-grid .k { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-line); }
.t-sectionCover .cover-side .meta-grid .v { color: var(--ivory); }
.t-sectionCover .page-foot { border-top-color: rgba(251,247,238,.18); }
.t-sectionCover .disclaimer { color: rgba(251,247,238,.55); }
.t-sectionCover .disclaimer-label { color: var(--gold-line); }
.t-sectionCover .foot-brand-line { color: rgba(251,247,238,.55); }
.t-sectionCover .foot-brand-line .brand-em { color: var(--ivory); }
.t-sectionCover .foot-pg { color: rgba(251,247,238,.5); }
.t-sectionCover .foot-pg .num { color: var(--ivory); }

/* ══════════════════════════════════════════════════════════════
   p6 · Mission Statement
   ══════════════════════════════════════════════════════════════ */
.t-missionStatement .body { display: grid; grid-template-rows: auto auto minmax(0,1fr); gap: 7mm; min-height: 0; }
.t-missionStatement .mission-card { background: var(--dark); color: var(--ivory); padding: 9mm 14mm; display: grid; grid-template-columns: 60px 1fr; gap: 14mm; align-items: center; }
.t-missionStatement .mission-card .qmark { font-family: var(--f-serif); font-weight: 700; font-size: 70pt; line-height: .65; color: var(--gold-line); }
.t-missionStatement .mission-card p { font-family: var(--f-serif); font-weight: 400; font-size: 13pt; line-height: 1.65; letter-spacing: -.003em; margin: 0; }
.t-missionStatement .mission-card p .em { font-weight: 700; background: linear-gradient(transparent 60%, rgba(201,165,96,.35) 60%); }
.t-missionStatement .pillars { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
.t-missionStatement .pillar { border-top: 1.8pt solid var(--seal); padding: 12px 14px 14px 0; display: flex; flex-direction: column; gap: 6px; }
.t-missionStatement .pillar .k { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; color: var(--bronze); font-size: 10pt; }
.t-missionStatement .pillar h4 { font-family: var(--f-serif); font-weight: 700; font-size: 16pt; line-height: 1.25; margin: 0; color: var(--ink); }
.t-missionStatement .pillar p { font-size: 10.5pt; line-height: 1.55; color: var(--ink-2); margin: 0; }

/* ══════════════════════════════════════════════════════════════
   p7 · Risk Iceberg
   ══════════════════════════════════════════════════════════════ */
.t-riskIceberg .body { display: grid; grid-template-columns: 1.4fr 1fr; grid-template-rows: auto minmax(0,1fr); gap: 6mm 12mm; align-items: stretch; min-height: 0; }
.t-riskIceberg .ttl { grid-column: 1 / -1; }
.t-riskIceberg .iceberg { position: relative; background: transparent; border: 0.5pt solid var(--rule); overflow: hidden; display: flex; flex-direction: column; min-height: 0; margin-bottom: 4mm; }
.t-riskIceberg .aside { display: flex; flex-direction: column; gap: 6mm; border-left: 0.6pt solid var(--rule); padding-left: 9mm; min-height: 0; }
.t-riskIceberg .ice-half { padding: 5mm 11mm; display: flex; flex-direction: column; gap: 5px; position: relative; }
.t-riskIceberg .ice-half.visible { color: var(--ink); background: #F5DDB0; flex: 0 0 auto; }
.t-riskIceberg .ice-half.hidden { color: var(--ivory); background: linear-gradient(to bottom, #7A3014 0%, #4A1F0E 100%); flex: 1 1 auto; border-top: 0.5pt dashed rgba(255,255,255,.55); padding-top: 6mm; padding-bottom: 6mm; }
.t-riskIceberg .ice-half .tag-tier { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; font-size: 10pt; }
.t-riskIceberg .ice-half.visible .tag-tier { color: var(--bronze); }
.t-riskIceberg .ice-half.hidden  .tag-tier { color: var(--gold-line); }
.t-riskIceberg .ice-half h3 { font-family: var(--f-serif); font-weight: 700; font-size: 17pt; line-height: 1.2; margin: 0; }
.t-riskIceberg .ice-half ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.t-riskIceberg .ice-half li { font-size: 10.5pt; line-height: 1.35; position: relative; padding-left: 18px; }
.t-riskIceberg .ice-half li::before { content: ""; position: absolute; left: 0; top: .65em; width: 10px; height: 0.6pt; background: currentColor; opacity: .55; }
.t-riskIceberg .waterline-lbl { position: absolute; top: -5mm; right: 14px; font-family: var(--f-disp); font-style: italic; letter-spacing: .16em; font-size: 9pt; line-height: 1; color: var(--seal-deep); text-transform: uppercase; background: #F5DDB0; padding: 2px 8px; z-index: 3; }
.t-riskIceberg .aside h4 { font-family: var(--f-serif); font-weight: 700; font-size: 17pt; line-height: 1.2; margin: 0; color: var(--ink); }
.t-riskIceberg .aside p { margin: 0; font-size: 10.5pt; line-height: 1.6; color: var(--ink-2); }
.t-riskIceberg .aside .pairs { display: flex; flex-direction: column; gap: 6px; margin-top: 2mm; }
.t-riskIceberg .aside .pair { padding: 10px 14px; background: var(--paper); border-left: 2pt solid var(--seal); font-family: var(--f-serif); font-weight: 600; font-size: 12pt; color: var(--ink); }

/* ══════════════════════════════════════════════════════════════
   p8 · Company Puzzle Overview
   ══════════════════════════════════════════════════════════════ */
.t-companyPuzzleOverview .body { display: grid; grid-template-columns: 1.05fr 1fr; gap: 14mm; align-items: stretch; }
.t-companyPuzzleOverview .left { display: flex; flex-direction: column; gap: 8mm; justify-content: space-between; }
.t-companyPuzzleOverview .quote { font-family: var(--f-serif); font-weight: 400; font-size: 14pt; line-height: 1.6; color: var(--ink-2); padding: 6mm 0 0; border-top: 0.6pt solid var(--rule); position: relative; }
.t-companyPuzzleOverview .quote::before { content: "\201C"; font-family: var(--f-serif); font-size: 50pt; color: var(--bronze); line-height: .4; position: absolute; left: -2mm; top: 8mm; opacity: .5; }
.t-companyPuzzleOverview .quote .em { font-weight: 700; color: var(--ink); background: linear-gradient(transparent 60%, rgba(168,122,58,.22) 60%); }
.t-companyPuzzleOverview .grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; }
.t-companyPuzzleOverview .piece { background: var(--paper); border: 0.5pt solid var(--rule); padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
.t-companyPuzzleOverview .piece::before { content: ""; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: var(--piece-color, var(--seal)); }
.t-companyPuzzleOverview .piece .order { font-family: var(--f-disp); font-style: italic; font-size: 30pt; color: var(--piece-color, var(--seal)); line-height: 1; letter-spacing: .02em; }
.t-companyPuzzleOverview .piece .ep { font-family: var(--f-disp); font-style: italic; font-size: 11pt; letter-spacing: .12em; text-transform: uppercase; color: var(--bronze); }
.t-companyPuzzleOverview .piece .co { font-family: var(--f-serif); font-weight: 700; font-size: 17pt; letter-spacing: -.01em; color: var(--ink); }
.t-companyPuzzleOverview .piece .role { font-size: 10.5pt; color: var(--ink-2); line-height: 1.45; margin-top: auto; padding-top: 4px; border-top: 0.4pt solid var(--rule-2); }

/* ══════════════════════════════════════════════════════════════
   p9 · Company Matrix
   ══════════════════════════════════════════════════════════════ */
.t-companyMatrix .body { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 7mm; min-height: 0; }
.t-companyMatrix table { border-collapse: collapse; width: 100%; background: var(--paper); border: 0.6pt solid var(--dark); font-size: 10.2pt; }
.t-companyMatrix thead th { background: var(--dark); color: var(--ivory); font-family: var(--f-serif); font-weight: 500; font-size: 11pt; padding: 12px 14px; text-align: left; letter-spacing: .01em; border-right: 0.4pt solid rgba(251,247,238,.15); }
.t-companyMatrix thead th:last-child { border-right: 0; }
.t-companyMatrix tbody td { padding: 14px 14px; vertical-align: top; border-top: 0.4pt solid var(--rule); border-right: 0.4pt solid var(--rule-2); line-height: 1.5; color: var(--ink-2); }
.t-companyMatrix tbody td:last-child { border-right: 0; }
.t-companyMatrix tbody tr:nth-child(even) { background: rgba(243,235,215,.4); }
.t-companyMatrix tbody td.co-cell { background: var(--paper); border-left: 3pt solid var(--row-color, var(--seal)); position: relative; }
.t-companyMatrix tbody tr:nth-child(even) td.co-cell { background: rgba(243,235,215,.4); }
.t-companyMatrix .co-name { font-family: var(--f-serif); font-weight: 700; font-size: 13pt; color: var(--ink); margin-bottom: 4px; }
.t-companyMatrix .co-ep { font-family: var(--f-disp); font-style: italic; font-size: 10pt; letter-spacing: .12em; text-transform: uppercase; color: var(--bronze); }
.t-companyMatrix .rl-main { font-family: var(--f-serif); font-weight: 700; font-size: 12.5pt; color: var(--ink); margin-bottom: 3px; }
.t-companyMatrix .rl-sub { font-size: 9.6pt; color: var(--muted); }

/* ══════════════════════════════════════════════════════════════
   p10–13 · Company Detail
   ══════════════════════════════════════════════════════════════ */
.t-companyDetail .body { display: grid; grid-template-columns: 1.05fr 1fr; grid-template-rows: auto minmax(0,1fr); gap: 5mm 11mm; align-items: stretch; min-height: 0; }
.t-companyDetail .title-wrap { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr auto; gap: 12mm; align-items: center; padding-bottom: 2mm; border-bottom: 0.4pt solid var(--rule); }
.t-companyDetail .page-title-sm { font-size: 19pt; line-height: 1.22; }
.t-companyDetail .price-badge { --pc: var(--co-color, var(--seal)); border: 0.6pt solid var(--pc); padding: 8px 16px 10px; display: grid; grid-template-columns: auto auto; align-items: end; gap: 2px 12px; background: var(--paper); min-width: 200px; }
.t-companyDetail .price-badge .lbl { font-family: var(--f-disp); font-style: italic; letter-spacing: .16em; font-size: 9.5pt; text-transform: uppercase; color: var(--pc); grid-column: 1 / -1; }
.t-companyDetail .price-badge .amt { font-family: var(--f-serif); font-weight: 700; font-size: 24pt; line-height: 1; color: var(--ink); letter-spacing: -.02em; }
.t-companyDetail .price-badge .unit { font-size: 12pt; color: var(--ink); padding-bottom: 5px; font-family: var(--f-serif); font-weight: 500; }
.t-companyDetail .price-badge .note { grid-column: 1 / -1; font-size: 8.5pt; color: var(--muted); margin-top: 2px; }
.t-companyDetail .visual { background: var(--paper); border: 0.5pt solid var(--rule); padding: 6mm 8mm; display: flex; flex-direction: column; gap: 5mm; position: relative; overflow: hidden; min-height: 0; }
.t-companyDetail .visual .vlbl { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; font-size: 10pt; color: var(--co-color, var(--bronze)); }
.t-companyDetail .strategy { display: flex; flex-direction: column; gap: 4mm; padding-left: 0; min-height: 0; }
.t-companyDetail .strategy .s-heading { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; color: var(--bronze); font-size: 11pt; }
.t-companyDetail .strategy .s-item { display: grid; grid-template-columns: 22px 1fr; gap: 10px; align-items: baseline; padding-bottom: 3mm; border-bottom: 0.4pt dotted var(--rule); }
.t-companyDetail .strategy .s-item:last-of-type { border-bottom: 0; padding-bottom: 0; }
.t-companyDetail .strategy .s-item .nx { font-family: var(--f-disp); font-style: italic; font-size: 20pt; color: var(--co-color, var(--seal)); line-height: 1; }
.t-companyDetail .strategy .s-item h4 { font-family: var(--f-serif); font-weight: 700; font-size: 12.5pt; margin: 0 0 4px 0; color: var(--ink); line-height: 1.25; }
.t-companyDetail .strategy .s-item p { margin: 0; font-size: 10pt; line-height: 1.5; color: var(--ink-2); }
.t-companyDetail .strategy .s-quote { margin-top: auto; font-family: var(--f-serif); font-style: italic; font-size: 11pt; line-height: 1.45; color: var(--ink); padding: 8px 12px; background: rgba(168,122,58,.08); border-left: 2pt solid var(--co-color, var(--seal)); }
.t-companyDetail .visual .vlist { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
.t-companyDetail .visual .vlist li { font-size: 9.5pt; color: var(--ink-2); line-height: 1.4; padding: 5px 0 5px 14px; position: relative; border-bottom: 0.4pt dotted var(--rule-2); }
.t-companyDetail .visual .vlist li::before { content: ""; position: absolute; left: 0; top: 12px; width: 6px; height: 6px; background: var(--co-color, var(--seal)); border-radius: 50%; }

/* Visual variants */
.viz-activation { display: grid; grid-template-rows: auto auto auto; gap: 3mm; min-height: 0; }
.viz-activation > div:nth-child(2) { min-height: 0; }
.viz-activation svg { width: 100%; height: auto; min-height: 70px; max-height: 110px; display: block; }
.viz-gateway { display: grid; grid-template-rows: auto 1fr auto auto; gap: 3mm; min-height: 0; }
.viz-gateway .gate-wrap { display: grid; place-items: center; min-height: 0; }
.viz-gateway svg { width: 100%; max-width: 60mm; max-height: 42mm; height: auto; }
.viz-gateway .gw-cap { font-family: var(--f-serif); font-weight: 700; font-size: 11pt; text-align: center; color: var(--ink); }
.viz-gateway .gw-sub { text-align: center; font-size: 9.5pt; color: var(--muted); }
.viz-cycle { display: grid; grid-template-rows: auto 1fr auto; gap: 3mm; min-height: 0; }
.viz-cycle .cyc-wrap { display: grid; place-items: center; min-height: 0; }
.viz-cycle svg { width: 100%; max-width: 62mm; max-height: 45mm; height: auto; }
.viz-family { display: grid; grid-template-rows: auto 1fr auto; gap: 3mm; min-height: 0; padding-bottom: 1mm; }
.viz-family .fam-wrap { display: grid; place-items: center; min-height: 0; }
.viz-family svg { width: 100%; max-width: 60mm; max-height: 42mm; height: auto; }

/* ══════════════════════════════════════════════════════════════
   p14 · Care Journey
   ══════════════════════════════════════════════════════════════ */
.t-careJourney .body { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 6mm; min-height: 0; }
.t-careJourney .journey-tag { display: inline-flex; align-items: center; gap: 10px; padding: 4px 12px; border: 0.5pt solid var(--bronze); color: var(--bronze); font-family: var(--f-disp); font-style: italic; font-size: 11pt; letter-spacing: .14em; text-transform: uppercase; align-self: start; justify-self: start; }
.t-careJourney .stages { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; position: relative; padding-top: 24px; }
.t-careJourney .stages::before { content: ""; position: absolute; top: 22px; left: calc(12.5% - 4px); right: calc(12.5% - 4px); height: 0.6pt; background: var(--rule); }
.t-careJourney .stg { background: var(--paper); border: 0.5pt solid var(--rule); border-top: 3pt solid var(--co-color, var(--seal)); padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 10px; position: relative; }
.t-careJourney .stg .dot { position: absolute; top: -34px; left: 50%; transform: translateX(-50%); width: 16px; height: 16px; background: var(--co-color, var(--seal)); border-radius: 50%; border: 3px solid var(--ivory); box-shadow: 0 0 0 0.5pt var(--rule); }
.t-careJourney .stg .shield-lbl { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.4pt solid var(--rule-2); padding-bottom: 6px; }
.t-careJourney .stg .stg-num { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; font-size: 9.5pt; color: var(--co-color, var(--seal)); text-transform: uppercase; }
.t-careJourney .stg .stg-shield { font-family: var(--f-serif); font-weight: 500; font-size: 10pt; color: var(--muted); }
.t-careJourney .stg h3 { font-family: var(--f-serif); font-weight: 700; font-size: 15pt; line-height: 1.2; margin: 0; color: var(--ink); }
.t-careJourney .stg .co { font-family: var(--f-serif); font-weight: 700; font-size: 11.5pt; color: var(--co-color, var(--seal)); }
.t-careJourney .stg p { font-size: 10pt; line-height: 1.55; color: var(--ink-2); margin: 0; }
.t-careJourney .stg p .em { font-weight: 700; color: var(--ink); }

/* ══════════════════════════════════════════════════════════════
   p15 · Closing Balance
   ══════════════════════════════════════════════════════════════ */
.t-closingBalance .body { display: grid; grid-template-rows: auto minmax(0,1fr); gap: 6mm; min-height: 0; }
.t-closingBalance .scale { display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; align-items: stretch; border: 0.5pt solid var(--rule); background: var(--paper); }
.t-closingBalance .pan { padding: 9mm 10mm; display: flex; flex-direction: column; gap: 6mm; }
.t-closingBalance .pan .lbl { font-family: var(--f-disp); font-style: italic; letter-spacing: .18em; text-transform: uppercase; font-size: 11pt; }
.t-closingBalance .pan.l .lbl { color: var(--ok); }
.t-closingBalance .pan.r .lbl { color: var(--seal); }
.t-closingBalance .pan .pt { font-family: var(--f-serif); font-weight: 600; font-size: 15pt; line-height: 1.3; color: var(--ink); margin: 0; }
.t-closingBalance .pan.l .amt { font-family: var(--f-serif); font-weight: 700; font-size: 38pt; color: var(--ink); line-height: 1; letter-spacing: -.02em; }
.t-closingBalance .pan.l .unit { font-size: 16pt; padding-left: 4px; color: var(--ink-2); }
.t-closingBalance .pan.l .amt-text { font-size: 10.5pt; color: var(--muted); margin-top: 4mm; }
.t-closingBalance .pan.r ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.t-closingBalance .pan.r li { font-family: var(--f-serif); font-weight: 500; font-size: 14pt; color: var(--ink); padding-left: 26px; position: relative; line-height: 1.35; }
.t-closingBalance .pan.r li::before { content: "✕"; position: absolute; left: 0; top: 1px; color: var(--seal); font-weight: 700; font-family: var(--f-sans); font-size: 13pt; }
.t-closingBalance .pivot { width: 70px; background: var(--dark); color: var(--ivory); display: grid; place-items: center; font-family: var(--f-serif); font-weight: 700; font-size: 22pt; }
.t-closingBalance .closer { display: grid; grid-template-columns: 1fr auto; gap: 14mm; align-items: end; padding-top: 5mm; border-top: 0.5pt solid var(--rule); }
.t-closingBalance .closer .ct {
  font-family: var(--f-serif);
  font-size: 13pt;
  line-height: 1.45;
  color: var(--ink-2);
  display: flex;
  flex-direction: column;
  gap: 0;
}
.t-closingBalance .closer .ct .lead {
  font-style: italic;
  color: var(--muted);
  font-size: 11.5pt;
  line-height: 1.45;
}
.t-closingBalance .closer .ct .main {
  font-weight: 700;
  color: var(--ink);
  font-size: 13pt;
  line-height: 1.45;
}
.t-closingBalance .closer .ct .closing {
  font-style: italic;
  font-size: 12pt;
  line-height: 1.45;
}
.t-closingBalance .closer .sig { text-align: right; display: flex; flex-direction: column; gap: 4px; }
.t-closingBalance .closer .sig .seal-mini { width: 56px; height: 56px; margin-left: auto; background: var(--seal); color: var(--ivory); display: grid; place-items: center; font-family: var(--f-serif); font-weight: 700; font-size: 32pt; border-radius: 3px; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.25); }
.t-closingBalance .closer .sig .sg-txt { font-family: var(--f-disp); font-style: italic; letter-spacing: .14em; text-transform: uppercase; font-size: 10pt; color: var(--bronze); }
</style>
