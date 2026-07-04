/**
 * Insurance Proposal Renderer · v2 spec
 * ─────────────────────────────────────
 * Adapted from the bundled HTML renderer.
 * Usage:  renderProposal(data, viewportEl)
 *
 * `data`       ← blueprint_pages_v2.json (parsed object)
 * `viewportEl` ← DOM element to render into
 */

// ─── Company accent colours ──────────────────────────────────────────────────
export const COMPANY_COLORS = {
  '흥국화재':  '#2A3E66',
  '라이나생명': '#5C2A66',
  'KB손해보험': '#6E5A1B',
  '한화생명':  '#2C5E54',
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────
function h(tag, attrs, children) {
  const el = document.createElement(tag)
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue
      if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk, sv)
      } else if (k === 'class') {
        el.className = v
      } else if (k === 'html') {
        el.innerHTML = v
      } else {
        el.setAttribute(k, v)
      }
    }
  }
  if (children != null) appendKids(el, children)
  return el
}

function appendKids(el, kids) {
  if (Array.isArray(kids)) kids.forEach(k => appendKids(el, k))
  else if (kids instanceof Node) el.appendChild(kids)
  else if (kids != null && kids !== false) el.appendChild(document.createTextNode(String(kids)))
}

function nl2br(text) {
  if (text == null) return []
  const parts = String(text).split('\n')
  const out = []
  parts.forEach((p, i) => {
    if (i > 0) out.push(document.createElement('br'))
    out.push(document.createTextNode(p))
  })
  return out
}

function emphasize(text, emphasis) {
  if (!text) return []
  if (!emphasis) return nl2br(text)
  const idx = String(text).indexOf(emphasis)
  if (idx < 0) return nl2br(text)
  return [
    ...nl2br(text.slice(0, idx)),
    h('em', { class: 'em' }, emphasis),
    ...nl2br(text.slice(idx + emphasis.length)),
  ]
}

function emphasizeMany(text, emphases) {
  if (!emphases || !emphases.length) return nl2br(text)
  const escaped = emphases.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp('(' + escaped.join('|') + ')', 'g')
  const parts = String(text).split(re)
  const out = []
  parts.forEach(p => {
    if (emphases.includes(p)) out.push(h('em', { class: 'em' }, p))
    else out.push(...nl2br(p))
  })
  return out
}

const fmt = n => (typeof n === 'number' ? n.toLocaleString('ko-KR') : String(n))

// ─── Shared chrome (header / footer) ─────────────────────────────────────────
// pageNum, total 은 renderProposal이 계산한 실제 값 (JSON 하드코딩 무시)
function renderHead(page, data, pageNum, total) {
  const eyebrow = page.eyebrow || {}
  return h('header', { class: 'page-head' }, [
    h('div', { class: 'eyebrow' }, [
      eyebrow.seal ? h('div', { class: 'seal' }, eyebrow.seal) : null,
      h('div', { class: 'eyebrow-text' }, [
        h('div', { class: 'eyebrow-label' }, 'Chapter ' + String(pageNum).padStart(2, '0')),
        h('div', { class: 'eyebrow-sub' }, eyebrow.subtitle || ''),
      ]),
    ]),
    h('div', { class: 'head-meta' }, [
      h('div', { class: 'doc-section' }, 'Integrated Protection'),
      h('div', { class: 'doc-title' }, data.title),
    ]),
  ])
}

function renderFoot(page, data, pageNum, total) {
  const brand = page.footer && page.footer.brand
  const brandEl = brand
    ? h('span', { class: 'foot-brand' }, [
        brand.text || '',
        brand.emphasis ? h('span', { class: 'brand-em' }, brand.emphasis) : null,
      ])
    : null
  return h('footer', { class: 'page-foot' }, [
    h('div', { class: 'foot-left' }, [
      h('div', { class: 'disclaimer' }, [
        h('span', { class: 'disclaimer-label' }, 'Disclaimer'),
        ' ' + (data.disclaimer && data.disclaimer.text || ''),
      ]),
      brandEl ? h('div', { class: 'foot-brand-line' }, brandEl) : null,
    ]),
    h('div', { class: 'foot-pg' }, [
      h('span', { class: 'num' }, String(pageNum).padStart(2, '0')),
      h('span', null, '/'),
      h('span', { class: 'total' }, String(total).padStart(2, '0')),
    ]),
  ])
}

function pageTitle(title, cls) {
  if (!title) return null
  cls = cls || 'page-title'
  if (title.text) return h('h1', { class: cls }, emphasize(title.text, title.emphasis))
  if (title.lines) return h('h1', { class: cls }, title.lines.map(l => h('div', null, l)))
  return null
}

// ─── Page renderers ───────────────────────────────────────────────────────────
const RENDERERS = {

  // 1. Opening Essay
  openingEssay(page) {
    const t = page.title
    const lines = (t.text || '').split('\n')
    const lastIdx = lines.length - 1
    const titleEl = h('h1', { class: 'big-title' },
      lines.map((line, i) => h('div', { class: i === lastIdx ? 'line-em' : 'line-' + (i + 1) }, line))
    )
    return h('div', { class: 'body' }, [
      h('div', { class: 'ttl-block' }, [
        titleEl,
        h('div', { class: 'quote-row' },
          page.quotes.map(q => h('div', { class: 'quote-card' }, h('div', { class: 'qt' }, q)))
        ),
      ]),
      h('div', { class: 'essay' }, [
        ...page.essay.map(p => h('p', null, nl2br(p))),
        h('div', { class: 'closer' }, page.closer),
      ]),
    ])
  },

  // 2. Empathy Cards
  empathyCards(page) {
    const callout = page.callout || {}
    const calloutStyle = callout.bgColor ? { background: callout.bgColor } : null
    return h('div', { class: 'body' }, [
      pageTitle(page.title, 'page-title'),
      h('div', { class: 'cards' },
        page.cards.map(c => h('div', { class: 'card' }, [
          h('div', { class: 'num-marker' }, c.num),
          h('h4', null, nl2br(c.heading)),
          h('p', null, nl2br(c.body)),
        ]))
      ),
      h('div', { class: 'callout', style: calloutStyle }, [
        h('div', { class: 'ct' }, nl2br(callout.text || '')),
      ]),
    ])
  },

  // 3. Existing Analysis
  existingAnalysis(page) {
    const body = page.body || {}
    const s = body.summary || {}
    const verdict = (s.verdict && typeof s.verdict === 'object') ? s.verdict : { text: s.verdict }
    return h('div', { class: 'body' }, [
      h('div', null, [
        pageTitle(page.title, 'page-title'),
        page.description ? h('p', { class: 'desc' }, nl2br(page.description)) : null,
      ]),
      h('div', { class: 'summary-box' }, [
        h('div', { class: 'lbl' }, [
          h('div', { class: 'k' }, 'Diagnosis'),
          h('div', { class: 'v' }, s.label || ''),
        ]),
        h('div', { class: 'heading' }, [
          ...nl2br(s.heading || ''),
          s.body ? h('span', { class: 'b' }, nl2br(s.body)) : null,
        ]),
        h('div', { class: 'verdict' }, emphasize(verdict.text || '', verdict.emphasis)),
      ]),
      h('div', { class: 'findings' },
        (body.findings || []).map(f => h('div', { class: 'find' }, [
          h('div', { class: 'num-marker' }, f.num),
          h('h5', null, nl2br(f.heading)),
          h('p', null, nl2br(f.body)),
        ]))
      ),
    ])
  },

  // 4. Issue List
  issueList(page) {
    const body = page.body || {}
    const issues = body.issues || page.issues || []
    return h('div', { class: 'body' }, [
      h('div', null, [
        pageTitle(page.title, 'page-title'),
        page.description ? h('p', { class: 'desc' }, nl2br(page.description)) : null,
      ]),
      h('div', { class: 'grid' },
        issues.map(it => h('div', { class: 'issue' }, [
          h('div', { class: 'nm' }, it.num),
          h('div', null, [
            h('h4', null, nl2br(it.heading)),
            h('p', null, nl2br(it.body)),
          ]),
          it.tags ? h('div', { class: 'tag-row' },
            it.tags.map(tg => h('span', { class: 'tag' }, tg))
          ) : null,
        ]))
      ),
    ])
  },

  // 5. Section Cover
  sectionCover(page, data) {
    const cover = (page.body && page.body.cover) || page.cover || {}
    return h('div', { class: 'body' }, [
      h('div', { class: 'cover-wrap' }, [
        h('h1', { class: 'cover-title' }, nl2br(cover.title)),
        h('div', { class: 'cover-side' }, [
          h('p', { class: 'cover-desc' }, nl2br(cover.description)),
          h('div', { class: 'meta-grid' }, [
            h('div', { class: 'k' }, 'Customer'),
            h('div', { class: 'v' }, `${data.customer.name} (${data.customer.age}, ${data.customer.gender})`),
            h('div', { class: 'k' }, 'Contractor'),
            h('div', { class: 'v' }, data.customer.contractor),
            h('div', { class: 'k' }, 'Carriers'),
            h('div', { class: 'v' }, getCompaniesInOrder(data).join(' · ')),
          ]),
        ]),
      ]),
    ])
  },

  // 6. Mission Statement
  missionStatement(page) {
    const body = page.body || {}
    const m = body.missionCard || {}
    return h('div', { class: 'body' }, [
      pageTitle(page.title, 'page-title'),
      h('div', { class: 'mission-card' }, [
        h('div', { class: 'qmark' }, '"'),
        h('p', null, emphasizeMany(m.text || '', m.emphases || [])),
      ]),
      h('div', { class: 'pillars' },
        (body.pillars || []).map((p, i) => h('div', { class: 'pillar' }, [
          h('div', { class: 'k' }, 'Pillar ' + String(i + 1).padStart(2, '0')),
          h('h4', null, nl2br(p.heading)),
          h('p', null, nl2br(p.body)),
        ]))
      ),
    ])
  },

  // 7. Risk Iceberg
  riskIceberg(page) {
    const body = page.body || {}
    const ice = body.iceberg || {}
    const v = ice.visible || {}
    const hi = ice.hidden || {}
    const aside = body.aside || {}
    return h('div', { class: 'body' }, [
      h('div', { class: 'ttl' }, pageTitle(page.title, 'page-title')),
      h('div', { class: 'iceberg' }, [
        h('div', { class: 'ice-half visible' }, [
          h('div', { class: 'tag-tier' }, 'Above the surface'),
          h('h3', null, v.title),
          h('ul', null, (v.items || []).map(it => h('li', null, it))),
        ]),
        h('div', { class: 'ice-half hidden' }, [
          h('div', { class: 'waterline-lbl' }, 'Sea Level'),
          h('div', { class: 'tag-tier' }, 'Below the surface'),
          h('h3', null, hi.title),
          h('ul', null, (hi.items || []).map(it => h('li', null, it))),
        ]),
      ]),
      h('div', { class: 'aside' }, [
        h('h4', null, aside.heading),
        h('p', null, nl2br(aside.body)),
        h('div', { class: 'pairs' },
          (aside.pairs || []).map(p => h('div', { class: 'pair' }, p))
        ),
      ]),
    ])
  },

  // 8. Company Puzzle Overview
  companyPuzzleOverview(page) {
    const body = page.body || {}
    const quote = body.quote || {}
    const pieces = [...(body.pieces || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
    return h('div', { class: 'body' }, [
      h('div', { class: 'left' }, [
        pageTitle(page.title, 'page-title'),
        h('p', { class: 'quote' }, emphasizeMany(quote.text || '', quote.emphases || [])),
      ]),
      h('div', { class: 'grid-2x2' },
        pieces.map(pc => h('div', {
          class: 'piece',
          style: { '--piece-color': COMPANY_COLORS[pc.company] || '#444' },
        }, [
          h('div', { class: 'order' }, String(pc.order).padStart(2, '0')),
          h('div', { class: 'ep' }, pc.epithet),
          h('div', { class: 'co' }, pc.company),
          h('div', { class: 'role' }, pc.role),
        ]))
      ),
    ])
  },

  // 9. Company Matrix
  companyMatrix(page) {
    const body = page.body || {}
    const t = body.table || {}
    return h('div', { class: 'body' }, [
      pageTitle(page.title, 'page-title'),
      h('table', null, [
        h('thead', null,
          h('tr', null, (t.columns || []).map(c => h('th', null, c)))
        ),
        h('tbody', null, (t.rows || []).map(r => {
          const color = COMPANY_COLORS[r.company] || '#444'
          return h('tr', { style: { '--row-color': color } }, [
            h('td', { class: 'co-cell' }, [
              h('div', { class: 'co-name' }, r.company),
              h('div', { class: 'co-ep' }, r.epithet),
            ]),
            h('td', null, [
              h('div', { class: 'rl-main' }, r.role.main),
              h('div', { class: 'rl-sub' }, r.role.sub),
            ]),
            h('td', null, nl2br(r.coverage)),
            h('td', null, r.benefit),
          ])
        })),
      ]),
    ])
  },

  // 10–13. Company Detail
  companyDetail(page) {
    let coName = null
    const tText = (page.title && page.title.text) || ''
    for (const name of Object.keys(COMPANY_COLORS)) {
      if (tText.indexOf(name) >= 0) { coName = name; break }
    }
    const co = (coName && COMPANY_COLORS[coName]) || '#444'
    const prem = page.premium
    const strat = page.strategy
    return h('div', { class: 'body', style: { '--co-color': co } }, [
      h('div', { class: 'title-wrap' }, [
        pageTitle(page.title, 'page-title'),
        prem ? h('div', { class: 'price-badge' }, [
          h('div', { class: 'lbl' }, 'MONTHLY'),
          h('div', { class: 'amt' }, prem.display ? prem.display.replace(/원/g, '') : fmt(prem.monthly)),
          h('div', { class: 'unit' }, '원'),
        ]) : null,
      ]),
      renderVisual(page.visual, co),
      renderStrategy(strat),
    ])
  },

  // 14. Care Journey
  careJourney(page) {
    const body = page.body || {}
    const journey = body.journey || []
    const shieldLabels = ['방패 발동', '방패 전환', '방패 지속', '방패 완성']
    return h('div', { class: 'body' }, [
      h('div', null, [
        h('div', { class: 'journey-tag' }, body.journeyTag || 'Care Journey'),
        h('div', { style: { 'margin-top': '4mm' } }, pageTitle(page.title, 'page-title')),
      ]),
      h('div', { class: 'stages' },
        journey.map((st, i) => {
          const co = COMPANY_COLORS[st.company] || '#444'
          const sNum = `STAGE ${st.stage || (i + 1)}`
          const sLbl = shieldLabels[(st.stage || (i + 1)) - 1] || ''
          return h('div', { class: 'stg', style: { '--co-color': co } }, [
            h('div', { class: 'dot' }),
            h('div', { class: 'shield-lbl' }, [
              h('div', { class: 'stg-num' }, sNum),
              h('div', { class: 'stg-shield' }, sLbl),
            ]),
            h('h3', null, nl2br(st.heading)),
            h('div', { class: 'co' }, st.company),
            h('p', null, emphasize(st.action, st.emphasis)),
          ])
        })
      ),
    ])
  },

  // 15. Closing Balance
  // body CSS: grid-template-rows: auto(title) 1fr(scale) implicit-auto(closer)
  // title(auto row1) → scale(1fr row2) → closer(implicit auto row3, content height)
  closingBalance(page) {
    const body = page.body || {}
    const bal = body.balance || {}
    const L = bal.left || {}, R = bal.right || {}
    const cs = body.closingStatement || {}
    return h('div', { class: 'body' }, [
      pageTitle(page.title, 'page-title-sm'),
      h('div', { class: 'scale' }, [
        h('div', { class: 'pan l' }, [
          h('div', { class: 'lbl' }, L.label),
          h('p', { class: 'pt' }, nl2br(L.title)),
          L.detail ? h('div', null, [
            h('span', { class: 'amt' }, fmt(L.detail.amount)),
            h('span', { class: 'unit' }, L.detail.unit),
            h('div', { class: 'amt-text' }, nl2br(L.detail.text || '')),
          ]) : null,
        ]),
        h('div', { class: 'pivot' }, 'vs'),
        h('div', { class: 'pan r' }, [
          h('div', { class: 'lbl' }, R.label),
          h('p', { class: 'pt' }, nl2br(R.title)),
          R.detail ? h('ul', null, (R.detail.items || []).map(it => h('li', null, it))) : null,
        ]),
      ]),
      h('div', { class: 'closer' }, [
        h('div', { class: 'ct', style: { display: 'flex', 'flex-direction': 'column', gap: '0', 'line-height': '1.4', 'font-size': '13pt' } }, [
          h('span', { class: 'lead', style: { 'font-size': '11pt', 'line-height': '1.4', 'margin': '0', 'padding': '0' } }, cs.lead),
          h('span', { class: 'main', style: { 'font-size': '13pt', 'line-height': '1.4', 'margin': '0', 'padding': '0' } }, cs.main),
          h('div', { class: 'closing', style: { 'font-size': '12pt', 'line-height': '1.4', 'margin': '0', 'padding': '0' } }, cs.closing),
        ]),
        h('div', { class: 'sig' }, [
          h('div', { class: 'seal-mini' }, '印'),
          h('div', { class: 'sg-txt' }, cs.signature),
        ]),
      ]),
    ])
  },
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────
function renderStrategy(s) {
  if (!s) return h('div')
  return h('div', { class: 'strategy' }, [
    h('div', { class: 's-heading' }, s.heading),
    ...s.items.map((it, i) => h('div', { class: 's-item' }, [
      h('div', { class: 'nx' }, String(i + 1).padStart(2, '0')),
      h('div', null, [
        h('h4', null, nl2br(it.key)),
        h('p', null, nl2br(it.desc)),
      ]),
    ])),
    s.quote ? h('div', { class: 's-quote' }, nl2br(s.quote)) : null,
  ])
}

function renderVisual(v, co) {
  if (!v) return h('div', { class: 'visual' })
  if (v.type === 'barChart') {
    return h('div', { class: 'visual viz-activation' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { html: barChartSVG(v.bars || [], co) }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  if (v.type === 'hospital') {
    return h('div', { class: 'visual viz-gateway' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'gate-wrap', html: hospitalGatewaySVG(co) }),
      v.coverageList
        ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l)))
        : h('div', { class: 'gw-cap' }, '상급종합병원 · 대학병원 · 대형병원'),
    ])
  }
  if (v.type === 'care') {
    return h('div', { class: 'visual viz-cycle' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'cyc-wrap', html: continuousCycleSVG(co) }),
      v.coverageList
        ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l)))
        : h('div', { class: 'gw-cap' }, '끊기지 않는 보장의 순환'),
    ])
  }
  if (v.type === 'family') {
    return h('div', { class: 'visual viz-family' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'fam-wrap', html: familyProtectionSVG(co) }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  if (v.type === 'income') {
    return h('div', { class: 'visual viz-income' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'income-wrap', html: incomeReplacementSVG() }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  if (v.type === 'legacy') {
    return h('div', { class: 'visual viz-legacy' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'legacy-wrap', html: legacyProtectionSVG() }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  if (v.type === 'dementia') {
    return h('div', { class: 'visual viz-dementia' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'dementia-wrap', html: dementiaCareSSVG() }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  if (v.type === 'child') {
    return h('div', { class: 'visual viz-child' }, [
      h('div', { class: 'vlbl' }, v.label),
      h('div', { class: 'child-wrap', html: childGrowthSVG() }),
      v.coverageList ? h('ul', { class: 'vlist' }, v.coverageList.map(l => h('li', null, l))) : null,
    ])
  }
  return h('div', { class: 'visual' }, h('div', { class: 'vlbl' }, v.label || ''))
}

// ─── SVG visuals ──────────────────────────────────────────────────────────────
function barChartSVG(bars, co) {
  if (!bars.length) return ''
  const sorted = [...bars].sort((a, b) => (b.value || 0) - (a.value || 0))
  const maxVal = Math.max(...sorted.map(b => b.maxValue || b.value || 1))
  const barAreaX = 72, barAreaW = 168, rowH = 26, top = 14
  let rows = ''
  sorted.forEach((b, i) => {
    const y = top + i * rowH
    const w = ((b.value || 0) / maxVal) * barAreaW
    rows += `
      <text x="${barAreaX - 8}" y="${y + 12}" text-anchor="end" font-family="sans-serif" font-weight="500" font-size="10" fill="#221912">${b.label}</text>
      <rect x="${barAreaX}" y="${y + 4}" width="${barAreaW}" height="12" fill="${co}" fill-opacity=".08"/>
      <rect x="${barAreaX}" y="${y + 4}" width="${w}" height="12" fill="${co}"/>
      <text x="${barAreaX + w + 6}" y="${y + 13}" font-family="sans-serif" font-weight="600" font-size="9.5" fill="#221912">${b.amount}</text>`
  })
  return `
    <svg viewBox="0 0 320 ${top + sorted.length * rowH + 8}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
      <line x1="${barAreaX}" y1="${top}" x2="${barAreaX}" y2="${top + sorted.length * rowH}" stroke="#D9C5A0" stroke-width=".6"/>
      ${rows}
    </svg>`
}

function hospitalGatewaySVG(co) {
  return `
    <svg viewBox="0 0 240 165" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="82" r="72" fill="${co}" opacity=".04"/>
      <rect x="52" y="66" width="136" height="84" rx="2" fill="${co}" opacity=".07" stroke="${co}" stroke-width="1.3"/>
      <rect x="68" y="46" width="104" height="24" rx="1" fill="${co}" opacity=".1" stroke="${co}" stroke-width="1"/>
      <line x1="52" y1="66" x2="188" y2="66" stroke="${co}" stroke-width="1.2" opacity=".4"/>
      <rect x="116" y="14" width="8" height="28" rx="2" fill="${co}" opacity=".9"/>
      <rect x="108" y="20" width="24" height="8" rx="2" fill="${co}" opacity=".9"/>
      <rect x="68" y="74" width="20" height="18" rx="1.5" fill="${co}" opacity=".18" stroke="${co}" stroke-width=".7"/>
      <rect x="110" y="74" width="20" height="18" rx="1.5" fill="${co}" opacity=".18" stroke="${co}" stroke-width=".7"/>
      <rect x="152" y="74" width="20" height="18" rx="1.5" fill="${co}" opacity=".18" stroke="${co}" stroke-width=".7"/>
      <rect x="68" y="100" width="20" height="18" rx="1.5" fill="${co}" opacity=".13" stroke="${co}" stroke-width=".7"/>
      <rect x="152" y="100" width="20" height="18" rx="1.5" fill="${co}" opacity=".13" stroke="${co}" stroke-width=".7"/>
      <rect x="103" y="112" width="34" height="38" rx="2" fill="${co}" opacity=".22" stroke="${co}" stroke-width=".9"/>
      <line x1="120" y1="112" x2="120" y2="150" stroke="${co}" stroke-width=".5" opacity=".4"/>
      <circle cx="131" cy="133" r="2.5" fill="${co}" opacity=".5"/>
      <line x1="28" y1="150" x2="212" y2="150" stroke="#D9C5A0" stroke-width=".9"/>
      <text x="120" y="163" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="9" fill="#221912">TOP-TIER ACCESS</text>
    </svg>`
}

function continuousCycleSVG(co) {
  const cx = 110, cy = 90, r = 56
  const stages = [{ angle: -90 }, { angle: 0 }, { angle: 90 }, { angle: 180 }]
  let arcs = ''
  for (let i = 0; i < 4; i++) {
    const a1 = ((stages[i].angle + 20) * Math.PI) / 180
    const a2 = ((stages[(i + 1) % 4].angle - 20) * Math.PI) / 180
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r
    const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r
    arcs += `<path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}" fill="none" stroke="${co}" stroke-width="1.8" opacity=".42"/>`
  }
  let circles = ''
  stages.forEach(s => {
    const rad = (s.angle * Math.PI) / 180
    const x = cx + Math.cos(rad) * r, y = cy + Math.sin(rad) * r
    circles += `<circle cx="${x}" cy="${y}" r="15" fill="${co}" opacity=".85"/>`
  })
  return `
    <svg viewBox="0 0 220 185" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r + 15}" fill="${co}" opacity=".03"/>
      ${arcs}${circles}
      <circle cx="${cx}" cy="${cy}" r="20" fill="${co}" opacity=".1" stroke="${co}" stroke-width=".8"/>
    </svg>`
}

function familyProtectionSVG(co) {
  return `
    <svg viewBox="0 0 240 170" xmlns="http://www.w3.org/2000/svg">
      <path d="M 120 12 L 44 46 L 44 106 C 44 140 120 160 120 160 C 120 160 196 140 196 106 L 196 46 Z" fill="${co}" opacity=".1" stroke="${co}" stroke-width="1.6"/>
      <path d="M 120 24 L 58 54 L 58 105 C 58 130 120 148 120 148 C 120 148 182 130 182 105 L 182 54 Z" fill="${co}" opacity=".06"/>
      <path d="M 120 56 C 116 49 107 49 107 57 C 107 65 120 76 120 76 C 120 76 133 65 133 57 C 133 49 124 49 120 56 Z" fill="${co}" opacity=".55"/>
      <line x1="64" y1="128" x2="176" y2="128" stroke="${co}" stroke-width=".7" opacity=".3"/>
      <circle cx="90" cy="95" r="9" fill="${co}" opacity=".78"/>
      <path d="M 75 128 Q 75 108 90 108 Q 105 108 105 128 Z" fill="${co}" opacity=".78"/>
      <circle cx="120" cy="91" r="10" fill="${co}" opacity=".92"/>
      <path d="M 104 128 Q 104 105 120 105 Q 136 105 136 128 Z" fill="${co}" opacity=".92"/>
      <circle cx="150" cy="98" r="8" fill="${co}" opacity=".7"/>
      <path d="M 137 128 Q 137 112 150 112 Q 163 112 163 128 Z" fill="${co}" opacity=".7"/>
      <text x="120" y="166" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="9" fill="#221912">FAMILY PROTECTION</text>
    </svg>`
}

function incomeReplacementSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 360">
  <g transform="translate(256 190)">
    <circle cx="0" cy="0" r="128" fill="#c46d48" opacity="0.08"/>
    <path d="M-98 104 H98" stroke="#c46d48" stroke-width="3" stroke-linecap="round" opacity="0.58"/>
    <path d="M-80 -22 A92 92 0 0 1 64 -76" fill="none" stroke="#c46d48" stroke-width="10" stroke-linecap="round" opacity="0.42"/>
    <path d="M72 -64 L98 -53 L75 -36 Z" fill="#c46d48" opacity="0.42"/>
    <path d="M80 21 A92 92 0 0 1 -64 75" fill="none" stroke="#c46d48" stroke-width="10" stroke-linecap="round" opacity="0.42"/>
    <path d="M-72 64 L-98 53 L-75 36 Z" fill="#c46d48" opacity="0.42"/>
    <circle cx="-10" cy="-32" r="31" fill="#c46d48" opacity="0.86"/>
    <path d="M-58 104 V52 C-58 18 -35 -2 -10 -2 C15 -2 38 18 38 52 V104 Z" fill="#c46d48" opacity="0.86"/>
    <path d="M-21 5 H1 L-6 22 H-14 Z" fill="#faf6ee" opacity="0.92"/>
    <path d="M-15 22 H-5 L3 82 H-23 Z" fill="#faf6ee" opacity="0.92"/>
    <circle cx="70" cy="52" r="36" fill="#c46d48" opacity="0.34"/>
    <circle cx="70" cy="52" r="25" fill="#c46d48" opacity="0.55"/>
    <path d="M57 40 L70 66 L83 40" fill="none" stroke="#faf6ee" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

function legacyProtectionSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 360">
  <g transform="translate(256 190)">
    <path d="M0 -132 L116 -68 V46 C116 98 66 126 0 140 C-66 126 -116 98 -116 46 V-68 Z" fill="#a66576" opacity="0.09"/>
    <path d="M0 -72 C37 -119 101 -75 58 -22 L0 34 L-58 -22 C-101 -75 -37 -119 0 -72 Z" fill="#a66576" opacity="0.22"/>
    <path d="M-100 104 H100" stroke="#a66576" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
    <rect x="-26" y="36" width="52" height="68" rx="8" fill="#a66576" opacity="0.80"/>
    <path d="M0 22 C-16 42 -12 61 0 68 C12 61 16 42 0 22 Z" fill="#faf6ee" opacity="0.82"/>
    <path d="M0 38 C-7 48 -5 58 0 62 C5 58 7 48 0 38 Z" fill="#a66576" opacity="0.82"/>
  </g>
</svg>`
}

function dementiaCareSSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 360">
  <g transform="translate(256 190)">
    <circle cx="0" cy="0" r="128" fill="#6f7fa8" opacity="0.10"/>
    <path d="M-98 104 H98" stroke="#6f7fa8" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
    <path d="M-65 90 V18 C-65 -48 -21 -83 35 -76 C77 -71 98 -38 92 0 C88 28 70 45 51 58 V90 Z" fill="#6f7fa8" opacity="0.42"/>
    <path d="M-26 -35 C-11 -62 35 -61 51 -34 C73 -28 77 3 58 15 C47 34 10 34 -1 17 C-26 20 -42 -10 -26 -35 Z" fill="#6f7fa8" opacity="0.75"/>
    <path d="M5 -40 C-2 -21 5 -12 23 -12" fill="none" stroke="#faf6ee" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M36 -33 C24 -22 26 -6 41 0" fill="none" stroke="#faf6ee" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
    <path d="M15 48 C34 23 66 48 45 73 L15 101 L-15 73 C-36 48 -4 23 15 48 Z" fill="#6f7fa8" opacity="0.82"/>
  </g>
</svg>`
}

function childGrowthSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 360">
  <g transform="translate(256 190)">
    <path d="M0 -132 L116 -68 V46 C116 98 66 126 0 140 C-66 126 -116 98 -116 46 V-68 Z" fill="#d5aa45" opacity="0.10"/>
    <path d="M-100 104 H100" stroke="#d5aa45" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
    <circle cx="-38" cy="30" r="21" fill="#d5aa45" opacity="0.83"/>
    <path d="M-72 104 V72 C-72 50 -58 38 -38 38 C-18 38 -4 50 -4 72 V104 Z" fill="#d5aa45" opacity="0.83"/>
    <rect x="22" y="-25" width="38" height="129" rx="8" fill="#d5aa45" opacity="0.65"/>
    <path d="M22 -8 H46 M22 14 H37 M22 36 H46 M22 58 H37 M22 80 H46" stroke="#faf6ee" stroke-width="5" stroke-linecap="round" opacity="0.70"/>
    <path d="M-9 -86 L2 -63 L28 -60 L9 -42 L14 -16 L-9 -29 L-32 -16 L-27 -42 L-46 -60 L-20 -63 Z" fill="#d5aa45" opacity="0.78"/>
  </g>
</svg>`
}

// ─── Company order helper ─────────────────────────────────────────────────────
function getCompaniesInOrder(data) {
  for (const p of (data.pages || [])) {
    if (p.type === 'companyPuzzleOverview') {
      const pieces = [...(p.body?.pieces || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
      if (pieces.length) return pieces.map(pc => pc.company)
    }
  }
  const seen = [], names = Object.keys(COMPANY_COLORS)
  for (const p of (data.pages || [])) {
    if (p.type === 'companyDetail') {
      const tText = (p.title?.text) || ''
      for (const n of names) {
        if (!seen.includes(n) && tText.includes(n)) seen.push(n)
      }
    }
  }
  return seen.length ? seen : names
}

// ─── Page assembly ────────────────────────────────────────────────────────────
// pageNum: 실제 렌더링 순번 (1-based), total: 전체 페이지 수
function renderPage(page, data, pageNum, total) {
  const renderer = RENDERERS[page.type]
  if (!renderer) {
    return h('section', { class: 'page' }, [
      renderHead(page, data, pageNum, total),
      h('div', { class: 'body' }, h('p', null, `Unknown page type: ${page.type}`)),
      renderFoot(page, data, pageNum, total),
    ])
  }
  const body = renderer(page, data)
  return h('section', {
    class: `page t-${page.type}`,
    'data-screen-label': String(pageNum).padStart(2, '0') + ' ' + (page.eyebrow?.subtitle || page.type),
  }, [renderHead(page, data, pageNum, total), body, renderFoot(page, data, pageNum, total)])
}

// ─── Fit-to-page ──────────────────────────────────────────────────────────────
// 본문(.body)이 head/foot 사이 영역을 넘치면 살짝 축소해 footer와 겹치지 않게.
// LLM 출력 길이가 가변적이므로 클리핑 대신 비율 축소로 처리(텍스트 잘림 없음).
function fitBodyToPage(section) {
  const body = section.querySelector(':scope > .body')
  if (!body) return
  body.style.transform = ''
  body.style.transformOrigin = ''
  const avail = body.clientHeight
  if (!avail) return
  const need = body.scrollHeight
  if (need > avail + 1) {
    const k = Math.max(0.62, avail / need)
    body.style.transformOrigin = 'top center'
    body.style.transform = `scale(${k})`
  }
}

function fitAllPages(viewportEl) {
  const sections = viewportEl.querySelectorAll(':scope > .page')
  sections.forEach(fitBodyToPage)
}

// ─── Public entry point ───────────────────────────────────────────────────────
export function renderProposal(data, viewportEl) {
  if (!viewportEl) return
  viewportEl.innerHTML = ''
  const total = data.pages.length
  // pageNo 순 정렬은 index.vue에서 이미 처리 → 배열 순서 그대로 1-based 순번 부여
  // 한 페이지 렌더 오류가 이후 전체 페이지를 누락시키지 않도록 페이지 단위로 격리.
  data.pages.forEach((p, i) => {
    try {
      viewportEl.appendChild(renderPage(p, data, i + 1, total))
    } catch (err) {
      console.error(`[renderProposal] page #${i + 1} (${p && p.type}) 렌더 실패:`, err)
      viewportEl.appendChild(h('section', { class: 'page' }, [
        h('div', { class: 'body' }, h('p', null, `Render error on page ${i + 1} (${p && p.type}): ${err && err.message}`)),
      ]))
    }
  })

  // 폰트 로딩 후 측정해야 정확. PDF(Puppeteer)에서는 window.__fitPages로 명시 호출.
  const run = () => fitAllPages(viewportEl)
  if (typeof window !== 'undefined') {
    window.__fitPages = run
    if (window.document && window.document.fonts && window.document.fonts.ready) {
      window.document.fonts.ready.then(run)
    } else {
      run()
    }
  } else {
    run()
  }
}
