import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { ObjectId } from 'mongodb'
import { getMongoDb } from './mongo.mjs'
import { clearAuthSession, createOAuthState, getAuthSession, setAuthSession, verifyOAuthState } from './auth-session.mjs'
import { getConfig, loadEnv } from './config.mjs'
import { deleteUserById, getUserById, listUsers, updateUserProfile, upsertSocialUser } from './auth-service.mjs'
import { listMedia, createMedia, updateMediaMeta, deleteMedia, getMediaByIds } from './media-service.mjs'
import { getSiteConfig, updateSiteTheme, getSiteSettings, updateSiteSettings } from './settings-service.mjs'
import { listSites, getSiteById, getSiteByDomain, createSite, updateSite, addDomain, removeDomain } from './sites-service.mjs'
import { resolvePublicSiteId, getAdminSiteId, checkAdmin, checkSession, isSuperUser } from './middleware.mjs'
import { listContents, getContentById, createContent, updateContent, listPublicContents, getPublicContentBySlug, titleToSlug, collectImageIds, previewMarkdown, listOwnContents, getOwnContentById, createOwnContent, updateOwnContent } from './contents-service.mjs'
import { listCategories, createCategory, updateCategory, deleteCategory, getCategoryBySlug } from './categories-service.mjs'
import { listTags, findOrCreateTagsByNames, getTagBySlug, getTagsByIds } from './tags-service.mjs'
import { listMenus, createMenu, updateMenu, deleteMenu } from './menus-service.mjs'

loadEnv()

const AUTHORIZE_URLS = {
  naver: 'https://nid.naver.com/oauth2.0/authorize',
  kakao: 'https://kauth.kakao.com/oauth/authorize',
}

function getCallbackUrl(provider) {
  const config = getConfig()

  if (provider === 'naver' && config.naverCallbackUrl) {
    return config.naverCallbackUrl
  }

  if (provider === 'kakao' && config.kakaoCallbackUrl) {
    return config.kakaoCallbackUrl
  }

  return `${config.siteUrl}/auth/${provider}/callback`
}

function buildDob(birthyear, birthday) {
  if (!birthyear || !birthday) {
    return undefined
  }

  const dob = `${birthyear}-${birthday}`

  return /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : undefined
}

function normalizeGender(gender) {
  if (!gender) {
    return undefined
  }

  const value = String(gender).trim().toUpperCase()
  if (['M', 'F', 'U'].includes(value)) {
    return value
  }

  if (value === 'MALE') {
    return 'M'
  }

  if (value === 'FEMALE') {
    return 'F'
  }

  return undefined
}

function sendJson(req, res, statusCode, body) {
  applyCors(req, res)
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function sendRedirect(req, res, location) {
  applyCors(req, res)
  res.writeHead(302, { location })
  res.end()
}

function sendError(req, res, statusCode, message) {
  sendJson(req, res, statusCode, { error: message })
}

function applyCors(req, res) {
  const { allowedOrigins } = getConfig()
  const origin = req.headers.origin

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('access-control-allow-credentials', 'true')
    res.setHeader('vary', 'Origin')
  }

  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type,x-site-host,x-admin-site')
}

async function readJsonBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function validateSiteInput(input, requireSiteId = true) {
  const siteId = typeof input.siteId === 'string' ? input.siteId.trim() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''

  if (requireSiteId) {
    if (!siteId || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(siteId) || siteId.length > 64) {
      return { error: 'siteId must be 2-64 lowercase alphanumeric characters and hyphens.' }
    }
  }

  if (!name || name.length > 100) {
    return { error: 'name must be between 1 and 100 characters.' }
  }

  const status = ['active', 'disabled', 'maintenance'].includes(input.status) ? input.status : 'active'
  const locale = typeof input.locale === 'string' ? input.locale.slice(0, 10) : 'ko'
  const timezone = typeof input.timezone === 'string' ? input.timezone.slice(0, 50) : 'Asia/Seoul'
  const themeId = typeof input.themeId === 'string' ? input.themeId.slice(0, 64) : 'default'
  const primaryDomain = typeof input.primaryDomain === 'string' ? input.primaryDomain.trim().toLowerCase() : null

  return { value: { siteId, name, status, locale, timezone, themeId, primaryDomain } }
}

function validateDomainInput(input) {
  const host = typeof input.host === 'string' ? input.host.trim().toLowerCase() : ''
  if (!host || host.length > 253) {
    return { error: 'host is required (max 253 characters).' }
  }
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(host)) {
    return { error: 'host must be a valid hostname.' }
  }
  return {
    value: {
      host,
      isPrimary: input.isPrimary === true,
      status: input.status || 'active',
    },
  }
}

function validateProfileInput(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const nickname = typeof input.nickname === 'string' ? input.nickname.trim() : ''
  const gender = typeof input.gender === 'string' ? input.gender.trim().toUpperCase() : ''
  const dob = typeof input.dob === 'string' ? input.dob.trim() : ''
  const avatarUrl = typeof input.avatarUrl === 'string' ? input.avatarUrl.trim() : ''
  const status = typeof input.status === 'string' ? input.status.trim() : ''

  if (!name || name.length > 80) {
    return { error: 'Name must be between 1 and 80 characters.' }
  }

  if (nickname.length > 80) {
    return { error: 'Nickname must be 80 characters or less.' }
  }

  if (gender && !['M', 'F', 'U'].includes(gender)) {
    return { error: 'Gender must be M, F, or U.' }
  }

  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return { error: 'DOB must use YYYY-MM-DD format.' }
  }

  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Avatar URL must start with http:// or https://.' }
      }
    } catch {
      return { error: 'Avatar URL is invalid.' }
    }
  }

  if (status && !['active', 'blocked', 'pending'].includes(status)) {
    return { error: 'Status must be active, blocked, or pending.' }
  }

  const value = {
    name,
    nickname,
    gender,
    dob,
    avatarUrl,
  }

  if (Object.hasOwn(input, 'status')) {
    value.status = status
  }

  return {
    value,
  }
}

// /api/auth/me — session payload + fresh roles from DB so the client can gate UI.
async function handleAuthMe(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendJson(req, res, 200, { user: null })
    return
  }
  const user = await getUserById(session.id)
  if (!user || user.status !== 'active') {
    sendJson(req, res, 200, { user: null })
    return
  }
  sendJson(req, res, 200, {
    user: {
      ...session,
      roles: user.roles || [],
      status: user.status,
    },
  })
}

async function handleGetMyProfile(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const user = await getUserById(session.id)
  if (!user) {
    clearAuthSession(res)
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleUpdateMyProfile(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)
  const validation = validateProfileInput(input)

  if (validation.error) {
    sendError(req, res, 400, validation.error)
    return
  }

  const user = await updateUserProfile(session.id, validation.value)
  if (!user) {
    clearAuthSession(res)
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  setAuthSession(res, {
    id: user.id,
    provider: user.provider,
    providerId: user.providerId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  })
  sendJson(req, res, 200, { user })
}

async function handleListBackendUsers(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const users = await listUsers({ limit: 200 })
  sendJson(req, res, 200, { users })
}

async function handleGetBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const user = await getUserById(userId)
  if (!user) {
    sendError(req, res, 404, 'User not found')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleUpdateBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)
  const validation = validateProfileInput(input)

  if (validation.error) {
    sendError(req, res, 400, validation.error)
    return
  }

  const user = await updateUserProfile(userId, validation.value)
  if (!user) {
    sendError(req, res, 404, 'User not found')
    return
  }

  sendJson(req, res, 200, { user })
}

async function handleDeleteBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const deleted = await deleteUserById(userId)
  if (!deleted) {
    sendError(req, res, 404, 'User not found')
    return
  }

  sendJson(req, res, 200, { ok: true })
}

// ── Media: helpers ──────────────────────────────────────────────────────────

async function readRawBody(req, maxBytes) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) {
      throw Object.assign(new Error('Request too large'), { statusCode: 413 })
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function getMultipartBoundary(contentType) {
  if (!contentType) return null
  const m = contentType.match(/;\s*boundary=(?:"([^"]*)"|([^\s;]*))/i)
  return m?.[1] || m?.[2] || null
}

function parseMultipart(body, boundary) {
  const parts = []
  const boundaryBuf = Buffer.from(`\r\n--${boundary}`)
  const startBuf = Buffer.from(`--${boundary}\r\n`)

  let pos = body.indexOf(startBuf)
  if (pos === -1) return parts
  pos += startBuf.length

  while (pos < body.length) {
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), pos)
    if (headerEnd === -1) break

    const headerText = body.slice(pos, headerEnd).toString('utf8')
    pos = headerEnd + 4

    const next = body.indexOf(boundaryBuf, pos)
    if (next === -1) break

    const data = body.slice(pos, next)
    pos = next + boundaryBuf.length

    const headers = {}
    for (const line of headerText.split('\r\n')) {
      const ci = line.indexOf(':')
      if (ci === -1) continue
      headers[line.slice(0, ci).trim().toLowerCase()] = line.slice(ci + 1).trim()
    }

    const disp = headers['content-disposition'] || ''
    const nameM = disp.match(/;\s*name="([^"]*)"/)
    const filenameM = disp.match(/;\s*filename="([^"]*)"/)

    parts.push({
      name: nameM?.[1] || '',
      filename: filenameM?.[1] || null,
      contentType: headers['content-type'] || null,
      data,
    })

    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) break
    if (body[pos] === 0x0d && body[pos + 1] === 0x0a) pos += 2
    else break
  }

  return parts
}

function buildUploadPaths(uploadDir, siteId, originalName, hash) {
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = hash.slice(0, 2)
  const ext = path.extname(originalName).toLowerCase() || ''
  const base = path.basename(originalName, ext)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
  const uid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const filename = `${uid}-${base}${ext}`
  const relPath = `sites/${siteId}/${yyyy}/${mm}/${prefix}/${filename}`
  return {
    fullDir: path.resolve(uploadDir, 'sites', siteId, yyyy, mm, prefix),
    fullPath: path.resolve(uploadDir, 'sites', siteId, yyyy, mm, prefix, filename),
    urlPath: `/uploads/${relPath}`,
  }
}

function safeJoinPath(base, sub) {
  const full = path.resolve(base, sub)
  const resolved = path.resolve(base)
  return full.startsWith(resolved + path.sep) ? full : null
}

const UPLOAD_MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
}

const ALLOWED_UPLOAD_MIME = /^(image\/(jpeg|png|gif|webp|svg\+xml)|video\/(mp4|webm))$/

// ── Media: route handlers ────────────────────────────────────────────────────

async function handleStaticUpload(req, res, reqPath) {
  const { uploadDir } = getConfig()
  const sub = decodeURIComponent(reqPath.slice('/uploads/'.length))
  const fullPath = safeJoinPath(uploadDir, sub)

  if (!fullPath) {
    sendError(req, res, 403, 'Forbidden')
    return
  }

  let stat
  try {
    stat = await fs.promises.stat(fullPath)
  } catch {
    sendError(req, res, 404, 'Not found')
    return
  }

  if (!stat.isFile()) {
    sendError(req, res, 404, 'Not found')
    return
  }

  const ext = path.extname(fullPath).toLowerCase()
  const mimeType = UPLOAD_MIME_TYPES[ext] || 'application/octet-stream'

  applyCors(req, res)
  res.writeHead(200, {
    'content-type': mimeType,
    'content-length': stat.size,
    'cache-control': 'public, max-age=31536000, immutable',
  })
  fs.createReadStream(fullPath).pipe(res)
}

async function handleListMedia(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const { apiBase } = getConfig()
  const siteId = getAdminSiteId(req, new URL(req.url || '/', getConfig().apiBase))
  const items = await listMedia(siteId)
  const result = items.map(item => ({
    ...item,
    paths: item.paths?.original
      ? { ...item.paths, original: `${apiBase}${item.paths.original}` }
      : item.paths,
  }))

  sendJson(req, res, 200, { items: result })
}

async function handleUploadMedia(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }
  const siteId = getAdminSiteId(req, new URL(req.url || '/', getConfig().apiBase))
  await processMediaUpload(req, res, session, siteId)
}

// Shared multipart-upload core used by both admin and author (/api/me) endpoints.
// Parses parts, persists to disk, creates media docs under the given siteId.
async function processMediaUpload(req, res, session, siteId) {
  const contentType = req.headers['content-type'] || ''
  const boundary = getMultipartBoundary(contentType)
  if (!boundary) {
    sendError(req, res, 400, 'Expected multipart/form-data')
    return
  }

  let body
  try {
    body = await readRawBody(req, 256 * 1024 * 1024)
  } catch {
    sendError(req, res, 413, 'Request entity too large')
    return
  }

  const parts = parseMultipart(body, boundary).filter(p => p.filename && p.data.length > 0)
  if (!parts.length) {
    sendError(req, res, 400, 'No files found')
    return
  }

  const { uploadDir, apiBase } = getConfig()
  const savedItems = []

  for (const part of parts) {
    const mimeType = part.contentType?.split(';')[0].trim() || ''
    if (!ALLOWED_UPLOAD_MIME.test(mimeType)) continue

    const hash = createHash('sha256').update(part.data).digest('hex')
    const { fullDir, fullPath, urlPath } = buildUploadPaths(
      uploadDir, siteId, part.filename, hash,
    )

    await mkdir(fullDir, { recursive: true })
    await writeFile(fullPath, part.data)

    const title = path.basename(part.filename, path.extname(part.filename))

    const item = await createMedia({
      siteId,
      title,
      originalName: part.filename,
      filename: path.basename(fullPath),
      mimeType,
      size: part.data.length,
      hash,
      paths: { original: urlPath },
      uploadedBy: session.id,
    })

    savedItems.push({
      ...item,
      paths: { ...item.paths, original: `${apiBase}${item.paths.original}` },
    })
  }

  sendJson(req, res, 200, { items: savedItems })
}

async function handleUpdateMedia(req, res, mediaId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)
  const item = await updateMediaMeta(mediaId, input)
  if (!item) {
    sendError(req, res, 404, 'Media not found')
    return
  }

  const { apiBase } = getConfig()
  sendJson(req, res, 200, {
    item: {
      ...item,
      paths: item.paths?.original
        ? { ...item.paths, original: `${apiBase}${item.paths.original}` }
        : item.paths,
    },
  })
}

async function handleDeleteMedia(req, res, mediaId, url) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const siteId = getAdminSiteId(req, url)
  const deleted = await deleteMedia(mediaId, siteId, session.id)
  if (!deleted) {
    sendError(req, res, 404, 'Media not found')
    return
  }

  sendJson(req, res, 200, { ok: true })
}

// ── Categories ───────────────────────────────────────────────────────────────

async function handleListCategories(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const siteId = getAdminSiteId(req, url)
  const items = await listCategories(siteId)
  sendJson(req, res, 200, { items })
}

function validateCategoryName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed || trimmed.length > 60) return null
  return trimmed
}

async function handleCreateCategory(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const input = await readJsonBody(req)
  const name = validateCategoryName(input.name)
  if (!name) { sendError(req, res, 400, 'name must be 1-60 characters'); return }

  const siteId = getAdminSiteId(req, url)
  try {
    const item = await createCategory({
      siteId,
      name,
      slug: input.slug,
      parentId: input.parentId || null,
      order: input.order,
    }, session.id)
    sendJson(req, res, 201, { item })
  } catch (err) {
    sendError(req, res, 400, err instanceof Error ? err.message : 'Failed to create category')
  }
}

async function handleUpdateCategory(req, res, categoryId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const input = await readJsonBody(req)
  const siteId = getAdminSiteId(req, url)

  if (input.name !== undefined) {
    const name = validateCategoryName(input.name)
    if (!name) { sendError(req, res, 400, 'name must be 1-60 characters'); return }
    input.name = name
  }

  try {
    const item = await updateCategory(categoryId, siteId, input, session.id)
    if (!item) { sendError(req, res, 404, 'Category not found'); return }
    sendJson(req, res, 200, { item })
  } catch (err) {
    sendError(req, res, 400, err instanceof Error ? err.message : 'Failed to update category')
  }
}

async function handleListTags(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const siteId = getAdminSiteId(req, url)
  const items = await listTags(siteId)
  sendJson(req, res, 200, { items })
}

// ── Menus ────────────────────────────────────────────────────────────────────

// Public: resolve a menu by location to ready-to-render NavItem tree.
// Drops draft/deleted references silently so the public nav stays clean.
async function handlePublicMenu(req, res, location) {
  const siteId = await resolvePublicSiteId(req)
  const db = await getMongoDb()
  const doc = await db.collection('menus').findOne({
    siteId, location, isDeleted: { $ne: true },
  })
  if (!doc) { sendJson(req, res, 200, { menu: null }); return }

  // Collect contentIds + categoryIds across the tree for batch lookup
  const contentIds = new Set()
  const categoryIds = new Set()
  const walk = (arr) => {
    for (const it of arr || []) {
      if ((it.type === 'page' || it.type === 'post') && it.contentId) contentIds.add(String(it.contentId))
      else if (it.type === 'category' && it.categoryId) categoryIds.add(String(it.categoryId))
      if (it.children?.length) walk(it.children)
    }
  }
  walk(doc.items)

  const [contentDocs, categoryDocs] = await Promise.all([
    contentIds.size
      ? db.collection('contents').find(
          {
            _id: { $in: [...contentIds].map(id => new ObjectId(id)) },
            siteId,
            isDeleted: { $ne: true },
            status: 'published',
            visibility: 'public',
          },
          { projection: { slug: 1, contentType: 1 } },
        ).toArray()
      : [],
    categoryIds.size
      ? db.collection('categories').find(
          { _id: { $in: [...categoryIds].map(id => new ObjectId(id)) }, siteId, isDeleted: { $ne: true } },
          { projection: { slug: 1 } },
        ).toArray()
      : [],
  ])

  const contentMap = new Map(contentDocs.map(c => [String(c._id), c]))
  const categoryMap = new Map(categoryDocs.map(c => [String(c._id), c]))

  const resolveTree = (arr) => {
    const out = []
    for (const it of arr || []) {
      if (it.isVisible === false) continue
      let url = ''
      let ok = false
      if (it.type === 'page' || it.type === 'post') {
        const c = contentMap.get(String(it.contentId))
        if (c) { url = `/${c.contentType}/${c.slug}`; ok = true }
      } else if (it.type === 'category') {
        const c = categoryMap.get(String(it.categoryId))
        if (c) { url = `/categories/${c.slug}`; ok = true }
      } else if (it.type === 'url') {
        // empty URL is allowed — renders as non-clickable 대표메뉴 (section header)
        url = it.url || ''
        ok = true
      }
      if (!ok) continue
      out.push({
        id: it.id,
        title: it.title,
        url,
        target: it.target || 'self',
        children: resolveTree(it.children),
      })
    }
    return out
  }

  sendJson(req, res, 200, {
    menu: {
      id: String(doc._id),
      name: doc.name,
      location: doc.location,
      items: resolveTree(doc.items),
    },
  })
}

async function handleListMenus(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const siteId = getAdminSiteId(req, url)
  const items = await listMenus(siteId)
  sendJson(req, res, 200, { items })
}

async function handleCreateMenu(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const input = await readJsonBody(req)
  if (!input.name || typeof input.name !== 'string') {
    sendError(req, res, 400, 'name is required'); return
  }
  const siteId = getAdminSiteId(req, url)
  const menu = await createMenu({
    siteId, name: input.name, location: input.location, items: input.items,
  }, session.id)
  sendJson(req, res, 201, { menu })
}

async function handleUpdateMenu(req, res, menuId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const input = await readJsonBody(req)
  const siteId = getAdminSiteId(req, url)
  const menu = await updateMenu(menuId, siteId, input, session.id)
  if (!menu) { sendError(req, res, 404, 'Menu not found'); return }
  sendJson(req, res, 200, { menu })
}

async function handleDeleteMenu(req, res, menuId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const siteId = getAdminSiteId(req, url)
  const deleted = await deleteMenu(menuId, siteId, session.id)
  if (!deleted) { sendError(req, res, 404, 'Menu not found'); return }
  sendJson(req, res, 200, { ok: true })
}

async function handleDeleteCategory(req, res, categoryId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const siteId = getAdminSiteId(req, url)
  const result = await deleteCategory(categoryId, siteId, session.id)
  if (!result.ok) {
    if (result.reason === 'has-children') {
      sendError(req, res, 409, '하위 카테고리가 있어 삭제할 수 없습니다.')
      return
    }
    if (result.reason === 'has-contents') {
      sendError(req, res, 409, '연결된 콘텐츠가 있어 삭제할 수 없습니다.')
      return
    }
    sendError(req, res, 404, 'Category not found')
    return
  }
  sendJson(req, res, 200, { ok: true })
}

// ── Sites CRUD ───────────────────────────────────────────────────────────────

async function handleListSites(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const user = await getUserById(auth.session.id)
  if (!user || user.status !== 'active') { sendError(req, res, 401, 'Unauthorized'); return }

  const isSuper = isSuperUser(user.roles || [])
  let sites
  if (isSuper) {
    sites = await listSites()
  } else {
    const siteIds = [...new Set((user.roles || []).map(r => r.siteId).filter(Boolean))]
    const results = await Promise.all(siteIds.map(id => getSiteById(id)))
    sites = results.filter(Boolean)
  }

  sendJson(req, res, 200, { sites, isSuper })
}

async function handleCreateSite(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const user = await getUserById(auth.session.id)
  if (!user || user.status !== 'active') { sendError(req, res, 401, 'Unauthorized'); return }
  if (!isSuperUser(user.roles || [])) { sendError(req, res, 403, 'Super role required to create sites'); return }

  const input = await readJsonBody(req)
  const validation = validateSiteInput(input)
  if (validation.error) { sendError(req, res, 400, validation.error); return }

  try {
    const site = await createSite(validation.value)
    sendJson(req, res, 201, { site })
  } catch (err) {
    sendError(req, res, err.statusCode || 500, err.message)
  }
}

async function handleGetSite(req, res, siteId) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const site = await getSiteById(siteId)
  if (!site) { sendError(req, res, 404, 'Site not found'); return }

  sendJson(req, res, 200, { site })
}

async function handleUpdateSite(req, res, siteId) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const input = await readJsonBody(req)
  const validation = validateSiteInput(input, false)
  if (validation.error) { sendError(req, res, 400, validation.error); return }

  const site = await updateSite(siteId, validation.value)
  if (!site) { sendError(req, res, 404, 'Site not found'); return }

  sendJson(req, res, 200, { site })
}

async function handleAddDomain(req, res, siteId) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const input = await readJsonBody(req)
  const validation = validateDomainInput(input)
  if (validation.error) { sendError(req, res, 400, validation.error); return }

  try {
    const site = await addDomain(siteId, validation.value)
    if (!site) { sendError(req, res, 404, 'Site not found'); return }
    sendJson(req, res, 200, { site })
  } catch (err) {
    sendError(req, res, err.statusCode || 500, err.message)
  }
}

async function handleRemoveDomain(req, res, siteId, host) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const site = await removeDomain(siteId, host)
  if (!site) { sendError(req, res, 404, 'Site not found'); return }

  sendJson(req, res, 200, { site })
}

async function handleGetSiteSettings(req, res, siteId) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const settings = await getSiteSettings(siteId)
  sendJson(req, res, 200, settings)
}

async function handleUpdateSiteSettings(req, res, siteId) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const input = await readJsonBody(req)
  const result = await updateSiteSettings(siteId, input)
  sendJson(req, res, 200, result)
}

// ── Contents ──────────────────────────────────────────────────────────────────

function validateContentInput(input) {
  const CONTENT_TYPES = ['post', 'page', 'notice', 'gallery']
  const contentType = CONTENT_TYPES.includes(input.contentType) ? input.contentType : null
  if (!contentType) return { error: `contentType must be one of: ${CONTENT_TYPES.join(', ')}.` }

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 200) return { error: 'title must be 1–200 characters.' }

  const status = ['draft', 'published', 'hidden', 'deleted'].includes(input.status) ? input.status : 'draft'
  const visibility = ['public', 'members', 'private'].includes(input.visibility) ? input.visibility : 'public'

  return {
    value: {
      contentType,
      title,
      slug: typeof input.slug === 'string' ? input.slug.trim() : '',
      summary: typeof input.summary === 'string' ? input.summary.trim().slice(0, 500) : '',
      markdown: typeof input.markdown === 'string' ? input.markdown : '',
      template: typeof input.template === 'string' ? input.template : null,
      styleFamily: typeof input.styleFamily === 'string' ? input.styleFamily : null,
      status,
      visibility,
    },
  }
}

// Admin: list contents for a siteId
async function handleListContents(req, res, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const { items, total } = await listContents(siteId, {
    contentType: url.searchParams.get('type') || null,
    status: url.searchParams.get('status') || null,
    limit: url.searchParams.get('limit') || 50,
    skip: url.searchParams.get('skip') || 0,
  })
  sendJson(req, res, 200, { items, total })
}

// Admin: create content
async function handleCreateContent(req, res, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const validation = validateContentInput(input)
  if (validation.error) { sendError(req, res, 400, validation.error); return }

  const tagIds = await findOrCreateTagsByNames(siteId, input.tagNames, auth.user.id)
  const categoryIds = Array.isArray(input.categoryIds) ? input.categoryIds : []
  const meta = { ...(input.meta && typeof input.meta === 'object' ? input.meta : {}) }
  if (Object.hasOwn(input, 'featured')) meta.featured = !!input.featured

  try {
    const content = await createContent(
      { ...validation.value, siteId, categoryIds, tagIds, meta, thumbnailImageId: input.thumbnailImageId || null },
      auth.user.id,
    )
    sendJson(req, res, 201, { content })
  } catch (err) {
    if (err && err.blockErrors) { sendError(req, res, 400, err.message); return }
    throw err
  }
}

// Admin: preview markdown — parse + validate + return blocks + mediaMap (no save)
async function handlePreviewContent(req, res, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const result = await previewMarkdown(input.markdown || '', siteId)

  // Apply absolute URL prefix so cross-origin browsers can load images
  const { apiBase } = getConfig()
  for (const id of Object.keys(result.mediaMap)) {
    const item = result.mediaMap[id]
    if (item?.paths?.original?.startsWith('/uploads/')) {
      result.mediaMap[id] = {
        ...item,
        paths: { ...item.paths, original: `${apiBase}${item.paths.original}` },
      }
    }
  }

  sendJson(req, res, 200, result)
}

// Admin: get single content
async function handleGetContent(req, res, contentId, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const content = await getContentById(siteId, contentId)
  if (!content) { sendError(req, res, 404, 'Content not found'); return }

  sendJson(req, res, 200, { content })
}

// Admin: update content
async function handleUpdateContent(req, res, contentId, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const fields = { ...input }

  if (Array.isArray(input.tagNames)) {
    fields.tagIds = await findOrCreateTagsByNames(siteId, input.tagNames, auth.user.id)
    delete fields.tagNames
  }

  if (Object.hasOwn(input, 'featured')) {
    const base = (input.meta && typeof input.meta === 'object') ? input.meta : {}
    fields.meta = { ...base, featured: !!input.featured }
    delete fields.featured
  }

  try {
    const content = await updateContent(contentId, siteId, fields, auth.user.id)
    if (!content) { sendError(req, res, 404, 'Content not found'); return }
    sendJson(req, res, 200, { content })
  } catch (err) {
    if (err && err.blockErrors) { sendError(req, res, 400, err.message); return }
    throw err
  }
}

// Admin: "delete" content — sets status='deleted' (trash-bin behavior). The item
// stays in the DB and can be restored by changing its status back via the editor.
async function handleDeleteContent(req, res, contentId, url) {
  const siteId = getAdminSiteId(req, url)
  const auth = await checkAdmin(req, siteId, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  try {
    const content = await updateContent(contentId, siteId, { status: 'deleted' }, auth.user.id)
    if (!content) { sendError(req, res, 404, 'Content not found'); return }
    sendJson(req, res, 200, { ok: true })
  } catch (err) {
    if (err && err.blockErrors) { sendError(req, res, 400, err.message); return }
    throw err
  }
}

// ── /api/me/contents — author-scoped (logged-in users editing own posts) ────

async function handleListOwnContents(req, res, url) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }
  const result = await listOwnContents(auth.session.id, {
    contentType: url.searchParams.get('type') || 'post',
    status: url.searchParams.get('status') || null,
    limit: url.searchParams.get('limit') || 20,
    skip: url.searchParams.get('skip') || 0,
  })
  sendJson(req, res, 200, result)
}

async function handleGetOwnContent(req, res, contentId) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }
  const content = await getOwnContentById(auth.session.id, contentId)
  if (!content) { sendError(req, res, 404, 'Content not found'); return }
  // Enrich with tag names so the author editor can populate its input without
  // a separate /api/admin/tags fetch (which authors can't reach).
  const tags = await getTagsByIds(content.siteId, content.tagIds || [])
  sendJson(req, res, 200, { content: { ...content, tagNames: tags.map(t => t.name) } })
}

async function handleCreateOwnContent(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }
  const siteId = await resolvePublicSiteId(req)

  const input = await readJsonBody(req)
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 200) { sendError(req, res, 400, 'title must be 1–200 characters.'); return }

  const tagIds = Array.isArray(input.tagNames) && input.tagNames.length
    ? await findOrCreateTagsByNames(siteId, input.tagNames, auth.session.id)
    : []

  try {
    const content = await createOwnContent(siteId, auth.session.id, {
      title,
      slug: typeof input.slug === 'string' ? input.slug.trim() : '',
      summary: typeof input.summary === 'string' ? input.summary.trim().slice(0, 500) : '',
      markdown: typeof input.markdown === 'string' ? input.markdown : '',
      thumbnailImageId: input.thumbnailImageId || null,
      tagIds,
    })
    sendJson(req, res, 201, { content })
  } catch (err) {
    if (err && err.blockErrors) { sendError(req, res, 400, err.message); return }
    throw err
  }
}

async function handleUpdateOwnContent(req, res, contentId) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const existing = await getOwnContentById(auth.session.id, contentId)
  if (!existing) { sendError(req, res, 404, 'Content not found'); return }

  const input = await readJsonBody(req)
  const fields = {}
  if (typeof input.title === 'string') fields.title = input.title.trim().slice(0, 200)
  if (typeof input.slug === 'string') fields.slug = input.slug.trim()
  if (typeof input.summary === 'string') fields.summary = input.summary.trim().slice(0, 500)
  if (typeof input.markdown === 'string') fields.markdown = input.markdown
  if (Object.hasOwn(input, 'thumbnailImageId')) {
    fields.thumbnailImageId = input.thumbnailImageId || null
  }
  if (Array.isArray(input.tagNames)) {
    fields.tagIds = await findOrCreateTagsByNames(existing.siteId, input.tagNames, auth.session.id)
  }

  try {
    const content = await updateOwnContent(auth.session.id, contentId, fields)
    if (!content) { sendError(req, res, 404, 'Content not found'); return }
    sendJson(req, res, 200, { content })
  } catch (err) {
    if (err && err.blockErrors) { sendError(req, res, 400, err.message); return }
    throw err
  }
}

async function handlePreviewOwnContent(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }
  const siteId = await resolvePublicSiteId(req)

  const input = await readJsonBody(req)
  const result = await previewMarkdown(input.markdown || '', siteId)

  const { apiBase } = getConfig()
  for (const id of Object.keys(result.mediaMap)) {
    const item = result.mediaMap[id]
    if (item?.paths?.original?.startsWith('/uploads/')) {
      result.mediaMap[id] = {
        ...item,
        paths: { ...item.paths, original: `${apiBase}${item.paths.original}` },
      }
    }
  }
  sendJson(req, res, 200, result)
}

// /api/me/media — list + upload scoped to the current site (resolved from request).
async function handleListOwnMedia(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }
  const siteId = await resolvePublicSiteId(req)
  const { apiBase } = getConfig()
  const items = await listMedia(siteId)
  const result = items.map(item => ({
    ...item,
    paths: item.paths?.original
      ? { ...item.paths, original: `${apiBase}${item.paths.original}` }
      : item.paths,
  }))
  sendJson(req, res, 200, { items: result })
}

async function handleUploadOwnMedia(req, res) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const siteId = await resolvePublicSiteId(req)
  await processMediaUpload(req, res, session, siteId)
}

// Public: list published contents in a category — returns category + items + maps in one round trip
async function handlePublicCategoryPage(req, res, url, slug) {
  const siteId = await resolvePublicSiteId(req)
  const category = await getCategoryBySlug(siteId, slug)
  if (!category) { sendError(req, res, 404, 'Category not found'); return }

  const db = await getMongoDb()
  const wantType = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const skip = Number(url.searchParams.get('skip')) || 0

  const filter = {
    siteId,
    status: 'published',
    visibility: 'public',
    isDeleted: { $ne: true },
    categoryIds: new ObjectId(category.id),
  }
  if (wantType) filter.contentType = wantType

  const [docs, total] = await Promise.all([
    db.collection('contents').find(filter, {
      projection: {
        title: 1, slug: 1, summary: 1, contentType: 1, publishedAt: 1, updatedAt: 1,
        thumbnailImageId: 1, authorId: 1, meta: 1,
      },
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .skip(skip).limit(limit)
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  // Batch lookup thumbnails + authors
  const thumbIds = new Set()
  const authorIds = new Set()
  for (const d of docs) {
    if (d.thumbnailImageId) thumbIds.add(String(d.thumbnailImageId))
    if (d.authorId) authorIds.add(String(d.authorId))
  }

  const mediaMap = thumbIds.size ? await getMediaByIds(siteId, [...thumbIds]) : {}
  const authorMap = {}
  if (authorIds.size) {
    const authors = await db.collection('users').find(
      { _id: { $in: [...authorIds].map(id => new ObjectId(id)) }, isDeleted: { $ne: true } },
      { projection: { name: 1, nickname: 1, avatarUrl: 1 } },
    ).toArray()
    for (const u of authors) {
      authorMap[String(u._id)] = {
        id: String(u._id),
        name: u.nickname || u.name || '',
        avatarUrl: u.avatarUrl || '',
      }
    }
  }

  const { apiBase } = getConfig()
  for (const id of Object.keys(mediaMap)) {
    const item = mediaMap[id]
    if (item?.paths?.original?.startsWith('/uploads/')) {
      mediaMap[id] = { ...item, paths: { ...item.paths, original: `${apiBase}${item.paths.original}` } }
    }
  }

  const items = docs.map(d => ({
    id: String(d._id),
    title: d.title,
    slug: d.slug,
    summary: d.summary || '',
    contentType: d.contentType,
    publishedAt: d.publishedAt,
    updatedAt: d.updatedAt,
    thumbnailImageId: d.thumbnailImageId ? String(d.thumbnailImageId) : null,
    authorId: d.authorId ? String(d.authorId) : null,
    meta: d.meta || {},
  }))

  sendJson(req, res, 200, { category, items, total, mediaMap, authorMap })
}

// Public: list published contents tagged with a given slug — same shape as the category page.
async function handlePublicTagPage(req, res, url, slug) {
  const siteId = await resolvePublicSiteId(req)
  const tag = await getTagBySlug(siteId, slug)
  if (!tag) { sendError(req, res, 404, 'Tag not found'); return }

  const db = await getMongoDb()
  const wantType = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const skip = Number(url.searchParams.get('skip')) || 0

  const filter = {
    siteId,
    status: 'published',
    visibility: 'public',
    isDeleted: { $ne: true },
    tagIds: new ObjectId(tag.id),
  }
  if (wantType) filter.contentType = wantType

  const [docs, total] = await Promise.all([
    db.collection('contents').find(filter, {
      projection: {
        title: 1, slug: 1, summary: 1, contentType: 1, publishedAt: 1, updatedAt: 1,
        thumbnailImageId: 1, authorId: 1, meta: 1,
      },
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .skip(skip).limit(limit)
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  const thumbIds = new Set()
  const authorIds = new Set()
  for (const d of docs) {
    if (d.thumbnailImageId) thumbIds.add(String(d.thumbnailImageId))
    if (d.authorId) authorIds.add(String(d.authorId))
  }

  const mediaMap = thumbIds.size ? await getMediaByIds(siteId, [...thumbIds]) : {}
  const authorMap = {}
  if (authorIds.size) {
    const authors = await db.collection('users').find(
      { _id: { $in: [...authorIds].map(id => new ObjectId(id)) }, isDeleted: { $ne: true } },
      { projection: { name: 1, nickname: 1, avatarUrl: 1 } },
    ).toArray()
    for (const u of authors) {
      authorMap[String(u._id)] = {
        id: String(u._id),
        name: u.nickname || u.name || '',
        avatarUrl: u.avatarUrl || '',
      }
    }
  }

  const { apiBase } = getConfig()
  for (const id of Object.keys(mediaMap)) {
    const item = mediaMap[id]
    if (item?.paths?.original?.startsWith('/uploads/')) {
      mediaMap[id] = { ...item, paths: { ...item.paths, original: `${apiBase}${item.paths.original}` } }
    }
  }

  const items = docs.map(d => ({
    id: String(d._id),
    title: d.title,
    slug: d.slug,
    summary: d.summary || '',
    contentType: d.contentType,
    publishedAt: d.publishedAt,
    updatedAt: d.updatedAt,
    thumbnailImageId: d.thumbnailImageId ? String(d.thumbnailImageId) : null,
    authorId: d.authorId ? String(d.authorId) : null,
    meta: d.meta || {},
  }))

  sendJson(req, res, 200, { tag, items, total, mediaMap, authorMap })
}

// Public: list published contents
async function handlePublicListContents(req, res, url) {
  const siteId = await resolvePublicSiteId(req)
  const { items, total } = await listPublicContents(siteId, {
    contentType: url.searchParams.get('type') || null,
    limit: url.searchParams.get('limit') || 20,
    skip: url.searchParams.get('skip') || 0,
  })
  sendJson(req, res, 200, { items, total })
}

// Public: published posts as card data — filtered by category and/or tag slugs.
// Used by the `postList` block (always queries fresh, never relies on cached html).
async function handlePublicPostCards(req, res, url) {
  const siteId = await resolvePublicSiteId(req)
  const parseCsv = s => String(s || '').split(',').map(t => t.trim()).filter(Boolean)
  const categorySlugs = parseCsv(url.searchParams.get('categories'))
  const tagSlugs = parseCsv(url.searchParams.get('tags'))
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 6, 1), 24)

  const db = await getMongoDb()

  // Resolve slugs → ObjectIds (silently drop unknown slugs so a typo doesn't 500).
  const [catDocs, tagDocs] = await Promise.all([
    categorySlugs.length
      ? db.collection('categories').find(
          { siteId, slug: { $in: categorySlugs }, isDeleted: { $ne: true } },
          { projection: { _id: 1 } },
        ).toArray()
      : [],
    tagSlugs.length
      ? db.collection('tags').find(
          { siteId, slug: { $in: tagSlugs }, isDeleted: { $ne: true } },
          { projection: { _id: 1 } },
        ).toArray()
      : [],
  ])

  const filter = {
    siteId,
    contentType: 'post',
    status: 'published',
    visibility: 'public',
    isDeleted: { $ne: true },
  }
  if (categorySlugs.length) {
    if (!catDocs.length) { sendJson(req, res, 200, { items: [] }); return }
    filter.categoryIds = { $in: catDocs.map(d => d._id) }
  }
  if (tagSlugs.length) {
    if (!tagDocs.length) { sendJson(req, res, 200, { items: [] }); return }
    filter.tagIds = { $in: tagDocs.map(d => d._id) }
  }

  const posts = await db.collection('contents')
    .find(filter, {
      projection: {
        title: 1, slug: 1, summary: 1, publishedAt: 1, thumbnailImageId: 1,
        authorId: 1, meta: 1,
      },
    })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray()

  // Enrich: thumbnails + authors in one batch each.
  const thumbIds = posts.map(p => p.thumbnailImageId).filter(Boolean)
  const authorIds = [...new Set(posts.map(p => p.authorId).filter(Boolean).map(id => String(id)))]
    .map(id => new ObjectId(id))

  const [mediaDocs, authorDocs] = await Promise.all([
    thumbIds.length
      ? db.collection('media').find(
          { _id: { $in: thumbIds } },
          { projection: { paths: 1, alt: 1, title: 1 } },
        ).toArray()
      : [],
    authorIds.length
      ? db.collection('users').find(
          { _id: { $in: authorIds }, isDeleted: { $ne: true } },
          { projection: { name: 1, nickname: 1, avatarUrl: 1 } },
        ).toArray()
      : [],
  ])

  const { apiBase } = getConfig()
  const mediaById = {}
  for (const m of mediaDocs) {
    const raw = m.paths?.original || ''
    mediaById[String(m._id)] = raw.startsWith('/uploads/') ? `${apiBase}${raw}` : raw
  }
  const authorById = {}
  for (const u of authorDocs) {
    authorById[String(u._id)] = {
      id: String(u._id),
      name: u.nickname || u.name || '',
      avatarUrl: u.avatarUrl || '',
    }
  }

  const items = posts.map(p => ({
    id: String(p._id),
    title: p.title || '',
    slug: p.slug || '',
    summary: p.summary || '',
    publishedAt: p.publishedAt,
    featured: !!(p.meta?.featured),
    thumbnailUrl: p.thumbnailImageId ? (mediaById[String(p.thumbnailImageId)] || '') : '',
    author: p.authorId ? (authorById[String(p.authorId)] || null) : null,
  }))

  sendJson(req, res, 200, { items })
}

// Public: get single published content by slug
async function handlePublicGetContent(req, res, slug, url) {
  const siteId = await resolvePublicSiteId(req)
  const content = await getPublicContentBySlug(siteId, slug)
  if (!content) { sendError(req, res, 404, 'Not found'); return }

  const wantType = url?.searchParams?.get('type')
  if (wantType && content.contentType !== wantType) {
    sendError(req, res, 404, 'Not found')
    return
  }

  // Bundle every media doc referenced by the article — image blocks AND featured image.
  const ids = new Set(collectImageIds(content.blocks || []))
  if (content.thumbnailImageId) ids.add(String(content.thumbnailImageId))
  const mediaMap = ids.size ? await getMediaByIds(siteId, [...ids]) : {}

  // Resolve category / tag display names so the page doesn't need extra round trips.
  const db = await getMongoDb()
  const catObjectIds = (content.categoryIds || [])
    .filter(id => ObjectId.isValid(id) || id instanceof ObjectId)
    .map(id => id instanceof ObjectId ? id : new ObjectId(id))
  const tagObjectIds = (content.tagIds || [])
    .filter(id => ObjectId.isValid(id) || id instanceof ObjectId)
    .map(id => id instanceof ObjectId ? id : new ObjectId(id))

  const [catDocs, tagDocs] = await Promise.all([
    catObjectIds.length
      ? db.collection('categories').find({ _id: { $in: catObjectIds }, siteId, isDeleted: { $ne: true } }).toArray()
      : [],
    tagObjectIds.length
      ? db.collection('tags').find({ _id: { $in: tagObjectIds }, siteId, isDeleted: { $ne: true } }).toArray()
      : [],
  ])

  const categoryLabels = catDocs.map(d => ({ id: String(d._id), name: d.name, slug: d.slug }))
  const tagLabels = tagDocs.map(d => ({ id: String(d._id), name: d.name, slug: d.slug }))

  // Resolve author display info (avoid leaking email/provider details)
  let author = null
  if (content.authorId && ObjectId.isValid(content.authorId)) {
    const u = await db.collection('users').findOne(
      { _id: new ObjectId(content.authorId), isDeleted: { $ne: true } },
      { projection: { name: 1, nickname: 1, avatarUrl: 1 } },
    )
    if (u) {
      author = {
        id: String(u._id),
        name: u.nickname || u.name || '',
        avatarUrl: u.avatarUrl || '',
      }
    }
  }

  // Rewrite local /uploads/... paths to absolute API base for cross-origin browsers.
  const { apiBase } = getConfig()
  for (const id of Object.keys(mediaMap)) {
    const item = mediaMap[id]
    if (item?.paths?.original && item.paths.original.startsWith('/uploads/')) {
      mediaMap[id] = {
        ...item,
        paths: { ...item.paths, original: `${apiBase}${item.paths.original}` },
      }
    }
  }

  sendJson(req, res, 200, { content, mediaMap, categoryLabels, tagLabels, author })
}

// ── Site config / Settings ───────────────────────────────────────────────────

async function handleGetSiteConfig(req, res) {
  const siteId = await resolvePublicSiteId(req)
  const config = await getSiteConfig(siteId)
  sendJson(req, res, 200, { theme: config.theme || 'default', siteId })
}

async function handleUpdateSiteTheme(req, res) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const { theme } = await readJsonBody(req)
  if (!theme || typeof theme !== 'string') {
    sendError(req, res, 400, 'theme is required')
    return
  }

  const siteId = getAdminSiteId(req, new URL(req.url || '/', getConfig().apiBase))
  const result = await updateSiteTheme(siteId, theme)
  sendJson(req, res, 200, result)
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function handleAuthStart(req, res, provider) {
  if (!AUTHORIZE_URLS[provider]) {
    sendError(req, res, 404, 'Unknown auth provider')
    return
  }

  const config = getConfig()
  const clientId = provider === 'naver' ? config.naverClientId : config.kakaoClientId

  if (!clientId) {
    sendError(req, res, 500, `Missing ${provider} client id`)
    return
  }

  const redirectUri = getCallbackUrl(provider)
  const state = createOAuthState(res, provider)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: String(clientId),
    redirect_uri: redirectUri,
    state,
  })

  sendRedirect(req, res, `${AUTHORIZE_URLS[provider]}?${params.toString()}`)
}

async function handleAuthCallback(req, res, provider, url) {
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''

  if (!AUTHORIZE_URLS[provider]) {
    sendError(req, res, 404, 'Unknown auth provider')
    return
  }

  if (!code || !verifyOAuthState(req, res, provider, state)) {
    sendError(req, res, 400, 'Invalid OAuth state or code')
    return
  }

  const redirectUri = getCallbackUrl(provider)
  const token = await fetchAccessToken(provider, code, state, redirectUri)
  const profile = await fetchProfile(provider, token.access_token)
  const user = await upsertSocialUser(profile)

  setAuthSession(res, {
    id: String(user._id),
    provider: profile.provider,
    providerId: profile.providerId,
    name: profile.name,
    email: profile.email,
    avatarUrl: profile.avatarUrl,
  })

  if (req.headers.accept?.includes('application/json') || url.searchParams.get('format') === 'json') {
    sendJson(req, res, 200, { ok: true, redirectUrl: `${getConfig().siteUrl}/` })
    return
  }

  sendRedirect(req, res, `${getConfig().siteUrl}/`)
}

async function fetchAccessToken(provider, code, state, redirectUri) {
  const config = getConfig()
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
  })

  if (provider === 'naver') {
    params.set('client_id', String(config.naverClientId || ''))
    params.set('client_secret', String(config.naverClientSecret || ''))
    params.set('state', state)
  } else {
    params.set('client_id', String(config.kakaoClientId || ''))
    params.set('redirect_uri', redirectUri)
    if (config.kakaoClientSecret) {
      params.set('client_secret', String(config.kakaoClientSecret))
    }
  }

  const response = await fetch(
    provider === 'naver'
      ? 'https://nid.naver.com/oauth2.0/token'
      : 'https://kauth.kakao.com/oauth/token',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: params,
    },
  )

  if (!response.ok) {
    throw new Error(`${provider} token request failed`)
  }

  return response.json()
}

async function fetchProfile(provider, accessToken) {
  if (provider === 'naver') {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error('Naver profile request failed')
    }

    const data = await response.json()

    return {
      provider,
      providerId: String(data.response.id),
      name: data.response.name || data.response.nickname || 'Naver User',
      nickname: data.response.nickname,
      email: data.response.email,
      avatarUrl: data.response.profile_image,
      gender: normalizeGender(data.response.gender),
      dob: buildDob(data.response.birthyear, data.response.birthday),
    }
  }

  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Kakao profile request failed')
  }

  const data = await response.json()

  return {
    provider,
    providerId: String(data.id),
    name:
      data.kakao_account?.profile?.nickname ||
      data.properties?.nickname ||
      'Kakao User',
    nickname:
      data.kakao_account?.profile?.nickname ||
      data.properties?.nickname,
    email: data.kakao_account?.email,
    avatarUrl:
      data.kakao_account?.profile?.thumbnail_image_url ||
      data.kakao_account?.profile?.profile_image_url ||
      data.properties?.profile_image,
    gender: normalizeGender(data.kakao_account?.gender),
  }
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', getConfig().apiBase)

  if (req.method === 'OPTIONS') {
    applyCors(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  try {
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      await handleAuthMe(req, res)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      clearAuthSession(res)
      sendJson(req, res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/users/me') {
      await handleGetMyProfile(req, res)
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/users/me') {
      await handleUpdateMyProfile(req, res)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/backend/users') {
      await handleListBackendUsers(req, res)
      return
    }

    const backendUserMatch = url.pathname.match(/^\/api\/backend\/users\/([^/]+)$/)
    if (req.method === 'GET' && backendUserMatch) {
      await handleGetBackendUser(req, res, backendUserMatch[1])
      return
    }

    if (req.method === 'PUT' && backendUserMatch) {
      await handleUpdateBackendUser(req, res, backendUserMatch[1])
      return
    }

    if (req.method === 'DELETE' && backendUserMatch) {
      await handleDeleteBackendUser(req, res, backendUserMatch[1])
      return
    }

    const authStartMatch = url.pathname.match(/^\/api\/auth\/(naver|kakao)$/)
    if (req.method === 'GET' && authStartMatch) {
      await handleAuthStart(req, res, authStartMatch[1])
      return
    }

    const authCallbackMatch = url.pathname.match(/^\/api\/auth\/(naver|kakao)\/callback$/)
    if (req.method === 'GET' && authCallbackMatch) {
      await handleAuthCallback(req, res, authCallbackMatch[1], url)
      return
    }

    // ── Admin: Contents ──────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/admin/contents') {
      await handleListContents(req, res, url)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/contents') {
      await handleCreateContent(req, res, url)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/contents/preview') {
      await handlePreviewContent(req, res, url)
      return
    }

    const adminContentMatch = url.pathname.match(/^\/api\/admin\/contents\/([^/]+)$/)
    if (adminContentMatch) {
      if (req.method === 'GET') { await handleGetContent(req, res, adminContentMatch[1], url); return }
      if (req.method === 'PUT') { await handleUpdateContent(req, res, adminContentMatch[1], url); return }
      if (req.method === 'DELETE') { await handleDeleteContent(req, res, adminContentMatch[1], url); return }
    }

    // ── /api/me: author-scoped contents + media ─────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/me/contents') {
      await handleListOwnContents(req, res, url); return
    }
    if (req.method === 'POST' && url.pathname === '/api/me/contents') {
      await handleCreateOwnContent(req, res); return
    }
    if (req.method === 'POST' && url.pathname === '/api/me/contents/preview') {
      await handlePreviewOwnContent(req, res); return
    }
    const meContentMatch = url.pathname.match(/^\/api\/me\/contents\/([^/]+)$/)
    if (meContentMatch) {
      if (req.method === 'GET') { await handleGetOwnContent(req, res, meContentMatch[1]); return }
      if (req.method === 'PUT') { await handleUpdateOwnContent(req, res, meContentMatch[1]); return }
    }
    if (req.method === 'GET' && url.pathname === '/api/me/media') {
      await handleListOwnMedia(req, res); return
    }
    if (req.method === 'POST' && url.pathname === '/api/me/media/upload') {
      await handleUploadOwnMedia(req, res); return
    }

    // ── Public: Contents ─────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/public/contents') {
      await handlePublicListContents(req, res, url)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/public/post-cards') {
      await handlePublicPostCards(req, res, url)
      return
    }

    const publicContentSlugMatch = url.pathname.match(/^\/api\/public\/contents\/([^/]+)$/)
    if (req.method === 'GET' && publicContentSlugMatch) {
      await handlePublicGetContent(req, res, decodeURIComponent(publicContentSlugMatch[1]), url)
      return
    }

    const publicCategorySlugMatch = url.pathname.match(/^\/api\/public\/categories\/([^/]+)$/)
    if (req.method === 'GET' && publicCategorySlugMatch) {
      await handlePublicCategoryPage(req, res, url, decodeURIComponent(publicCategorySlugMatch[1]))
      return
    }

    const publicTagSlugMatch = url.pathname.match(/^\/api\/public\/tags\/([^/]+)$/)
    if (req.method === 'GET' && publicTagSlugMatch) {
      await handlePublicTagPage(req, res, url, decodeURIComponent(publicTagSlugMatch[1]))
      return
    }

    const publicMenuMatch = url.pathname.match(/^\/api\/public\/menus\/([^/]+)$/)
    if (req.method === 'GET' && publicMenuMatch) {
      await handlePublicMenu(req, res, decodeURIComponent(publicMenuMatch[1]))
      return
    }

    // ── Admin: Sites ─────────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/admin/sites') {
      await handleListSites(req, res)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/sites') {
      await handleCreateSite(req, res)
      return
    }

    const adminSiteSettingsMatch = url.pathname.match(/^\/api\/admin\/sites\/([^/]+)\/settings$/)
    if (adminSiteSettingsMatch) {
      if (req.method === 'GET') { await handleGetSiteSettings(req, res, adminSiteSettingsMatch[1]); return }
      if (req.method === 'PUT') { await handleUpdateSiteSettings(req, res, adminSiteSettingsMatch[1]); return }
    }

    const adminSiteMatch = url.pathname.match(/^\/api\/admin\/sites\/([^/]+)$/)
    if (adminSiteMatch) {
      if (req.method === 'GET') { await handleGetSite(req, res, adminSiteMatch[1]); return }
      if (req.method === 'PUT') { await handleUpdateSite(req, res, adminSiteMatch[1]); return }
    }

    const adminSiteDomainMatch = url.pathname.match(/^\/api\/admin\/sites\/([^/]+)\/domains$/)
    if (req.method === 'POST' && adminSiteDomainMatch) {
      await handleAddDomain(req, res, adminSiteDomainMatch[1])
      return
    }

    const adminSiteDomainHostMatch = url.pathname.match(/^\/api\/admin\/sites\/([^/]+)\/domains\/(.+)$/)
    if (req.method === 'DELETE' && adminSiteDomainHostMatch) {
      await handleRemoveDomain(req, res, adminSiteDomainHostMatch[1], decodeURIComponent(adminSiteDomainHostMatch[2]))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/public/site-config') {
      await handleGetSiteConfig(req, res)
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/admin/settings/theme') {
      await handleUpdateSiteTheme(req, res)
      return
    }

    if (req.method === 'GET' && url.pathname.startsWith('/uploads/')) {
      await handleStaticUpload(req, res, url.pathname)
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/admin/media') {
      await handleListMedia(req, res)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/admin/media/upload') {
      await handleUploadMedia(req, res)
      return
    }

    const adminMediaMatch = url.pathname.match(/^\/api\/admin\/media\/([^/]+)$/)
    if (adminMediaMatch && req.method === 'PUT') {
      await handleUpdateMedia(req, res, adminMediaMatch[1])
      return
    }
    if (adminMediaMatch && req.method === 'DELETE') {
      await handleDeleteMedia(req, res, adminMediaMatch[1], url)
      return
    }

    // ── Admin: Categories ─────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/admin/categories') {
      await handleListCategories(req, res, url)
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/categories') {
      await handleCreateCategory(req, res, url)
      return
    }
    const adminCategoryMatch = url.pathname.match(/^\/api\/admin\/categories\/([^/]+)$/)
    if (adminCategoryMatch) {
      if (req.method === 'PUT') { await handleUpdateCategory(req, res, adminCategoryMatch[1], url); return }
      if (req.method === 'DELETE') { await handleDeleteCategory(req, res, adminCategoryMatch[1], url); return }
    }

    // ── Admin: Tags ───────────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/admin/tags') {
      await handleListTags(req, res, url)
      return
    }

    // ── Admin: Menus ──────────────────────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/admin/menus') {
      await handleListMenus(req, res, url)
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/admin/menus') {
      await handleCreateMenu(req, res, url)
      return
    }
    const adminMenuMatch = url.pathname.match(/^\/api\/admin\/menus\/([^/]+)$/)
    if (adminMenuMatch) {
      if (req.method === 'PUT') { await handleUpdateMenu(req, res, adminMenuMatch[1], url); return }
      if (req.method === 'DELETE') { await handleDeleteMenu(req, res, adminMenuMatch[1], url); return }
    }

    sendError(req, res, 404, 'Not found')
  } catch (error) {
    console.error(error)
    sendError(req, res, 500, error instanceof Error ? error.message : 'Internal server error')
  }
}

const server = http.createServer(handleRequest)
const { apiPort } = getConfig()

server.listen(apiPort, () => {
  console.log(`CMS API server listening on http://localhost:${apiPort}`)
})
