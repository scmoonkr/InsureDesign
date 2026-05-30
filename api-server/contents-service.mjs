import { getMongoDb } from './mongo.mjs'
import { ObjectId } from 'mongodb'
import { parseMarkdownBlocks, blocksToPlainText } from './markdown-blocks.mjs'
import { validateParsedBlocks, applyBlockDefaults } from './markdown-blocks-validator.mjs'
import { renderBlocksToHtml } from './markdown-render.mjs'
import { getMediaByIds } from './media-service.mjs'

// Walk every block node, recursing into row columns. Used for image-id collection
// and other tree-wide passes so container blocks don't hide their children.
function walkAllNodes(nodes, fn) {
  for (const n of nodes) {
    fn(n)
    if (n.type === 'row' && Array.isArray(n.props?.columns)) {
      for (const col of n.props.columns) {
        if (Array.isArray(col)) walkAllNodes(col, fn)
      }
    }
  }
}

// Collect all image IDs referenced across image-based blocks (gallery/imageGrid/slide).
// Recurses into row children so images inside columns are picked up.
export function collectImageIds(nodes) {
  const ids = new Set()
  walkAllNodes(nodes, n => {
    if (n.type === 'gallery' && Array.isArray(n.props?.imageIds)) {
      for (const id of n.props.imageIds) if (typeof id === 'string') ids.add(id)
    } else if (n.type === 'imageGrid' && Array.isArray(n.props?.items)) {
      for (const it of n.props.items) if (it && typeof it.imageId === 'string') ids.add(it.imageId)
    } else if (n.type === 'slide' && Array.isArray(n.props?.items)) {
      for (const it of n.props.items) if (it && typeof it.imageId === 'string') ids.add(it.imageId)
    } else if (n.type === 'title' && typeof n.props?.imageId === 'string' && n.props.imageId) {
      ids.add(n.props.imageId)
    } else if (n.type === 'timeline' && Array.isArray(n.props?.items)) {
      for (const it of n.props.items) {
        if (it && typeof it.imageId === 'string' && it.imageId) ids.add(it.imageId)
      }
    }
  })
  return [...ids]
}

// Collect missing imageIds for a single node against the given mediaMap.
function missingImageIdsForNode(n, mediaMap) {
  const missing = []
  const check = (id) => { if (id && !mediaMap[id]) missing.push(id) }
  if (n.type === 'gallery') (n.props?.imageIds || []).forEach(check)
  else if (n.type === 'imageGrid' || n.type === 'slide') {
    (n.props?.items || []).forEach(it => check(it?.imageId))
  } else if (n.type === 'title') {
    if (n.props?.imageId) check(n.props.imageId)
  } else if (n.type === 'timeline') {
    (n.props?.items || []).forEach(it => { if (it?.imageId) check(it.imageId) })
  }
  return missing
}

// Walk the (possibly nested) node tree and call fn(node, label) for every node,
// emitting "Block #N" or "Block #N > 컬럼 #M > Block #K" style labels so error
// messages match the validator's path format.
function walkWithLabels(nodes, fn, prefix = '') {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const label = `${prefix}Block #${i + 1}`
    fn(n, label)
    if (n.type === 'row' && Array.isArray(n.props?.columns)) {
      n.props.columns.forEach((col, c) => {
        if (Array.isArray(col)) walkWithLabels(col, fn, `${label} > 컬럼 #${c + 1} > `)
      })
    }
  }
}

// Verify every referenced imageId resolves to a media doc in the same siteId.
// Returns error array. Also annotates blocks with `_media` lookup map for the renderer.
async function validateAndEnrichImages(nodes, siteId) {
  const referenced = collectImageIds(nodes)
  if (!referenced.length) return []
  const mediaMap = await getMediaByIds(siteId, referenced)
  const errors = []
  walkWithLabels(nodes, (n, label) => {
    const missing = missingImageIdsForNode(n, mediaMap)
    if (missing.length) {
      errors.push(`${label} (${n.type}): siteId의 미디어에서 찾을 수 없는 imageId — ${missing.join(', ')}`)
    }
    // Annotate leaf blocks so the renderer can resolve image URLs.
    if (n.type !== 'row') n.props._media = mediaMap
  })
  return errors
}

// Recursively strip the transient `_media` annotation from every node.
function stripMedia(nodes) {
  return nodes.map(n => {
    let props = n.props
    if (props?._media) {
      const { _media, ...rest } = props
      props = rest
    }
    if (n.type === 'row' && Array.isArray(props?.columns)) {
      props = { ...props, columns: props.columns.map(col => stripMedia(col)) }
    }
    return props === n.props ? n : { ...n, props }
  })
}

// Dry-run for the editor preview. Returns parsed blocks + mediaMap and any
// validation errors WITHOUT throwing — letting the UI show the user what's wrong.
export async function previewMarkdown(markdown, siteId, { allowedBlocks } = {}) {
  const parsed = parseMarkdownBlocks(markdown || '')
  const schemaErrors = validateParsedBlocks(parsed, { allowedBlocks })
  const withDefaults = applyBlockDefaults(parsed)
  const ids = collectImageIds(withDefaults)
  const mediaMap = (siteId && ids.length) ? await getMediaByIds(siteId, ids) : {}

  // Image siteId mismatch detection (analogous to validateAndEnrichImages)
  const imgErrors = []
  walkWithLabels(withDefaults, (n, label) => {
    const missing = missingImageIdsForNode(n, mediaMap)
    if (missing.length) {
      imgErrors.push(`${label} (${n.type}): siteId의 미디어에서 찾을 수 없는 imageId — ${missing.join(', ')}`)
    }
  })

  const blocks = stripMedia(withDefaults)

  return {
    blocks,
    mediaMap,
    errors: [...schemaErrors, ...imgErrors],
  }
}

// Parse + validate + render markdown into the four cache fields.
// Throws Error('Block validation: ...') on invalid block usage.
async function compileMarkdown(markdown, { siteId, allowedBlocks } = {}) {
  const parsed = parseMarkdownBlocks(markdown || '')
  const errors = validateParsedBlocks(parsed, { allowedBlocks })
  if (errors.length) {
    const err = new Error(`Block validation: ${errors.join(' | ')}`)
    err.blockErrors = errors
    throw err
  }
  const withDefaults = applyBlockDefaults(parsed)

  // Image ref check + URL map (only meaningful when siteId is known)
  if (siteId) {
    const imgErrors = await validateAndEnrichImages(withDefaults, siteId)
    if (imgErrors.length) {
      const err = new Error(`Block validation: ${imgErrors.join(' | ')}`)
      err.blockErrors = imgErrors
      throw err
    }
  }

  const html = renderBlocksToHtml(withDefaults)
  const plainText = blocksToPlainText(withDefaults)
  // Strip transient _media from cached blocks (frontend re-fetches via URLs in renderer output)
  const blocks = stripMedia(withDefaults)
  return { blocks, html, plainText }
}

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
  if (status) {
    filter.status = status
  } else {
    // Default: hide trashed items (status='deleted') from the "All status" view.
    // Caller must opt-in explicitly with status='deleted' to see them.
    filter.status = { $ne: 'deleted' }
  }

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

function toObjectIdArray(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const out = []
  for (const v of input) {
    if (v instanceof ObjectId) {
      const k = v.toString()
      if (!seen.has(k)) { seen.add(k); out.push(v) }
    } else if (typeof v === 'string' && ObjectId.isValid(v)) {
      if (!seen.has(v)) { seen.add(v); out.push(new ObjectId(v)) }
    }
  }
  return out
}

export async function createContent(data, authorId) {
  const db = await getMongoDb()
  const now = new Date()

  const slugBase = data.slug ? data.slug.trim() : titleToSlug(data.title)
  const slug = await generateUniqueSlug(db, data.siteId, slugBase)

  const compiled = await compileMarkdown(data.markdown || '', { siteId: data.siteId, allowedBlocks: data.allowedBlocks })

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
    html: compiled.html,
    blocks: compiled.blocks,
    plainText: compiled.plainText,
    searchText: `${data.title} ${data.summary || ''} ${compiled.plainText}`.trim(),
    categoryIds: toObjectIdArray(data.categoryIds),
    tagIds: toObjectIdArray(data.tagIds),
    thumbnailImageId: data.thumbnailImageId && ObjectId.isValid(data.thumbnailImageId)
      ? new ObjectId(data.thumbnailImageId)
      : null,
    imageIds: [],
    status: data.status || 'draft',
    visibility: data.visibility || 'public',
    authorId: authorId || null,
    publishedAt: data.status === 'published' ? now : null,
    scheduledAt: null,
    expiredAt: null,
    meta: data.meta && typeof data.meta === 'object' ? { ...data.meta } : {},
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
    'status', 'visibility', 'thumbnailImageId', 'meta',
  ]
  const update = { updatedAt: now, updatedBy: userId || null }

  for (const key of allowed) {
    if (Object.hasOwn(fields, key)) update[key] = fields[key]
  }
  if (Object.hasOwn(fields, 'categoryIds')) update.categoryIds = toObjectIdArray(fields.categoryIds)
  if (Object.hasOwn(fields, 'tagIds')) update.tagIds = toObjectIdArray(fields.tagIds)
  if (Object.hasOwn(fields, 'thumbnailImageId')) {
    update.thumbnailImageId = fields.thumbnailImageId && ObjectId.isValid(fields.thumbnailImageId)
      ? new ObjectId(fields.thumbnailImageId)
      : null
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
  const newSummary = fields.summary !== undefined ? fields.summary : (existing.summary || '')
  const newMarkdown = fields.markdown !== undefined ? fields.markdown : existing.markdown
  const compiled = await compileMarkdown(newMarkdown, { siteId, allowedBlocks: fields.allowedBlocks })
  update.blocks = compiled.blocks
  update.html = compiled.html
  update.plainText = compiled.plainText
  update.searchText = `${newTitle} ${newSummary} ${compiled.plainText}`.trim()
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

// ── Author (own-content) API ─────────────────────────────────────────────────
// Used by /api/me/contents/* — logged-in members editing posts they authored.
// Fields manager+ controls (status, featured, categories, contentType) are
// either forced to safe defaults on create or preserved-from-existing on update.

const AUTHOR_EDITABLE_FIELDS = ['title', 'slug', 'summary', 'markdown', 'thumbnailImageId']

function isAuthorOfDoc(doc, userId) {
  if (!doc || !userId) return false
  const authorId = doc.authorId ? String(doc.authorId) : ''
  return authorId === String(userId)
}

// List posts authored by the given user. Optional contentType + status filters.
// Trashed items (status='deleted') are hidden from author lists — only managers
// see trashed items so they can decide whether to restore or hard-delete.
export async function listOwnContents(userId, {
  contentType = 'post',
  status = null,
  limit = 20,
  skip = 0,
} = {}) {
  if (!userId || !ObjectId.isValid(userId)) return { items: [], total: 0 }
  const db = await getMongoDb()
  const filter = {
    authorId: new ObjectId(userId),
    isDeleted: { $ne: true },
  }
  if (contentType) filter.contentType = contentType
  if (status) {
    filter.status = status
  } else {
    filter.status = { $ne: 'deleted' }
  }

  const [items, total] = await Promise.all([
    db.collection('contents')
      .find(filter)
      .sort({ updatedAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Math.min(Number(limit) || 20, 100))
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  return { items: items.map(serializeContent), total }
}

// Get a single own-authored content by id. Returns null if not found or not authored by user.
export async function getOwnContentById(userId, id) {
  if (!userId || !ObjectId.isValid(userId) || !ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const doc = await db.collection('contents').findOne({
    _id: new ObjectId(id),
    authorId: new ObjectId(userId),
    isDeleted: { $ne: true },
  })
  return serializeContent(doc)
}

// Create a new post authored by the given user. Forces post + draft status; ignores
// admin-only fields (featured, categoryIds, visibility, etc.).
export async function createOwnContent(siteId, userId, input) {
  if (!siteId) throw new Error('siteId required')
  if (!userId) throw new Error('userId required')
  return createContent(
    {
      siteId,
      contentType: 'post',
      title: input.title,
      slug: input.slug,
      summary: input.summary || '',
      markdown: input.markdown || '',
      thumbnailImageId: input.thumbnailImageId || null,
      tagIds: input.tagIds || [],
      categoryIds: [],   // authors cannot assign categories
      status: 'draft',   // authors start as draft; manager publishes
      visibility: 'public',
      meta: {},
    },
    userId,
  )
}

// Update only author-editable fields on the given own-authored content.
// Returns null if not found or not authored by user.
export async function updateOwnContent(userId, id, input) {
  if (!userId || !ObjectId.isValid(userId) || !ObjectId.isValid(id)) return null
  const db = await getMongoDb()
  const existing = await db.collection('contents').findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true },
  })
  if (!isAuthorOfDoc(existing, userId)) return null

  const fields = {}
  for (const k of AUTHOR_EDITABLE_FIELDS) {
    if (Object.hasOwn(input, k)) fields[k] = input[k]
  }
  if (Array.isArray(input.tagIds)) fields.tagIds = input.tagIds

  return updateContent(id, existing.siteId, fields, userId)
}
