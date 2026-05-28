import { getMongoDb } from './mongo.mjs'

function serializeSite(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

export async function listSites() {
  const db = await getMongoDb()
  const docs = await db.collection('sites')
    .find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(serializeSite)
}

export async function getSiteById(siteId) {
  const db = await getMongoDb()
  const doc = await db.collection('sites').findOne({
    siteId,
    isDeleted: { $ne: true },
  })
  return serializeSite(doc)
}

export async function getSiteByDomain(host) {
  if (!host) return null
  const db = await getMongoDb()
  const doc = await db.collection('sites').findOne({
    'domains.host': host.toLowerCase(),
    isDeleted: { $ne: true },
  })
  return serializeSite(doc)
}

export async function createSite(data) {
  const db = await getMongoDb()
  const existing = await db.collection('sites').findOne({ siteId: data.siteId })
  if (existing) {
    throw Object.assign(new Error('siteId already exists'), { statusCode: 409 })
  }

  const now = new Date()
  const doc = {
    siteId: data.siteId,
    name: data.name || data.siteId,
    domains: Array.isArray(data.domains) ? data.domains : [],
    primaryDomain: data.primaryDomain || null,
    status: data.status || 'active',
    locale: data.locale || 'ko',
    timezone: data.timezone || 'Asia/Seoul',
    themeId: data.themeId || 'default',
    styleFamily: data.styleFamily || null,
    themeConfig: data.themeConfig || {},
    allowedTemplates: data.allowedTemplates || [],
    allowedBlocks: data.allowedBlocks || [],
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  }

  const result = await db.collection('sites').insertOne(doc)
  return serializeSite({ ...doc, _id: result.insertedId })
}

export async function updateSite(siteId, fields) {
  const db = await getMongoDb()
  const allowed = [
    'name', 'status', 'locale', 'timezone',
    'themeId', 'styleFamily', 'themeConfig',
    'allowedTemplates', 'allowedBlocks', 'primaryDomain',
  ]
  const update = {}
  for (const key of allowed) {
    if (Object.hasOwn(fields, key)) update[key] = fields[key]
  }
  update.updatedAt = new Date()

  const result = await db.collection('sites').findOneAndUpdate(
    { siteId, isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' },
  )
  return serializeSite(result)
}

export async function addDomain(siteId, domainData) {
  const db = await getMongoDb()
  const host = String(domainData.host || '').trim().toLowerCase()
  if (!host) throw Object.assign(new Error('host is required'), { statusCode: 400 })

  const conflict = await db.collection('sites').findOne({
    'domains.host': host,
    siteId: { $ne: siteId },
    isDeleted: { $ne: true },
  })
  if (conflict) {
    throw Object.assign(new Error('Domain already assigned to another site'), { statusCode: 409 })
  }

  // Remove existing entry for this host first (upsert behavior)
  await db.collection('sites').updateOne(
    { siteId, isDeleted: { $ne: true } },
    { $pull: { domains: { host } } },
  )

  const domain = {
    host,
    isPrimary: domainData.isPrimary === true,
    status: domainData.status || 'active',
    verifiedAt: domainData.verifiedAt || null,
  }

  const result = await db.collection('sites').findOneAndUpdate(
    { siteId, isDeleted: { $ne: true } },
    { $push: { domains: domain }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  return serializeSite(result)
}

export async function removeDomain(siteId, host) {
  const db = await getMongoDb()
  const result = await db.collection('sites').findOneAndUpdate(
    { siteId, isDeleted: { $ne: true } },
    {
      $pull: { domains: { host: String(host).toLowerCase() } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: 'after' },
  )
  return serializeSite(result)
}
