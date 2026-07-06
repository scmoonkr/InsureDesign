// One-off: strip the vestigial multi-site segment from stored /uploads paths.
//
// Old multi-site uploads were saved under /uploads/sites/<siteId>/YYYY/MM/... .
// The single-site UPLOAD_DIR now serves /uploads/YYYY/MM/... directly (files live
// at UPLOAD_DIR/YYYY/MM/...), so the stored DB references 404. This rewrites them:
//
//     /uploads/sites/<anything>/   ->   /uploads/
//
// Touches string fields (recursively, preserving ObjectId/Date types):
//   media           → paths.*
//   contents        → html, markdown, plainText, searchText, summary, blocks
//   contentRevisions→ html, markdown, plainText, searchText, blocks
//   settings        → logoUrl, faviconUrl
//
// Usage:
//   node scripts/fix-upload-paths.mjs --dry   # preview counts, no writes
//   node scripts/fix-upload-paths.mjs         # apply
import { MongoClient } from 'mongodb'
import { loadEnv } from '../api-server/config.mjs'

loadEnv()

const DRY = process.argv.includes('--dry')
const RE = /\/uploads\/sites\/[^/]+\//g

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim()
  if (directUri) return directUri
  const addr = process.env.MONGODB_ADDR?.trim()
  const username = process.env.MONGO_USERNAME?.trim()
  const password = process.env.MONGO_PWD?.trim()
  if (!addr) throw new Error('Missing MONGODB_URI or MONGODB_ADDR in .env')
  const normalized = /^mongodb(\+srv)?:\/\//i.test(addr) ? addr : `mongodb://${addr}`
  if (!username || !password || normalized.includes('@')) return normalized
  return normalized.replace(/^(mongodb(?:\+srv)?:\/\/)/i, `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`)
}

// Recursively rewrite strings, preserving BSON types (ObjectId, Date, etc.).
function deepFix(value) {
  if (typeof value === 'string') return value.replace(RE, '/uploads/')
  if (Array.isArray(value)) return value.map(deepFix)
  if (value && typeof value === 'object') {
    if (value._bsontype || value instanceof Date) return value // don't recurse into ObjectId/Date
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = deepFix(v)
    return out
  }
  return value
}

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b)

const PLAN = {
  media:            ['paths'],
  contents:         ['html', 'markdown', 'plainText', 'searchText', 'summary', 'blocks'],
  contentRevisions: ['html', 'markdown', 'plainText', 'searchText', 'blocks'],
  settings:         ['logoUrl', 'faviconUrl'],
}

const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })
const summary = {}

try {
  await client.connect()
  const db = client.db(process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim())

  for (const [coll, fields] of Object.entries(PLAN)) {
    const docs = await db.collection(coll).find({}).toArray()
    let updated = 0
    for (const doc of docs) {
      const set = {}
      for (const f of fields) {
        if (!(f in doc)) continue
        const fixed = deepFix(doc[f])
        if (changed(doc[f], fixed)) set[f] = fixed
      }
      if (Object.keys(set).length) {
        updated++
        if (!DRY) await db.collection(coll).updateOne({ _id: doc._id }, { $set: set })
      }
    }
    summary[coll] = { scanned: docs.length, rewritten: updated }
    console.log(`  ${coll.padEnd(18)} scanned=${docs.length}  rewritten=${updated}${DRY ? ' (dry)' : ''}`)
  }

  console.log('\n' + JSON.stringify({ dry: DRY, summary }, null, 2))
} finally {
  await client.close()
}
