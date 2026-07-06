// Cross-DB import: CMS (legacy) -> InsureDesign (single-site), stripping siteId.
//
// What it does:
//   1. WIPES the target DB (drops every existing target collection — e.g. the
//      stray `temp` collection and any empty leftovers).
//   2. Copies EVERY source collection EXCEPT `sites`, preserving `_id`
//      (so ObjectId references between collections stay valid).
//      → non-standard collections such as `insurancePlanning` are included
//        automatically.
//   3. Strips top-level `siteId` from every doc, and `roles[].siteId` on users.
//   4. Collapses `settings` to a single { key: 'site' } document.
//
// Safety:
//   - Aborts if source has more than one distinct non-null siteId (multi-site
//     data would collide once siteId is removed).
//   - Refuses to run if source and target DB names are identical.
//   - `--dry` previews counts without writing anything.
//
// Usage:
//   node scripts/import-cms-to-insure.mjs --dry     # preview only
//   node scripts/import-cms-to-insure.mjs           # execute
//   SOURCE_DB_NAME=CMS node scripts/import-cms-to-insure.mjs
//
// After a real run:
//   npm run db:init      # rebuild single-site (siteId-free) indexes
//   npm run db:verify
import { MongoClient } from 'mongodb'
import { loadEnv } from '../api-server/config.mjs'

loadEnv()

const DRY = process.argv.includes('--dry')
const SOURCE_DB = (process.env.SOURCE_DB_NAME || 'CMS').trim()
const TARGET_DB = (process.env.MONGODB_DB_NAME || process.env.MONGO_DBNAME || '').trim()

// Collections that must never be imported (multi-site leftovers).
const EXCLUDE = new Set(['sites'])

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim()
  if (directUri) return directUri

  const addr = process.env.MONGODB_ADDR?.trim()
  const username = process.env.MONGO_USERNAME?.trim()
  const password = process.env.MONGO_PWD?.trim()
  if (!addr) throw new Error('Missing MONGODB_URI or MONGODB_ADDR in .env')

  const normalized = /^mongodb(\+srv)?:\/\//i.test(addr) ? addr : `mongodb://${addr}`
  if (!username || !password || normalized.includes('@')) return normalized
  return normalized.replace(
    /^(mongodb(?:\+srv)?:\/\/)/i,
    `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`,
  )
}

// Per-collection transform. Default: drop siteId. Special cases for users/settings.
function transformDoc(collectionName, doc) {
  const out = { ...doc }
  delete out.siteId

  if (collectionName === 'users' && Array.isArray(out.roles)) {
    out.roles = out.roles.map(role => {
      if (!role || typeof role !== 'object') return role
      const { siteId, ...rest } = role
      return rest
    })
  }

  if (collectionName === 'settings') {
    out.key = 'site'
  }

  return out
}

if (!TARGET_DB) throw new Error('Missing MONGO_DBNAME / MONGODB_DB_NAME in .env')
if (SOURCE_DB === TARGET_DB) {
  throw new Error(`Source and target DB are identical (${SOURCE_DB}). Refusing to run.`)
}

const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })
const summary = []

try {
  await client.connect()
  const source = client.db(SOURCE_DB)
  const target = client.db(TARGET_DB)

  const sourceCols = (await source.listCollections({}, { nameOnly: true }).toArray())
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'))
    .sort()

  if (sourceCols.length === 0) {
    throw new Error(`Source DB "${SOURCE_DB}" has no collections. Wrong SOURCE_DB_NAME?`)
  }

  // --- Guard: reject multi-site source ---------------------------------------
  const siteIds = new Set()
  for (const name of sourceCols) {
    if (EXCLUDE.has(name)) continue
    const values = await source.collection(name).distinct('siteId')
    for (const v of values) if (v != null) siteIds.add(v)
  }
  if (siteIds.size > 1) {
    throw new Error(
      `Source has multiple siteIds ${JSON.stringify([...siteIds])}. ` +
      `Filter to a single site before importing — aborting to avoid slug collisions.`,
    )
  }
  console.log(`[guard] siteIds in source: ${JSON.stringify([...siteIds]) || '[]'}  (ok)`)

  // --- Wipe target -----------------------------------------------------------
  const targetCols = (await target.listCollections({}, { nameOnly: true }).toArray())
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'))
  console.log(`\n[target] ${TARGET_DB} — ${DRY ? 'would drop' : 'dropping'} ${targetCols.length} collection(s): ${JSON.stringify(targetCols)}`)
  if (!DRY) {
    for (const name of targetCols) await target.collection(name).drop().catch(() => {})
  }

  // --- Import ----------------------------------------------------------------
  console.log(`\n[import] ${SOURCE_DB} -> ${TARGET_DB}${DRY ? '  (dry run — no writes)' : ''}`)
  for (const name of sourceCols) {
    if (EXCLUDE.has(name)) {
      summary.push({ collection: name, action: 'excluded' })
      continue
    }

    let docs = await source.collection(name).find({}).toArray()

    if (name === 'settings') {
      const survivor = docs.find(d => d.siteId === 'insure') || docs[0]
      docs = survivor ? [survivor] : []
    }

    const transformed = docs.map(d => transformDoc(name, d))

    if (!DRY && transformed.length) {
      await target.collection(name).insertMany(transformed, { ordered: false })
    }

    summary.push({ collection: name, sourceCount: docs.length, imported: DRY ? 0 : transformed.length })
    console.log(`  ${name.padEnd(20)} ${String(docs.length).padStart(5)} -> ${DRY ? '(dry)' : transformed.length}`)
  }

  // --- Post-check ------------------------------------------------------------
  if (!DRY) {
    let leftover = 0
    for (const name of sourceCols) {
      if (EXCLUDE.has(name)) continue
      leftover += await target.collection(name).countDocuments({ siteId: { $exists: true } })
    }
    console.log(`\n[verify] docs still carrying siteId in target: ${leftover} (expected 0)`)
  }

  console.log('\n' + JSON.stringify({ source: SOURCE_DB, target: TARGET_DB, dry: DRY, summary }, null, 2))
  if (!DRY) console.log('\n다음 단계: `npm run db:init` 후 `npm run db:verify` 실행.')
} finally {
  await client.close()
}
