import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

export function nameToSlug(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s가-힣ᄀ-ᇿ㄰-㆏-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'category'
}

async function generateUniqueSlug(db, siteId, base, excludeId = null) {
  const buildQuery = (slug) => {
    const q = { siteId, slug, isDeleted: { $ne: true } }
    if (excludeId && ObjectId.isValid(excludeId)) q._id = { $ne: new ObjectId(excludeId) }
    return q
  }

  if (!await db.collection('categories').findOne(buildQuery(base))) return base

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`
    if (!await db.collection('categories').findOne(buildQuery(candidate))) return candidate
  }

  return `${base}-${Date.now()}`
}

function serializeCategory(doc) {
  if (!doc) return null
  const { _id, parentId, ...rest } = doc
  return {
    id: String(_id),
    ...rest,
    parentId: parentId ? String(parentId) : null,
  }
}

export async function listCategories(siteId) {
  const db = await getMongoDb()
  const items = await db.collection('categories')
    .find({ siteId, isDeleted: { $ne: true } })
    .sort({ order: 1, name: 1 })
    .toArray()
  return items.map(serializeCategory)
}

export async function getCategoryById(siteId, id) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const doc = await db.collection('categories').findOne({
    _id: new ObjectId(id),
    siteId,
    isDeleted: { $ne: true },
  })
  return serializeCategory(doc)
}

export async function getCategoryBySlug(siteId, slug) {
  const db = await getMongoDb()
  const doc = await db.collection('categories').findOne({
    siteId,
    slug,
    isDeleted: { $ne: true },
  })
  return serializeCategory(doc)
}

async function resolveParent(db, siteId, parentIdInput) {
  if (!parentIdInput) return null
  if (!ObjectId.isValid(parentIdInput)) throw new Error('Invalid parent category id')
  const parent = await db.collection('categories').findOne({
    _id: new ObjectId(parentIdInput),
    siteId,
    isDeleted: { $ne: true },
  })
  if (!parent) throw new Error('Parent category not found')
  return parent._id
}

export async function createCategory(data, userId) {
  const db = await getMongoDb()
  const now = new Date()
  const name = String(data.name || '').trim()
  const slugBase = data.slug ? String(data.slug).trim() : nameToSlug(name)
  const slug = await generateUniqueSlug(db, data.siteId, slugBase)
  const parentId = await resolveParent(db, data.siteId, data.parentId)

  const doc = {
    siteId: data.siteId,
    name,
    slug,
    parentId,
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0,
    createdAt: now,
    updatedAt: now,
    createdBy: userId || null,
    updatedBy: userId || null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  }

  const result = await db.collection('categories').insertOne(doc)
  return serializeCategory({ ...doc, _id: result.insertedId })
}

export async function updateCategory(id, siteId, fields, userId) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const existing = await db.collection('categories').findOne({
    _id: new ObjectId(id),
    siteId,
    isDeleted: { $ne: true },
  })
  if (!existing) return null

  const now = new Date()
  const update = { updatedAt: now, updatedBy: userId || null }

  if (typeof fields.name === 'string') update.name = fields.name.trim()
  if (Number.isFinite(Number(fields.order))) update.order = Number(fields.order)

  const slugInput = typeof fields.slug === 'string' ? fields.slug.trim() : ''
  if (slugInput && slugInput !== existing.slug) {
    update.slug = await generateUniqueSlug(db, siteId, slugInput, id)
  } else if (!slugInput && fields.name && fields.name.trim() !== existing.name) {
    update.slug = await generateUniqueSlug(db, siteId, nameToSlug(fields.name), id)
  }

  if (Object.hasOwn(fields, 'parentId')) {
    if (!fields.parentId) {
      update.parentId = null
    } else {
      if (String(fields.parentId) === id) throw new Error('Category cannot be its own parent')
      let cursor = await db.collection('categories').findOne({
        _id: new ObjectId(fields.parentId), siteId, isDeleted: { $ne: true },
      })
      while (cursor) {
        if (String(cursor._id) === id) throw new Error('Cycle detected in category parent chain')
        if (!cursor.parentId) break
        cursor = await db.collection('categories').findOne({
          _id: cursor.parentId, siteId, isDeleted: { $ne: true },
        })
      }
      update.parentId = new ObjectId(fields.parentId)
    }
  }

  const result = await db.collection('categories').findOneAndUpdate(
    { _id: new ObjectId(id), siteId, isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' },
  )
  return serializeCategory(result)
}

export async function deleteCategory(id, siteId, userId) {
  if (!ObjectId.isValid(id)) return { ok: false, reason: 'invalid' }
  const db = await getMongoDb()

  const childCount = await db.collection('categories').countDocuments({
    parentId: new ObjectId(id),
    siteId,
    isDeleted: { $ne: true },
  })
  if (childCount > 0) return { ok: false, reason: 'has-children' }

  const refCount = await db.collection('contents').countDocuments({
    siteId,
    categoryIds: new ObjectId(id),
    isDeleted: { $ne: true },
  })
  if (refCount > 0) return { ok: false, reason: 'has-contents' }

  const now = new Date()
  const result = await db.collection('categories').updateOne(
    { _id: new ObjectId(id), siteId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: now, deletedBy: userId || null, updatedAt: now } },
  )
  return { ok: result.modifiedCount > 0 }
}
