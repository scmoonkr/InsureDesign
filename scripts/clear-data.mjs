/**
 * 개발용 데이터 초기화 스크립트
 *
 * 사용:
 *   node scripts/clear-data.mjs           — 모든 컬렉션 documents 삭제 + uploads 디렉토리 비우기
 *   node scripts/clear-data.mjs --db      — DB만 (uploads 유지)
 *   node scripts/clear-data.mjs --media   — uploads만 (DB 유지)
 *   node scripts/clear-data.mjs --drop    — 컬렉션 자체를 drop (인덱스 포함 삭제)
 */
import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (!(key in process.env)) process.env[key] = val
  }
}

function buildMongoUri() {
  const direct = process.env.MONGODB_URI?.trim()
  if (direct) return direct
  const addr = process.env.MONGODB_ADDR?.trim()
  if (!addr) throw new Error('Missing MONGODB_URI or MONGODB_ADDR in .env')
  const hasProto = /^mongodb(\+srv)?:\/\//i.test(addr)
  const base = hasProto ? addr : `mongodb://${addr}`
  const u = process.env.MONGO_USERNAME?.trim()
  const p = process.env.MONGO_PWD?.trim()
  if (!u || !p || base.includes('@')) return base
  return base.replace(/^(mongodb(?:\+srv)?:\/\/)/i, `$1${encodeURIComponent(u)}:${encodeURIComponent(p)}@`)
}

const COLLECTIONS = [
  'sites',
  'users',
  'categories',
  'tags',
  'media',
  'contents',
  'menus',
  'settings',
  'redirects',
  'contentRevisions',
  'auditLogs',
]

const args = process.argv.slice(2)
const clearDb    = args.length === 0 || args.includes('--db')
const clearMedia = args.length === 0 || args.includes('--media')
const dropMode   = args.includes('--drop')

loadEnv(path.resolve(process.cwd(), '.env'))

const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()
if (!dbName) throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME in .env')

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR?.trim() || 'uploads')

// ── Media clear ───────────────────────────────────────────────────────────────
if (clearMedia) {
  if (fs.existsSync(uploadDir)) {
    let count = 0
    for (const entry of fs.readdirSync(uploadDir, { withFileTypes: true })) {
      const fullPath = path.join(uploadDir, entry.name)
      if (entry.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(fullPath)
      }
      count++
    }
    console.log(`✓  uploads cleared — ${count} item(s) removed (${uploadDir})`)
  } else {
    console.log(`–  uploads dir not found, skipping (${uploadDir})`)
  }
}

// ── DB clear ──────────────────────────────────────────────────────────────────
if (clearDb) {
  const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })
  try {
    await client.connect()
    const db = client.db(dbName)

    for (const name of COLLECTIONS) {
      const exists = (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0
      if (!exists) {
        console.log(`–  ${name}: not found, skipping`)
        continue
      }
      if (dropMode) {
        await db.collection(name).drop()
        console.log(`✓  ${name}: dropped`)
      } else {
        const { deletedCount } = await db.collection(name).deleteMany({})
        console.log(`✓  ${name}: ${deletedCount} document(s) deleted`)
      }
    }

    if (dropMode) {
      console.log('\nCollections dropped. Run `npm run db:init` to recreate indexes.')
    } else {
      console.log('\nAll documents cleared. Indexes and collection structure preserved.')
    }
  } finally {
    await client.close()
  }
}
