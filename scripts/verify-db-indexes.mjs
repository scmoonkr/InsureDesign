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

loadEnv(path.resolve(process.cwd(), '.env'))

const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()
const expectedCollections = [
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

if (!dbName) {
  throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME in .env')
}

const client = new MongoClient(buildMongoUri(), {
  serverSelectionTimeoutMS: 10000,
})

try {
  await client.connect()

  const db = client.db(dbName)
  const summary = {}

  for (const collectionName of expectedCollections) {
    const exists =
      (await db.listCollections({ name: collectionName }, { nameOnly: true }).toArray()).length > 0

    summary[collectionName] = exists
      ? (await db.collection(collectionName).indexes()).map((index) => index.name).sort()
      : null
  }

  console.log(JSON.stringify({ database: dbName, collections: summary }, null, 2))
} finally {
  await client.close()
}
