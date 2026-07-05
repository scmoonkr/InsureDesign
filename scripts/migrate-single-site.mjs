// One-off migration: multi-site → single-site.
//
// Safe to run on a fresh single-site DB. It:
//   1. Migrates the `settings` doc to the fixed { key: 'site' } selector.
//   2. Drops the now-unused `sites` collection.
//   3. $unset the `siteId` field on every document (and roles.$[].siteId on users).
//   4. Drops old (siteId-prefixed) indexes so `npm run db:init` can rebuild the
//      new global-unique indexes cleanly.
//
// After running this, run `npm run db:init` to (re)create the single-site indexes.
//
// Usage: node scripts/migrate-single-site.mjs
import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    let value = rawValue.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim()
  if (directUri) return directUri
  const addr = process.env.MONGODB_ADDR?.trim()
  const username = process.env.MONGO_USERNAME?.trim()
  const password = process.env.MONGO_PWD?.trim()
  if (!addr) throw new Error('Missing MONGODB_URI or MONGODB_ADDR in .env')
  const hasProtocol = /^mongodb(\+srv)?:\/\//i.test(addr)
  const normalizedAddr = hasProtocol ? addr : `mongodb://${addr}`
  if (!username || !password || normalizedAddr.includes('@')) return normalizedAddr
  return normalizedAddr.replace(
    /^(mongodb(?:\+srv)?:\/\/)/i,
    `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`,
  )
}

loadEnv(path.resolve(process.cwd(), '.env'))

const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()
if (!dbName) throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME in .env')

// Collections carrying a siteId field / siteId-prefixed indexes.
const SITE_SCOPED = [
  'users',
  'categories',
  'tags',
  'media',
  'contents',
  'menus',
  'redirects',
  'contentRevisions',
  'auditLogs',
  'settings',
]

async function collectionExists(db, name) {
  return (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0
}

const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })
const summary = {}

try {
  await client.connect()
  const db = client.db(dbName)

  // 1. Settings → fixed { key: 'site' } selector. Keep the first (or 'insure') doc.
  if (await collectionExists(db, 'settings')) {
    const docs = await db.collection('settings').find({}).toArray()
    const survivor = docs.find(d => d.siteId === 'insure') || docs[0]
    if (survivor) {
      await db.collection('settings').updateOne(
        { _id: survivor._id },
        { $set: { key: 'site' }, $unset: { siteId: '' } },
      )
      // Remove any other settings docs so the singleton stays unique.
      const others = docs.filter(d => String(d._id) !== String(survivor._id)).map(d => d._id)
      if (others.length) await db.collection('settings').deleteMany({ _id: { $in: others } })
    }
    summary.settings = { migrated: !!survivor, removed: Math.max(docs.length - 1, 0) }
  }

  // 2. Drop the `sites` collection.
  if (await collectionExists(db, 'sites')) {
    await db.collection('sites').drop()
    summary.sites = 'dropped'
  } else {
    summary.sites = 'absent'
  }

  // 3. $unset siteId everywhere (+ roles.siteId on users). Settings handled above.
  for (const name of SITE_SCOPED) {
    if (name === 'settings') continue
    if (!(await collectionExists(db, name))) { summary[name] = 'absent'; continue }
    const res = await db.collection(name).updateMany({}, { $unset: { siteId: '' } })
    let rolesRes = 0
    if (name === 'users') {
      const r = await db.collection('users').updateMany(
        {},
        { $unset: { 'roles.$[].siteId': '' } },
      )
      rolesRes = r.modifiedCount
    }
    summary[name] = { unsetSiteId: res.modifiedCount, ...(name === 'users' ? { unsetRolesSiteId: rolesRes } : {}) }
  }

  // 4. Drop non-_id indexes on affected collections so db:init rebuilds cleanly.
  for (const name of SITE_SCOPED) {
    if (!(await collectionExists(db, name))) continue
    try {
      await db.collection(name).dropIndexes()
    } catch (err) {
      // ignore "ns not found" / no-index cases
    }
  }

  console.log(JSON.stringify({ database: dbName, summary }, null, 2))
  console.log('\n다음 단계: `npm run db:init` 실행하여 단일 사이트 인덱스를 재생성하세요.')
} finally {
  await client.close()
}
