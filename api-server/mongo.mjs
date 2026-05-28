import { MongoClient } from 'mongodb'

let client = null

function buildMongoUri() {
  const directUri = process.env.MONGODB_URI?.trim()
  if (directUri) {
    return directUri
  }

  const addr = process.env.MONGODB_ADDR?.trim()
  const username = process.env.MONGO_USERNAME?.trim()
  const password = process.env.MONGO_PWD?.trim()

  if (!addr) {
    throw new Error('Missing MONGODB_URI or MONGODB_ADDR')
  }

  const normalizedAddr = /^mongodb(\+srv)?:\/\//i.test(addr) ? addr : `mongodb://${addr}`

  if (!username || !password || normalizedAddr.includes('@')) {
    return normalizedAddr
  }

  return normalizedAddr.replace(
    /^(mongodb(?:\+srv)?:\/\/)/i,
    `$1${encodeURIComponent(username)}:${encodeURIComponent(password)}@`,
  )
}

export async function getMongoDb() {
  if (!client) {
    client = new MongoClient(buildMongoUri())
  }

  await client.connect()

  const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGO_DBNAME?.trim()
  if (!dbName) {
    throw new Error('Missing MONGODB_DB_NAME or MONGO_DBNAME')
  }

  return client.db(dbName)
}
