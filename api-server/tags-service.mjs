import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

function nameToSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣ᄀ-ᇿ㄰-㆏-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'tag'
}

function serializeTag(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

async function uniqueSlug(db, base) {
  let candidate = base
  let i = 2
  while (await db.collection('tags').findOne({ slug: candidate, isDeleted: { $ne: true } })) {
    if (i > 100) { candidate = `${base}-${Date.now()}`; break }
    candidate = `${base}-${i++}`
  }
  return candidate
}

export async function getTagBySlug(slug) {
  const db = await getMongoDb()
  const doc = await db.collection('tags').findOne({
    slug,
    isDeleted: { $ne: true },
  })
  return serializeTag(doc)
}

export async function listTags() {
  const db = await getMongoDb()
  const items = await db.collection('tags')
    .find({ isDeleted: { $ne: true } })
    .sort({ usageCount: -1, name: 1 })
    .toArray()
  return items.map(serializeTag)
}

// Resolve a list of tag _id values to { id, name, slug } records.
// Returns only tags that exist + are not deleted.
export async function getTagsByIds(ids) {
  if (!Array.isArray(ids) || !ids.length) return []
  const db = await getMongoDb()
  const objectIds = ids
    .map(v => (v instanceof ObjectId ? v : (typeof v === 'string' && ObjectId.isValid(v) ? new ObjectId(v) : null)))
    .filter(Boolean)
  if (!objectIds.length) return []
  const docs = await db.collection('tags')
    .find({ _id: { $in: objectIds }, isDeleted: { $ne: true } })
    .toArray()
  return docs.map(serializeTag)
}

export async function findOrCreateTagsByNames(names, userId) {
  if (!Array.isArray(names) || !names.length) return []
  const db = await getMongoDb()
  const cleanNames = [...new Set(
    names.map(n => String(n || '').trim()).filter(n => n && n.length <= 40),
  )].slice(0, 30)
  if (!cleanNames.length) return []

  const ids = []
  const now = new Date()
  for (const name of cleanNames) {
    const existing = await db.collection('tags').findOne({
      name, isDeleted: { $ne: true },
    })
    if (existing) { ids.push(existing._id); continue }

    const slug = await uniqueSlug(db, nameToSlug(name))
    const doc = {
      name, slug, usageCount: 0,
      createdAt: now, updatedAt: now,
      createdBy: userId || null, updatedBy: userId || null,
      isDeleted: false, deletedAt: null, deletedBy: null,
    }
    const result = await db.collection('tags').insertOne(doc)
    ids.push(result.insertedId)
  }
  return ids
}
