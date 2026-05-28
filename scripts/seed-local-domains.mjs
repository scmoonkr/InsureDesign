/**
 * 로컬 개발 전용 — hosts 파일 도메인을 sites 컬렉션에 등록한다.
 *
 * 사용:
 *   node scripts/seed-local-domains.mjs
 *
 * hosts 파일 설정 (관리자 권한):
 *   Windows: C:\Windows\System32\drivers\etc\hosts
 *   Mac/Linux: /etc/hosts
 *
 *   127.0.0.1  insure.local
 *   127.0.0.1  bible.local
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

loadEnv(path.resolve(process.cwd(), '.env'))
const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()
if (!dbName) throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME in .env')

// siteId → 로컬 도메인 매핑 정의
const LOCAL_DOMAIN_MAP = {
  insure: 'insure.local',
  // bible: 'bible.local',  // 필요한 사이트 추가
}

const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })

try {
  await client.connect()
  const db = client.db(dbName)
  const sites = db.collection('sites')

  for (const [siteId, localHost] of Object.entries(LOCAL_DOMAIN_MAP)) {
    const site = await sites.findOne({ siteId })
    if (!site) {
      console.log(`⚠  Site "${siteId}" not found — run seed-${siteId}-site.mjs first`)
      continue
    }

    const alreadyHas = site.domains?.some(d => d.host === localHost)
    if (alreadyHas) {
      console.log(`✓  ${siteId}: ${localHost} already registered`)
      continue
    }

    await sites.updateOne(
      { siteId },
      {
        $push: { domains: { host: localHost, isPrimary: false, status: 'active', verifiedAt: null } },
        $set: { updatedAt: new Date() },
      },
    )
    console.log(`✓  ${siteId}: added domain ${localHost}`)
  }

  console.log('\nLocal domains registered. Now access:')
  for (const [siteId, localHost] of Object.entries(LOCAL_DOMAIN_MAP)) {
    console.log(`  http://${localHost}:9001  →  siteId: ${siteId}`)
  }
} finally {
  await client.close()
}
