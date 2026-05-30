// Server-side HTML rendering of parsed block nodes.
// Output is used as the cached `html` field on contents.
// Renderer must escape user input; only the wrapper HTML is trusted.

const HTML_ESCAPE = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => HTML_ESCAPE[c])
}

export function renderBlocksToHtml(nodes) {
  return nodes.map(renderNode).filter(Boolean).join('\n')
}

function renderNode(n) {
  if (n.type === 'text') return renderInlineMarkdown(n.props.markdown || '')
  switch (n.type) {
    case 'notice':    return renderNotice(n.props)
    case 'title':     return renderTitleBanner(n.props)
    case 'highlight': return renderHighlight(n.props)
    case 'quote':     return renderQuote(n.props)
    case 'button':    return renderButton(n.props)
    case 'youtube':   return renderYoutube(n.props)
    case 'gallery':   return renderGallery(n.props)
    case 'imageGrid': return renderImageGrid(n.props)
    case 'slide':     return renderSlide(n.props)
    case 'file':      return renderFile(n.props)
    case 'map':       return renderMap(n.props)
    case 'timeline':  return renderTimeline(n.props)
    case 'row':       return renderRow(n.props)
    case 'textCard':  return renderTextCard(n.props)
    default:
      return `<div class="block-placeholder" data-block-type="${esc(n.type)}">` +
        `<em>[${esc(n.type)} block — renderer not yet implemented]</em>` +
        `</div>`
  }
}

function renderRow(props) {
  const layout = String(props.layout || '1-1')
  const gap = ['small', 'medium', 'large'].includes(props.gap) ? props.gap : 'medium'
  const tracks = layout.split('-').map(n => {
    const num = Number(n)
    return Number.isFinite(num) && num > 0 ? `${num}fr` : '1fr'
  }).join(' ')
  const columns = Array.isArray(props.columns) ? props.columns : []
  const cells = columns.map(col => {
    const inner = Array.isArray(col) ? renderBlocksToHtml(col) : ''
    return `<div class="block-row-col">${inner}</div>`
  }).join('')
  return `<div class="block-row block-row-gap-${gap}" data-layout="${esc(layout)}" ` +
    `style="display:grid;grid-template-columns:${tracks}">${cells}</div>`
}

function renderTitleBanner(props) {
  const title = esc(props.title || '')
  const subtitle = props.subtitle ? `<p class="block-title-subtitle">${esc(props.subtitle)}</p>` : ''
  const description = props.content
    ? `<div class="block-title-description">${renderInlineMarkdown(props.content)}</div>`
    : ''

  // Optional CTA — rendered only when buttonText is set; URL is sanitized like the standalone button block.
  let button = ''
  if (props.buttonText) {
    const btnStyle = ['primary', 'secondary', 'warning'].includes(props.buttonStyle) ? props.buttonStyle : 'primary'
    const btnUrl = isSafeUrl(props.buttonUrl) ? props.buttonUrl : '#'
    const external = /^https?:/i.test(btnUrl)
    const btnAttrs = external ? ' target="_blank" rel="noopener"' : ''
    button = `<a class="block-title-cta block-button block-button-${btnStyle}" href="${esc(btnUrl)}"${btnAttrs}>${esc(props.buttonText)}</a>`
  }

  const align = ['left', 'center', 'right'].includes(props.align) ? props.align : 'center'
  const height = ['small', 'medium', 'large'].includes(props.height) ? props.height : 'medium'
  const textColor = props.textColor === 'light' ? 'light' : 'dark'

  const styles = []
  if (props.backgroundColor) styles.push(`background-color:${esc(props.backgroundColor)}`)
  const url = props._media?.[props.imageId]?.paths?.original
  if (url) styles.push(`background-image:url(${esc(url)})`)
  const style = styles.length ? ` style="${styles.join(';')}"` : ''

  return `<section class="block-title block-title-align-${align} block-title-height-${height} block-title-text-${textColor}"${style}>` +
    `<div class="block-title-inner">` +
    `<h2 class="block-title-title">${title}</h2>` +
    `${subtitle}` +
    `${description}` +
    `${button}` +
    `</div></section>`
}

function renderNotice(props) {
  const variant = ['info', 'warning', 'success', 'error'].includes(props.type) ? props.type : 'info'
  const content = renderInlineMarkdown(props.content || '')
  return `<aside class="block-notice block-notice-${variant}">${content}</aside>`
}

function renderHighlight(props) {
  const content = renderInlineMarkdown(props.content || '')
  return `<div class="block-highlight">${content}</div>`
}

function renderQuote(props) {
  const content = renderInlineMarkdown(props.content || '')
  const cite = props.cite ? `<cite class="block-quote-cite">— ${esc(props.cite)}</cite>` : ''
  return `<blockquote class="block-quote">${content}${cite}</blockquote>`
}

function renderButton(props) {
  const style = ['primary', 'secondary', 'warning'].includes(props.style) ? props.style : 'primary'
  const text = esc(props.text || '')
  const url = isSafeUrl(props.url) ? props.url : '#'
  const external = /^https?:/i.test(url)
  const attrs = external ? ' target="_blank" rel="noopener"' : ''
  return `<a class="block-button block-button-${style}" href="${esc(url)}"${attrs}>${text}</a>`
}

function renderYoutube(props) {
  const id = extractYoutubeId(props.content || '')
  if (!id) {
    return `<div class="block-youtube block-youtube-invalid">` +
      `<em>유효하지 않은 YouTube URL: ${esc(props.content || '')}</em></div>`
  }
  const src = `https://www.youtube-nocookie.com/embed/${esc(id)}`
  return `<div class="block-youtube">` +
    `<iframe src="${src}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>` +
    `</div>`
}

function mediaUrl(mediaMap, id, size = 'original') {
  const m = mediaMap?.[id]
  if (!m) return ''
  return m.paths?.[size] || m.paths?.original || ''
}

function renderGallery(props) {
  const ids = Array.isArray(props.imageIds) ? props.imageIds : []
  const mm = props._media || {}
  const items = ids.map(id => {
    const u = mediaUrl(mm, id)
    if (!u) return ''
    const m = mm[id]
    const alt = esc(m?.alt || m?.title || '')
    return `<a class="block-gallery-item" href="${esc(u)}" target="_blank" rel="noopener">` +
      `<img src="${esc(u)}" alt="${alt}" loading="lazy" />` +
      `</a>`
  }).filter(Boolean).join('')
  return `<div class="block-gallery">${items}</div>`
}

function renderImageGrid(props) {
  const cols = ['2', '3', '4'].includes(props.columns) ? props.columns : '3'
  const gap = ['small', 'medium', 'large'].includes(props.gap) ? props.gap : 'medium'
  const items = Array.isArray(props.items) ? props.items : []
  const mm = props._media || {}
  const cells = items.map(it => {
    const u = mediaUrl(mm, it?.imageId)
    if (!u) return ''
    const m = mm[it.imageId]
    const alt = esc(m?.alt || m?.title || '')
    const caption = it?.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ''
    return `<figure class="block-imagegrid-cell">` +
      `<img src="${esc(u)}" alt="${alt}" loading="lazy" />${caption}` +
      `</figure>`
  }).filter(Boolean).join('')
  return `<div class="block-imagegrid block-imagegrid-cols-${cols} block-imagegrid-gap-${gap}">${cells}</div>`
}

function renderTextCard(props) {
  const cols = ['2', '3', '4'].includes(props.columns) ? props.columns : '3'
  const gap = ['small', 'medium', 'large'].includes(props.gap) ? props.gap : 'medium'
  const items = Array.isArray(props.items) ? props.items : []
  const blockTextColor = props.textColor === 'light' ? 'light' : 'dark'
  const blockBg = props.backgroundColor || ''

  const cells = items.map(it => {
    if (!it || typeof it !== 'object') return ''
    const title = it.title ? `<h3 class="block-textcard-title">${esc(it.title)}</h3>` : ''
    const desc = it.description ? `<div class="block-textcard-desc">${renderInlineMarkdown(it.description)}</div>` : ''
    if (!title && !desc) return ''

    // Per-card overrides take precedence over block-level defaults.
    const cardBg = it.backgroundColor || blockBg
    const cardTextColor = it.textColor === 'light' || it.textColor === 'dark'
      ? it.textColor
      : blockTextColor
    const cardStyle = cardBg ? ` style="background-color:${esc(cardBg)}"` : ''
    return `<article class="block-textcard-card block-textcard-text-${cardTextColor}"${cardStyle}>` +
      `${title}${desc}</article>`
  }).filter(Boolean).join('')

  return `<div class="block-textcard block-textcard-cols-${cols} block-textcard-gap-${gap}">${cells}</div>`
}

function filenameFromUrl(url) {
  try {
    const u = url.startsWith('http') ? new URL(url) : new URL(url, 'http://x.local')
    const last = u.pathname.split('/').filter(Boolean).pop() || ''
    return decodeURIComponent(last)
  } catch {
    return url.split('/').filter(Boolean).pop() || url
  }
}

function fileExtension(name) {
  const m = String(name || '').match(/\.([a-z0-9]{1,5})(?:\?.*)?$/i)
  return m ? m[1].toLowerCase() : ''
}

function renderFile(props) {
  const url = isSafeUrl(props.content) ? props.content : '#'
  const filename = filenameFromUrl(props.content || '')
  const label = props.name ? props.name : filename || '파일'
  const ext = fileExtension(filename)
  const external = /^https?:/i.test(url)
  const attrs = external ? ' target="_blank" rel="noopener"' : ''
  return `<a class="block-file" href="${esc(url)}"${attrs} download>` +
    `<span class="block-file-icon">${esc(ext.toUpperCase() || 'FILE')}</span>` +
    `<span class="block-file-meta">` +
    `<strong>${esc(label)}</strong>` +
    (filename && filename !== label ? `<small>${esc(filename)}</small>` : '') +
    `</span></a>`
}

function renderMap(props) {
  const lat = Number(props.lat)
  const lng = Number(props.lng)
  const zoom = Math.max(1, Math.min(19, Number(props.zoom) || 15))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return `<div class="block-map block-map-invalid"><em>잘못된 좌표</em></div>`
  }
  // bbox half-size shrinks with higher zoom
  const half = 0.5 / Math.pow(2, zoom - 11)
  const bbox = [lng - half, lat - half, lng + half, lat + half]
    .map(n => n.toFixed(6))
    .join(',')
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`
  const title = props.title ? `<div class="block-map-title">${esc(props.title)}</div>` : ''
  return `<div class="block-map">${title}<iframe src="${src}" loading="lazy"></iframe></div>`
}

function renderTimeline(props) {
  const items = Array.isArray(props.items) ? props.items : []
  const mm = props._media || {}
  const html = items.map(it => {
    if (!it || typeof it !== 'object') return ''
    const date = it.date ? `<div class="block-timeline-date">${esc(it.date)}</div>` : ''
    const title = it.title ? `<h3 class="block-timeline-title">${esc(it.title)}</h3>` : ''
    const desc = it.description ? `<p class="block-timeline-desc">${esc(it.description)}</p>` : ''

    let image = ''
    if (it.imageId) {
      const m = mm[it.imageId]
      const url = m?.paths?.original
      if (url) {
        const alt = esc(m?.alt || m?.title || '')
        image = `<figure class="block-timeline-image"><img src="${esc(url)}" alt="${alt}" loading="lazy" /></figure>`
      }
    }

    if (!date && !title && !image && !desc) return ''
    return `<article class="block-timeline-item">` +
      `${date}` +
      `<div class="block-timeline-marker"><span class="block-timeline-dot"></span></div>` +
      `<div class="block-timeline-content">${title}${image}${desc}</div>` +
      `</article>`
  }).filter(Boolean).join('')
  return `<div class="block-timeline">${html}</div>`
}

function renderSlide(props) {
  const items = Array.isArray(props.items) ? props.items : []
  const mm = props._media || {}
  const slides = items.map((it, i) => {
    const u = mediaUrl(mm, it?.imageId)
    if (!u) return ''
    const m = mm[it.imageId]
    const alt = esc(m?.alt || m?.title || '')
    const title = it?.title ? `<h3 class="block-slide-title">${esc(it.title)}</h3>` : ''
    const desc = it?.desc ? `<p class="block-slide-desc">${esc(it.desc)}</p>` : ''
    return `<figure class="block-slide-item" data-index="${i}">` +
      `<img src="${esc(u)}" alt="${alt}" loading="lazy" />` +
      `<figcaption>${title}${desc}</figcaption>` +
      `</figure>`
  }).filter(Boolean).join('')
  return `<div class="block-slide">${slides}</div>`
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function isSafeUrl(url) {
  if (!url) return false
  if (url.startsWith('/')) return true
  if (url.startsWith('#')) return true
  return /^(https?|mailto|tel):/i.test(url)
}

const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
export function extractYoutubeId(input) {
  const s = String(input || '').trim()
  // bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m = s.match(YT_RE)
  return m ? m[1] : null
}

// Minimal inline markdown — headings/bold/italic/inline code/link/paragraph.
// Block-level constructs ::: are already extracted by the parser, so this only
// has to handle ordinary prose.
function renderInlineMarkdown(md) {
  if (!md) return ''
  let html = esc(md)
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  return html.split(/\n{2,}/).map(p => {
    const t = p.trim()
    if (!t) return ''
    if (/^<(h[1-6]|ul|ol|pre|blockquote|p|aside|div)/.test(t)) return t
    return `<p>${t.replace(/\n/g, '<br/>')}</p>`
  }).join('\n')
}
