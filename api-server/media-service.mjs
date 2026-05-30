import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

function serializeMedia(item) {
  if (!item) return null
  const { _id, ...rest } = item
  return { id: String(_id), ...rest }
}

export async function listMedia(siteId, { limit = 500 } = {}) {
  const db = await getMongoDb()
  const items = await db.collection('media')
    .find({ siteId, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()
  return items.map(serializeMedia)
}

export async function createMedia(data) {
  const db = await getMongoDb()
  const now = new Date()
  const doc = {
    siteId: data.siteId,
    title: data.title || '',
    originalName: data.originalName,
    filename: data.filename,
    mimeType: data.mimeType,
    size: data.size,
    width: data.width || null,
    height: data.height || null,
    hash: data.hash,
    storage: 'local',
    paths: data.paths,
    alt: data.alt || '',
    caption: data.caption || '',
    description: data.description || '',
    uploadedBy: data.uploadedBy || null,
    usedIn: [],
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  }
  const result = await db.collection('media').insertOne(doc)
  return serializeMedia({ ...doc, _id: result.insertedId })
}

export async function updateMediaMeta(id, fields) {
  const db = await getMongoDb()
  const allowed = ['title', 'alt', 'caption', 'description']
  const update = {}
  for (const key of allowed) {
    if (Object.hasOwn(fields, key) && typeof fields[key] === 'string') {
      update[key] = fields[key]
    }
  }
  update.updatedAt = new Date()

  const result = await db.collection('media').findOneAndUpdate(
    { _id: new ObjectId(id), isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' },
  )
  return serializeMedia(result)
}

// Look up media docs by IDs for a specific siteId. Returns map id → { id, paths, ... }.
// Missing IDs / wrong siteId / soft-deleted items are simply omitted.
export async function getMediaByIds(siteId, ids) {
  if (!Array.isArray(ids) || !ids.length) return {}
  const objectIds = ids.filter(id => typeof id === 'string' && ObjectId.isValid(id))
    .map(id => new ObjectId(id))
  if (!objectIds.length) return {}
  const db = await getMongoDb()
  const docs = await db.collection('media')
    .find({ _id: { $in: objectIds }, siteId, isDeleted: { $ne: true } })
    .toArray()
  const map = {}
  for (const d of docs) map[String(d._id)] = serializeMedia(d)
  return map
}

export async function deleteMedia(id, siteId, userId) {
  if (!ObjectId.isValid(id)) return false
  const db = await getMongoDb()
  const now = new Date()
  const result = await db.collection('media').updateOne(
    { _id: new ObjectId(id), siteId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: now, deletedBy: userId || null, updatedAt: now } },
  )
  return result.modifiedCount > 0
}
