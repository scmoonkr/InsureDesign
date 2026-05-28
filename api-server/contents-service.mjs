import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'

// ── Slug helpers ──────────────────────────────────────────────────────────────

export function titleToSlug(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    // keep ASCII word chars, Korean syllables/jamo, spaces, hyphens
    .replace(/[^\w\s가-힣ᄀ-ᇿ㄰-㆏-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled'
}

async function generateUniqueSlug(db, siteId, base, excludeId = null) {
  const buildQuery = (slug) => {
    const q = { siteId, slug, isDeleted: { $ne: true } }
    if (excludeId && ObjectId.isValid(excludeId)) q._id = { $ne: new ObjectId(excludeId) }
    return q
  }

  if (!await db.collection('contents').findOne(buildQuery(base))) return base

  for (let i = 2; i <= 100; i++) {
    const candidate = `${base}-${i}`
    if (!await db.collection('contents').findOne(buildQuery(candidate))) return candidate
  }

  return `${base}-${Date.now()}`
}

// ── Serialization ─────────────────────────────────────────────────────────────

function serializeContent(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { id: String(_id), ...rest }
}

// ── Admin CRUD ────────────────────────────────────────────────────────────────

export async function listContents(siteId, {
  contentType = null,
  status = null,
  limit = 50,
  skip = 0,
} = {}) {
  const db = await getMongoDb()
  const filter = { siteId, isDeleted: { $ne: true } }
  if (contentType) filter.contentType = contentType
  if (status) filter.status = status

  const [items, total] = await Promise.all([
    db.collection('contents')
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 50, 200))
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  return { items: items.map(serializeContent), total }
}

export async function getContentById(siteId, id) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const doc = await db.collection('contents').findOne({
    _id: new ObjectId(id),
    siteId,
    isDeleted: { $ne: true },
  })
  return serializeContent(doc)
}

export async function createContent(data, authorId) {
  const db = await getMongoDb()
  const now = new Date()

  const slugBase = data.slug ? data.slug.trim() : titleToSlug(data.title)
  const slug = await generateUniqueSlug(db, data.siteId, slugBase)

  const doc = {
    siteId: data.siteId,
    contentType: data.contentType,
    title: data.title,
    slug,
    slugBase,
    summary: data.summary || '',
    template: data.template || null,
    styleFamily: data.styleFamily || null,
    markdown: data.markdown || '',
    html: null,
    blocks: [],
    plainText: data.markdown || '',
    searchText: `${data.title} ${data.markdown || ''}`.trim(),
    categoryIds: [],
    tagIds: [],
    thumbnailImageId: null,
    imageIds: [],
    status: data.status || 'draft',
    visibility: data.visibility || 'public',
    authorId: authorId || null,
    publishedAt: data.status === 'published' ? now : null,
    scheduledAt: null,
    expiredAt: null,
    meta: {},
    revisionNo: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: authorId || null,
    updatedBy: authorId || null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
  }

  const result = await db.collection('contents').insertOne(doc)
  return serializeContent({ ...doc, _id: result.insertedId })
}

export async function updateContent(id, siteId, fields, userId) {
  if (!ObjectId.isValid(id)) return null
  const db = await getMongoDb()

  const existing = await db.collection('contents').findOne({
    _id: new ObjectId(id),
    siteId,
    isDeleted: { $ne: true },
  })
  if (!existing) return null

  // Save revision before update
  await db.collection('contentRevisions').insertOne({
    siteId,
    contentId: existing._id,
    revisionNo: existing.revisionNo || 0,
    title: existing.title,
    slug: existing.slug,
    markdown: existing.markdown,
    html: existing.html,
    blocks: existing.blocks,
    plainText: existing.plainText,
    editedBy: userId || null,
    createdAt: new Date(),
  })

  const now = new Date()
  const allowed = [
    'title', 'summary', 'markdown', 'template', 'styleFamily',
    'status', 'visibility', 'categoryIds', 'tagIds', 'thumbnailImageId', 'meta',
  ]
  const update = { updatedAt: now, updatedBy: userId || null }

  for (const key of allowed) {
    if (Object.hasOwn(fields, key)) update[key] = fields[key]
  }

  // Regenerate slug when title changes (unless explicit slug provided)
  if (fields.slug && fields.slug !== existing.slug) {
    update.slug = await generateUniqueSlug(db, siteId, fields.slug.trim(), id)
    update.slugBase = fields.slug.trim()
  } else if (fields.title && fields.title !== existing.title && !fields.slug) {
    const slugBase = titleToSlug(fields.title)
    update.slug = await generateUniqueSlug(db, siteId, slugBase, id)
    update.slugBase = slugBase
  }

  // Set publishedAt on first publish
  if (fields.status === 'published' && existing.status !== 'published') {
    update.publishedAt = now
  }

  const newTitle = fields.title !== undefined ? fields.title : existing.title
  const newMarkdown = fields.markdown !== undefined ? fields.markdown : existing.markdown
  update.plainText = newMarkdown || ''
  update.searchText = `${newTitle} ${newMarkdown || ''}`.trim()
  update.revisionNo = (existing.revisionNo || 0) + 1

  const result = await db.collection('contents').findOneAndUpdate(
    { _id: new ObjectId(id), siteId, isDeleted: { $ne: true } },
    { $set: update },
    { returnDocument: 'after' },
  )
  return serializeContent(result)
}

export async function deleteContent(id, siteId, userId) {
  if (!ObjectId.isValid(id)) return false
  const db = await getMongoDb()
  const now = new Date()
  const result = await db.collection('contents').updateOne(
    { _id: new ObjectId(id), siteId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: now, deletedBy: userId || null, updatedAt: now } },
  )
  return result.modifiedCount > 0
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function listPublicContents(siteId, {
  contentType = null,
  limit = 20,
  skip = 0,
} = {}) {
  const db = await getMongoDb()
  const filter = {
    siteId,
    status: 'published',
    visibility: 'public',
    isDeleted: { $ne: true },
  }
  if (contentType) filter.contentType = contentType

  const [items, total] = await Promise.all([
    db.collection('contents')
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 20, 100))
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  return { items: items.map(serializeContent), total }
}

export async function getPublicContentBySlug(siteId, slug) {
  const db = await getMongoDb()
  const doc = await db.collection('contents').findOne({
    siteId,
    slug,
    status: 'published',
    visibility: 'public',
    isDeleted: { $ne: true },
  })
  return serializeContent(doc)
}
