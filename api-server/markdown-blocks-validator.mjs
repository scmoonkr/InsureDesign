import { BLOCK_TYPES, INITIAL_BLOCK_NAMES } from '../shared/blocks/registry.js'
import { extractYoutubeId } from './markdown-render.mjs'

function isSafeUrl(url) {
  if (!url) return false
  if (url.startsWith('/') || url.startsWith('#')) return true
  return /^(https?|mailto|tel):/i.test(url)
}

// Per-block custom checks beyond schema. Return error string or null.
const CUSTOM_CHECKS = {
  button(props) {
    if (!isSafeUrl(props.url)) {
      return `옵션 'url'은 http(s)/mailto/tel 또는 / 로 시작하는 경로여야 합니다.`
    }
    return null
  },
  title(props) {
    if (props.buttonText && !isSafeUrl(props.buttonUrl)) {
      return `옵션 'buttonUrl'은 http(s)/mailto/tel 또는 / 로 시작하는 경로여야 합니다.`
    }
    return null
  },
  heroCards(props) {
    if (props.buttonText && !isSafeUrl(props.buttonUrl)) {
      return `옵션 'buttonUrl'은 http(s)/mailto/tel 또는 / 로 시작하는 경로여야 합니다.`
    }
    return null
  },
  youtube(props) {
    if (!extractYoutubeId(props.content)) {
      return `유효한 YouTube URL이 아닙니다.`
    }
    return null
  },
  file(props) {
    if (!isSafeUrl(props.content)) {
      return `파일 URL은 http(s) 또는 / 로 시작하는 경로여야 합니다.`
    }
    return null
  },
  row(props) {
    const layout = String(props.layout || '')
    const expected = layout.split('-').length
    const columns = Array.isArray(props.columns) ? props.columns : []
    if (!columns.length) {
      return `row block에 :::col 컬럼이 없습니다.`
    }
    if (columns.length !== expected) {
      return `layout '${layout}'은 ${expected}개 컬럼을 요구하지만 ${columns.length}개가 주어졌습니다.`
    }
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]
      if (!Array.isArray(col)) return `컬럼 #${c + 1}이 잘못 파싱되었습니다.`
      if (col.some(n => n.type === 'row')) {
        return `컬럼 #${c + 1}: row block은 중첩할 수 없습니다.`
      }
    }
    return null
  },
}

// Returns array of human-readable error strings. Empty array = OK.
// pathPrefix labels nested errors (e.g. "Block #2 > 컬럼 #1 > Block #3").
export function validateParsedBlocks(nodes, { allowedBlocks, pathPrefix = '' } = {}) {
  const allowed = (Array.isArray(allowedBlocks) && allowedBlocks.length)
    ? new Set(allowedBlocks)
    : new Set(INITIAL_BLOCK_NAMES)
  const errors = []

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.type === 'text') continue

    const label = `${pathPrefix}Block #${i + 1}`

    if (!allowed.has(n.type)) {
      errors.push(`${label}: '${n.type}'은 허용되지 않은 block입니다.`)
      continue
    }
    const spec = BLOCK_TYPES[n.type]
    if (!spec) {
      errors.push(`${label}: 알 수 없는 block 타입 '${n.type}'.`)
      continue
    }

    const err = checkProps(n, spec)
    if (err) { errors.push(`${label} (${n.type}): ${err}`); continue }

    const customCheck = CUSTOM_CHECKS[n.type]
    if (customCheck) {
      const e = customCheck(n.props || {})
      if (e) { errors.push(`${label} (${n.type}): ${e}`); continue }
    }

    if (n.type === 'row' && Array.isArray(n.props?.columns)) {
      n.props.columns.forEach((col, c) => {
        const colErrors = validateParsedBlocks(col, {
          allowedBlocks,
          pathPrefix: `${label} > 컬럼 #${c + 1} > `,
        })
        errors.push(...colErrors)
      })
    }
  }

  return errors
}

function checkProps(node, spec) {
  if (spec.requiresContent) {
    const c = node.props?.content
    if (typeof c !== 'string' || !c.trim()) return '본문 내용이 비어 있습니다.'
  }
  for (const [key, def] of Object.entries(spec.options || {})) {
    const v = node.props?.[key]
    const isEmpty = v === undefined || v === null || v === ''
    if (isEmpty) {
      if (def.required) return `옵션 '${key}'은 필수입니다.`
      continue
    }
    if (def.type === 'enum' && Array.isArray(def.values) && !def.values.includes(v)) {
      return `옵션 '${key}'은 ${def.values.join(' | ')} 중 하나여야 합니다.`
    }
    if (def.type === 'number') {
      const num = Number(v)
      if (!Number.isFinite(num)) return `옵션 '${key}'은 숫자여야 합니다.`
      if (def.min !== undefined && num < def.min) return `옵션 '${key}'은 ${def.min} 이상이어야 합니다.`
      if (def.max !== undefined && num > def.max) return `옵션 '${key}'은 ${def.max} 이하여야 합니다.`
      // normalize value to Number
      node.props[key] = num
      continue
    }
    if (def.type === 'color') {
      if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(v))) {
        return `옵션 '${key}'은 #abc 또는 #aabbcc 형식의 hex color여야 합니다.`
      }
    }
    if (def.type === 'imageId') {
      // imageId existence in siteId is checked separately by validateAndEnrichImages.
      if (typeof v !== 'string' || !v.trim()) {
        return `옵션 '${key}'은 유효한 imageId여야 합니다.`
      }
    }
    if (def.type === 'json-array') {
      let arr
      try { arr = JSON.parse(v) }
      catch { return `옵션 '${key}'은 유효한 JSON 배열이어야 합니다.` }
      if (!Array.isArray(arr)) return `옵션 '${key}'은 JSON 배열이어야 합니다.`
      if (def.minItems && arr.length < def.minItems) {
        return `옵션 '${key}'은 최소 ${def.minItems}개 항목이 필요합니다.`
      }
      if (def.itemType === 'string' && arr.some(it => typeof it !== 'string')) {
        return `옵션 '${key}'의 모든 항목은 문자열이어야 합니다.`
      }
      if (def.itemType === 'object' && arr.some(it => !it || typeof it !== 'object' || Array.isArray(it))) {
        return `옵션 '${key}'의 모든 항목은 객체여야 합니다.`
      }
      // store parsed value back so renderer doesn't re-parse
      node.props[key] = arr
    }
  }
  return null
}

// Apply spec defaults (mutates a shallow copy so we don't change input).
// Recurses into row children so columns get defaults too.
export function applyBlockDefaults(nodes) {
  return nodes.map(n => {
    if (n.type === 'text') return n
    const spec = BLOCK_TYPES[n.type]
    if (!spec) return n
    const props = { ...n.props }
    for (const [key, def] of Object.entries(spec.options || {})) {
      if ((props[key] === undefined || props[key] === '') && def.default !== undefined) {
        props[key] = def.default
      }
    }
    if (n.type === 'row' && Array.isArray(props.columns)) {
      props.columns = props.columns.map(col => applyBlockDefaults(col))
    }
    return { ...n, props }
  })
}
