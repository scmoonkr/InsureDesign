import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getConfig } from './config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKER_PATH = path.resolve(__dirname, 'workers/extract_insurance_pdf.py')

// 보험 PDF(실제 파일 경로) -> 표준 JSON.
// Python pdfplumber 워커를 spawn 하고 stdout(UTF-8 JSON)을 파싱해 반환한다.
// docs/convert_pdf_json.md 의 "Node에서 Python worker 호출" 패턴을 따른다.
export function extractPdfToJson(absPdfPath) {
  const { pythonPath } = getConfig()

  return new Promise((resolve, reject) => {
    const child = spawn(pythonPath, [WORKER_PATH, absPdfPath], {
      cwd: __dirname,
      windowsHide: true,
    })

    const stdoutChunks = []
    let stderr = ''

    child.stdout.on('data', chunk => stdoutChunks.push(chunk))
    child.stderr.on('data', chunk => { stderr += chunk.toString('utf8') })

    child.on('error', err => {
      reject(new Error(`Python 워커 실행 실패: ${err.message}`))
    })

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Python 워커 종료 코드 ${code}`))
        return
      }
      try {
        // 워커는 stdout에 UTF-8 JSON만 출력한다.
        resolve(JSON.parse(Buffer.concat(stdoutChunks).toString('utf8')))
      } catch (err) {
        reject(new Error(`워커 JSON 파싱 실패: ${err.message}`))
      }
    })
  })
}
