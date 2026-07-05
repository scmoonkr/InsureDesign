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

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim()
  if (directUri) return directUri

  const addr = process.env.MONGODB_ADDR?.trim()
  const username = process.env.MONGO_USERNAME?.trim()
  const password = process.env.MONGO_PWD?.trim()

  if (!addr) {
    throw new Error('Missing MONGODB_URI or MONGODB_ADDR in .env')
  }

  const hasProtocol = /^mongodb(\+srv)?:\/\//i.test(addr)
  const normalizedAddr = hasProtocol ? addr : `mongodb://${addr}`

  if (!username || !password || normalizedAddr.includes('@')) {
    return normalizedAddr
  }

  return normalizedAddr.replace(
    /^(mongodb(?:\+srv)?:\/\/)/i,
    `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`,
  )
}

async function ensureCollection(db, name) {
  const collections = await db.listCollections({ name }, { nameOnly: true }).toArray()

  if (collections.length === 0) {
    await db.createCollection(name)
    return 'created'
  }

  return 'exists'
}

async function createIndexes(db, collectionName, indexes) {
  const collection = db.collection(collectionName)
  const results = []

  for (const index of indexes) {
    const name = await collection.createIndex(index.keys, index.options ?? {})
    results.push(name)
  }

  return results
}

loadEnv(path.resolve(process.cwd(), '.env'))

const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()

if (!dbName) {
  throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME in .env')
}

const collections = [
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

const indexesByCollection = {
  users: [
    {
      keys: { provider: 1, providerId: 1 },
      options: { unique: true, name: 'uniq_provider_providerId' },
    },
    { keys: { email: 1 }, options: { name: 'idx_email' } },
    { keys: { 'roles.role': 1 }, options: { name: 'idx_roles_role' } },
  ],
  categories: [
    {
      keys: { slug: 1 },
      options: { unique: true, name: 'uniq_slug' },
    },
    {
      keys: { parentId: 1, order: 1 },
      options: { name: 'idx_parent_order' },
    },
  ],
  tags: [
    {
      keys: { slug: 1 },
      options: { unique: true, name: 'uniq_slug' },
    },
    { keys: { usageCount: -1 }, options: { name: 'idx_usageCount' } },
  ],
  media: [
    { keys: { createdAt: -1 }, options: { name: 'idx_createdAt' } },
    { keys: { hash: 1 }, options: { name: 'idx_hash' } },
  ],
  contents: [
    {
      keys: { slug: 1 },
      options: { unique: true, name: 'uniq_slug' },
    },
    {
      keys: { status: 1, publishedAt: -1 },
      options: { name: 'idx_status_publishedAt' },
    },
    {
      keys: { contentType: 1, status: 1, publishedAt: -1 },
      options: { name: 'idx_type_status_publishedAt' },
    },
    {
      keys: { categoryIds: 1, publishedAt: -1 },
      options: { name: 'idx_categories_publishedAt' },
    },
    {
      keys: { tagIds: 1, publishedAt: -1 },
      options: { name: 'idx_tags_publishedAt' },
    },
  ],
  menus: [
    {
      keys: { name: 1 },
      options: { unique: true, name: 'uniq_name' },
    },
    { keys: { location: 1 }, options: { name: 'idx_location' } },
  ],
  redirects: [
    {
      keys: { fromPath: 1 },
      options: { unique: true, name: 'uniq_fromPath' },
    },
  ],
  contentRevisions: [
    {
      keys: { contentId: 1, revisionNo: -1 },
      options: { name: 'idx_content_revisionNo' },
    },
  ],
  auditLogs: [
    { keys: { createdAt: -1 }, options: { name: 'idx_createdAt' } },
    {
      keys: { resourceType: 1, resourceId: 1 },
      options: { name: 'idx_resource' },
    },
  ],
}

const client = new MongoClient(buildMongoUri(), {
  serverSelectionTimeoutMS: 10000,
})

try {
  await client.connect()
  await client.db('admin').command({ ping: 1 })

  const db = client.db(dbName)
  const summary = []

  for (const collectionName of collections) {
    const status = await ensureCollection(db, collectionName)
    const indexNames = await createIndexes(db, collectionName, indexesByCollection[collectionName] ?? [])

    summary.push({
      collection: collectionName,
      status,
      indexes: indexNames,
    })
  }

  console.log(JSON.stringify({ database: dbName, collections: summary }, null, 2))
} finally {
  await client.close()
}
