import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

const ALLOWED_TYPES = ['page', 'post', 'category', 'url']
const ALLOWED_LOCATIONS = ['header', 'footer', 'sidebar', 'custom']
const MAX_DEPTH = 2

function serializeMenu(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

// Normalize menu items array. Drops invalid items and limits nesting to MAX_DEPTH.
function sanitizeItems(items, depth = 0) {
  if (!Array.isArray(items) || depth >= MAX_DEPTH) return []
  const out = []
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    if (!ALLOWED_TYPES.includes(it.type)) continue
    const sanitized = {
      id: typeof it.id === 'string' && it.id ? it.id : String(new ObjectId()),
      title: String(it.title || '').slice(0, 200).trim(),
      type: it.type,
      target: it.target === 'blank' ? 'blank' : 'self',
      isVisible: it.isVisible !== false,
      order: Number.isFinite(Number(it.order)) ? Number(it.order) : 0,
    }
    if (it.type === 'page' || it.type === 'post') {
      sanitized.contentId = it.contentId ? String(it.contentId) : null
    } else if (it.type === 'category') {
      sanitized.categoryId = it.categoryId ? String(it.categoryId) : null
    } else if (it.type === 'url') {
      sanitized.url = String(it.url || '').slice(0, 500)
    }
    sanitized.children = sanitizeItems(it.children, depth + 1)
    out.push(sanitized)
  }
  // Re-assign sequential order indexes
  out.forEach((it, i) => { it.order = i })
  return out
}

export async function listMenus() {
  const db = await getMongoDb()
  const items = await db.collection('menus')
    .find({ isDeleted: { $ne: true } })
    .sort({ location: 1, name: 1 })
    .toArray()
  return items.map(serializeMenu)
}

export async function getMenuById(id) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const doc = await db.collection('menus').findOne({
    _id: new ObjectId(id), isDeleted: { $ne: true },
  })
  return serializeMenu(doc)
}

export async function createMenu(data, userId) {
  const db = await getMongoDb()
  const now = new Date()
  const doc = {
    name: String(data.name || 'Untitled Menu').trim().slice(0, 100),
    location: ALLOWED_LOCATIONS.includes(data.location) ? data.location : 'custom',
    items: sanitizeItems(data.items),
    createdAt: now,
    updatedAt: now,
    createdBy: userId || null,
    updatedBy: userId || null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  }
  const result = await db.collection('menus').insertOne(doc)
  return serializeMenu({ ...doc, _id: result.insertedId })
}

export async function updateMenu(id, fields, userId) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const now = new Date()
  const update = { updatedAt: now, updatedBy: userId || null }

  if (typeof fields.name === 'string') update.name = fields.name.trim().slice(0, 100)
  if (ALLOWED_LOCATIONS.includes(fields.location)) update.location = fields.location
  if (Array.isArray(fields.items)) update.items = sanitizeItems(fields.items)

  const result = await db.collection('menus').findOneAndUpdate(
    { _id: new ObjectId(id), isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' },
  )
  return serializeMenu(result)
}

export async function deleteMenu(id, userId) {
  if (!ObjectId.isValid(id)) return false
  const db = await getMongoDb()
  const now = new Date()
  const result = await db.collection('menus').updateOne(
    { _id: new ObjectId(id), isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: now, deletedBy: userId || null, updatedAt: now } },
  )
  return result.modifiedCount > 0
}
