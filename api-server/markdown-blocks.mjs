// Parse markdown into an array of nodes: text segments + structured blocks.
// Block syntax:
//   :::name
//   key: value
//   key: value
//
//   content body...
//   :::
// If the body doesn't start with `key:` lines, the entire body is content.
//
// Container blocks (currently only `row`) may nest other `:::` fences. The
// parser tracks fence depth so a `:::row` body can contain `:::col` children,
// each of which is parsed recursively into its own node array.

const FENCE_OPEN_RE = /^:::([a-zA-Z][a-zA-Z0-9-]*)\s*$/
const FENCE_CLOSE_RE = /^:::\s*$/
const CODE_FENCE_RE = /^(`{3,}|~{3,})/
// Option lines require whitespace AFTER the colon so URLs like `https://...`
// are not mistakenly parsed as `key: value` pairs.
const OPTION_LINE_RE = /^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s+(.*)$/

export function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || '').split(/\r?\n/)
  const nodes = []
  let textBuffer = []
  let inCodeFence = false
  let codeFenceMarker = ''

  const flushText = () => {
    if (!textBuffer.length) return
    const text = textBuffer.join('\n').replace(/^\n+|\n+$/g, '')
    if (text) nodes.push({ type: 'text', props: { markdown: text } })
    textBuffer = []
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Track code fences to ignore `:::` inside them
    const codeMatch = line.match(CODE_FENCE_RE)
    if (codeMatch) {
      const marker = codeMatch[1]
      if (!inCodeFence) { inCodeFence = true; codeFenceMarker = marker.slice(0, 3) }
      else if (line.startsWith(codeFenceMarker)) { inCodeFence = false; codeFenceMarker = '' }
      textBuffer.push(line)
      i++
      continue
    }
    if (inCodeFence) { textBuffer.push(line); i++; continue }

    const openMatch = line.match(FENCE_OPEN_RE)
    if (openMatch) {
      const name = openMatch[1]
      const { bodyLines, closeIdx } = readFencedBody(lines, i + 1)
      if (bodyLines === null) {
        // unterminated fence: treat the line as plain text
        textBuffer.push(line)
        i++
        continue
      }
      flushText()
      const node = buildBlockNode(name, bodyLines)
      nodes.push(node)
      i = closeIdx + 1
      continue
    }

    textBuffer.push(line)
    i++
  }

  flushText()
  return nodes
}

// Read a fenced block body starting at startIdx, tracking nested ::: fences and
// code fences so a `:::row` body can hold `:::col` children. Returns the body
// lines (excluding the closing `:::`) and the index of the closing fence, or
// { bodyLines: null } if no matching close was found.
function readFencedBody(lines, startIdx) {
  const bodyLines = []
  let depth = 1
  let inCode = false
  let codeMarker = ''
  let j = startIdx
  while (j < lines.length) {
    const line = lines[j]
    const codeMatch = line.match(CODE_FENCE_RE)
    if (codeMatch) {
      const marker = codeMatch[1]
      if (!inCode) { inCode = true; codeMarker = marker.slice(0, 3) }
      else if (line.startsWith(codeMarker)) { inCode = false; codeMarker = '' }
      bodyLines.push(line); j++; continue
    }
    if (!inCode) {
      if (FENCE_OPEN_RE.test(line)) { depth++; bodyLines.push(line); j++; continue }
      if (FENCE_CLOSE_RE.test(line)) {
        depth--
        if (depth === 0) return { bodyLines, closeIdx: j }
        bodyLines.push(line); j++; continue
      }
    }
    bodyLines.push(line); j++
  }
  return { bodyLines: null, closeIdx: -1 }
}

function buildBlockNode(name, bodyLines) {
  if (name === 'row') {
    const { options, columns } = parseRowBody(bodyLines)
    return {
      type: 'row',
      props: { ...options, columns: columns || [] },
      raw: `:::row\n${bodyLines.join('\n')}\n:::`,
    }
  }
  const { options, content } = parseBlockBody(bodyLines)
  return {
    type: name,
    props: { ...options, content },
    raw: `:::${name}\n${bodyLines.join('\n')}\n:::`,
  }
}

// Row body: leading `key: value` option lines, then one or more `:::col … :::`
// segments. Returns { options, columns } where each column is the recursively
// parsed node array. Stray non-col content between cols is silently dropped —
// the validator catches the symptom (column count vs. layout mismatch).
function parseRowBody(bodyLines) {
  const options = {}
  let i = 0
  while (i < bodyLines.length && bodyLines[i].trim() === '') i++
  while (i < bodyLines.length) {
    const line = bodyLines[i]
    if (line.trim() === '') { i++; break }
    const m = line.match(OPTION_LINE_RE)
    if (!m) break
    options[m[1]] = m[2].trim()
    i++
  }

  const columns = []
  while (i < bodyLines.length) {
    const line = bodyLines[i]
    if (line.trim() === '') { i++; continue }
    const m = line.match(FENCE_OPEN_RE)
    if (!m || m[1] !== 'col') { i++; continue }
    const { bodyLines: colBody, closeIdx } = readFencedBody(bodyLines, i + 1)
    if (colBody === null) return { options, columns: null }
    columns.push(parseMarkdownBlocks(colBody.join('\n')))
    i = closeIdx + 1
  }
  return { options, columns }
}

function parseBlockBody(lines) {
  // If first non-empty line is a `key: value` form, parse options until blank line.
  // Otherwise, the entire body is content.
  let firstNonEmpty = 0
  while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === '') firstNonEmpty++
  if (firstNonEmpty >= lines.length) return { options: {}, content: '' }
  if (!OPTION_LINE_RE.test(lines[firstNonEmpty])) {
    return { options: {}, content: lines.join('\n').trim() }
  }

  const options = {}
  let i = firstNonEmpty
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '') { i++; break }
    const m = line.match(OPTION_LINE_RE)
    if (!m) break
    const key = m[1]
    let value = m[2].trim()
    let next = i + 1

    // Multi-line JSON value support: if value starts with [ or {, keep
    // appending lines until JSON.parse succeeds, or we hit a blank line / EOF.
    if (value.startsWith('[') || value.startsWith('{')) {
      let j = next
      while (true) {
        try { JSON.parse(value); break } catch {}
        if (j >= lines.length || lines[j].trim() === '') break
        value += '\n' + lines[j]
        j++
      }
      next = j
    }

    options[key] = value
    i = next
  }
  const content = lines.slice(i).join('\n').trim()
  return { options, content }
}

// Extract plain text from parsed nodes (for searchText / plainText cache).
// Recurses into row children so column text is searchable.
export function blocksToPlainText(nodes) {
  return nodes.map(n => {
    if (n.type === 'text') return n.props.markdown || ''
    if (n.type === 'row' && Array.isArray(n.props?.columns)) {
      return n.props.columns.map(col => blocksToPlainText(col)).filter(Boolean).join('\n')
    }
    if (typeof n.props?.content === 'string' && n.props.content) return n.props.content
    return ''
  }).filter(Boolean).join('\n').trim()
}
