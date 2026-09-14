import fs from 'node:fs'
import path from 'node:path'
import { mkdir, appendFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 표준 포맷에 없는 라벨/표 등 "추후 처리" 대상을 남기는 로그 파일 (JSONL, append-only).
// SCHEMA_GAP_LOG 로 경로 재정의 가능. 기본: api-server/logs/schema-gap.jsonl
const LOG_PATH = process.env.SCHEMA_GAP_LOG
  ? path.resolve(process.env.SCHEMA_GAP_LOG)
  : path.resolve(__dirname, 'logs/schema-gap.jsonl')

// 추출 결과(convert_pdf 반환) 1건에서 gap 로그 엔트리를 만든다.
// gap 이 없으면(모두 비어있으면) null 반환.
export function buildSchemaGapEntry(extraction, meta = {}) {
  const gap = extraction?.extraction?.schema_gap
  if (!gap) return null

  const missing = gap.missing_standard_fields || []
  const unknownLabelsRaw = gap.potential_schema_extensions || []
  const unparsedTables = gap.unparsed_tables || []
  const warnings = gap.warnings || []

  if (!missing.length && !unknownLabelsRaw.length && !unparsedTables.length && !warnings.length) {
    return null
  }

  return {
    docId: meta.docId || null,
    slot: meta.slot || null,                       // 'existing' | 'proposal[0]' ...
    sourceUrlPath: meta.sourceUrlPath || null,
    originalName: meta.originalName || null,
    insurer: extraction?.insurer?.name || null,
    documentType: extraction?.document?.document_type || null,
    missingStandardFields: missing,
    // 표준 포맷에 없는 라벨(용어) — 핵심 항목
    unknownLabels: unknownLabelsRaw.map(c => ({
      label: c.label,
      valueSample: c.value_sample,
      suggestedStandardField: c.suggested_standard_field || null,
      sourcePage: c.source_page,
    })),
    unparsedTables,
    warnings,
  }
}

// 엔트리 배열을 로그 파일에 append (loggedAt 은 여기서 부여).
// 파일 로깅 실패는 치명적이지 않으므로 삼켜서 추출 흐름을 막지 않는다.
export async function appendSchemaGapEntries(entries, loggedAtIso) {
  const list = (entries || []).filter(Boolean)
  if (!list.length) return { logged: 0, logPath: LOG_PATH }

  const lines = list
    .map(e => JSON.stringify({ loggedAt: loggedAtIso, ...e }))
    .join('\n') + '\n'

  try {
    await mkdir(path.dirname(LOG_PATH), { recursive: true })
    await appendFile(LOG_PATH, lines, 'utf8')
  } catch (err) {
    console.error(`[schema-gap] 로그 파일 기록 실패: ${err.message}`)
    return { logged: 0, logPath: LOG_PATH }
  }

  // 서버 콘솔에도 요약 경고 — 새 보험사/양식 유입을 바로 알아챌 수 있게.
  for (const e of list) {
    const labels = e.unknownLabels.map(u => u.label).slice(0, 8).join(', ')
    console.warn(
      `[schema-gap] ${e.slot || '-'} (${e.insurer || '보험사미상'}/${e.documentType || '-'}) `
      + `미지라벨 ${e.unknownLabels.length}개${labels ? ` [${labels}${e.unknownLabels.length > 8 ? ' …' : ''}]` : ''}`
      + `, 미매핑표 ${e.unparsedTables.length}, 누락필드 ${e.missingStandardFields.length}, 경고 ${e.warnings.length}`,
    )
  }

  return { logged: list.length, logPath: LOG_PATH }
}

export function getSchemaGapLogPath() {
  return LOG_PATH
}

export function schemaGapLogExists() {
  return fs.existsSync(LOG_PATH)
}
