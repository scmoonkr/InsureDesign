import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

const client = new MongoClient(buildMongoUri(), { serverSelectionTimeoutMS: 10000 })

try {
  await client.connect()
  await client.db('admin').command({ ping: 1 })

  const db = client.db(dbName)
  const sites = db.collection('sites')

  const existing = await sites.findOne({ siteId: 'insure' })
  if (existing) {
    console.log('Site "insure" already exists. Adding domain if missing...')

    const hasDomain = existing.domains?.some(d => d.host === 'insuredesign.co.kr')
    if (!hasDomain) {
      await sites.updateOne(
        { siteId: 'insure' },
        {
          $push: { domains: { host: 'insuredesign.co.kr', isPrimary: true, status: 'active', verifiedAt: null } },
          $set: { primaryDomain: 'insuredesign.co.kr', updatedAt: new Date() },
        },
      )
      console.log('Domain insuredesign.co.kr added to site "insure".')
    } else {
      console.log('Domain insuredesign.co.kr already registered.')
    }
  } else {
    const now = new Date()
    const doc = {
      siteId: 'insure',
      name: 'Insure Design',
      domains: [{ host: 'insuredesign.co.kr', isPrimary: true, status: 'active', verifiedAt: null }],
      primaryDomain: 'insuredesign.co.kr',
      status: 'active',
      locale: 'ko',
      timezone: 'Asia/Seoul',
      themeId: 'default',
      styleFamily: null,
      themeConfig: {},
      allowedTemplates: [],
      allowedBlocks: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    }

    const result = await sites.insertOne(doc)
    console.log(`Site "insure" created. _id: ${result.insertedId}`)
    console.log('Domain mapping: insuredesign.co.kr → insure')
  }

  const final = await sites.findOne({ siteId: 'insure' })
  console.log('\nFinal site document:')
  console.log(JSON.stringify({ ...final, _id: String(final._id) }, null, 2))
} finally {
  await client.close()
}
