import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { URL, fileURLToPath } from 'node:url'
import { ObjectId } from 'mongodb'
import { getMongoDb } from './mongo.mjs'
import { clearAuthSession, createOAuthState, getAuthSession, setAuthSession, verifyOAuthState } from './auth-session.mjs'
import { getConfig, loadEnv } from './config.mjs'
import { deleteUserById, getUserById, listUsers, setUserRole, updateUserProfile, upsertSocialUser } from './auth-service.mjs'
import { listMedia, createMedia, updateMediaMeta, deleteMedia, getMediaByIds } from './media-service.mjs'
import { getSiteConfig, updateSiteTheme } from './settings-service.mjs'
import { checkAdmin, checkSession, hasRole, ROLE_LEVELS } from './middleware.mjs'
import { listContents, getContentById, createContent, updateContent, listPublicContents, getPublicContentBySlug, titleToSlug, collectImageIds, previewMarkdown, listOwnContents, getOwnContentById, createOwnContent, updateOwnContent } from './contents-service.mjs'
import { listCategories, createCategory, updateCategory, deleteCategory, getCategoryBySlug, getCategoriesByIds } from './categories-service.mjs'
import { listTags, findOrCreateTagsByNames, getTagBySlug, getTagsByIds } from './tags-service.mjs'
import { listMenus, createMenu, updateMenu, deleteMenu } from './menus-service.mjs'
import { listAnalysisDocs, getAnalysisDoc, createAnalysisDoc, updateAnalysisDoc, deleteAnalysisDoc } from './analysis-service.mjs'
import { buildProposalData, generatePdf } from './pdf-service.mjs'

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
  res.setHeader('access-control-allow-headers', 'content-type')
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
    // TEMP(dev): AUTH_BYPASS lets the frontend backend-guard pass without login.
    if (getConfig().authBypass) {
      sendJson(req, res, 200, {
        user: { id: '000000000000000000000000', provider: 'dev', name: '개발자(임시)', email: 'dev@local', roles: [{ role: 'super' }], status: 'active' },
      })
      return
    }
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

// Roles an admin may assign from the backend users UI (admin/super are DB-only).
const GRANTABLE_ROLES = ['member', 'employee', 'manager']

async function handleUpdateBackendUser(req, res, userId) {
  const session = getAuthSession(req)
  if (!session) {
    sendError(req, res, 401, 'Unauthorized')
    return
  }

  const input = await readJsonBody(req)

  // Role assignment is admin-only, and only when it actually changes the role.
  // (Profile-only edits always resend the current role — those must not require
  // admin, or managers couldn't edit profiles.) admin/super are never assignable.
  let roleToSet = null
  if (GRANTABLE_ROLES.includes(input.role)) {
    const current = await getUserById(userId)
    if (!current) { sendError(req, res, 404, 'User not found'); return }
    const currentTop = (current.roles || []).map(r => r.role)
      .sort((a, b) => (ROLE_LEVELS[b] || 0) - (ROLE_LEVELS[a] || 0))[0] || 'member'
    if (currentTop !== input.role) {
      const admin = await checkAdmin(req, 'admin')
      if (!admin.ok) {
        sendError(req, res, 403, '역할 변경은 admin 권한이 필요합니다.')
        return
      }
      roleToSet = input.role
    }
  }

  const validation = validateProfileInput(input)
  if (validation.error) {
    sendError(req, res, 400, validation.error)
    return
  }

  let user = await updateUserProfile(userId, validation.value)
  if (!user) {
    sendError(req, res, 404, 'User not found')
    return
  }

  if (roleToSet) {
    user = await setUserRole(userId, roleToSet)
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

function buildUploadPaths(uploadDir, originalName, hash) {
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
  const relPath = `${yyyy}/${mm}/${prefix}/${filename}`
  return {
    fullDir: path.resolve(uploadDir, yyyy, mm, prefix),
    fullPath: path.resolve(uploadDir, yyyy, mm, prefix, filename),
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
  '.pdf': 'application/pdf',
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
  const items = await listMedia()
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
  await processMediaUpload(req, res, session)
}

// Shared multipart-upload core used by both admin and author (/api/me) endpoints.
// Parses parts, persists to disk, creates media docs.
async function processMediaUpload(req, res, session) {
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
      uploadDir, part.filename, hash,
    )

    await mkdir(fullDir, { recursive: true })
    await writeFile(fullPath, part.data)

    const title = path.basename(part.filename, path.extname(part.filename))

    const item = await createMedia({
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

  const deleted = await deleteMedia(mediaId, session.id)
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

  const items = await listCategories()
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

  try {
    const item = await createCategory({
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

  if (input.name !== undefined) {
    const name = validateCategoryName(input.name)
    if (!name) { sendError(req, res, 400, 'name must be 1-60 characters'); return }
    input.name = name
  }

  try {
    const item = await updateCategory(categoryId, input, session.id)
    if (!item) { sendError(req, res, 404, 'Category not found'); return }
    sendJson(req, res, 200, { item })
  } catch (err) {
    sendError(req, res, 400, err instanceof Error ? err.message : 'Failed to update category')
  }
}

async function handleListTags(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const items = await listTags()
  sendJson(req, res, 200, { items })
}

// ── Menus ────────────────────────────────────────────────────────────────────

// Public: resolve a menu by location to ready-to-render NavItem tree.
// Drops draft/deleted references silently so the public nav stays clean.
async function handlePublicMenu(req, res, location) {
  const db = await getMongoDb()
  const doc = await db.collection('menus').findOne({
    location, isDeleted: { $ne: true },
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
            isDeleted: { $ne: true },
            status: 'published',
            visibility: 'public',
          },
          { projection: { slug: 1, contentType: 1 } },
        ).toArray()
      : [],
    categoryIds.size
      ? db.collection('categories').find(
          { _id: { $in: [...categoryIds].map(id => new ObjectId(id)) }, isDeleted: { $ne: true } },
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
  const items = await listMenus()
  sendJson(req, res, 200, { items })
}

async function handleCreateMenu(req, res, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const input = await readJsonBody(req)
  if (!input.name || typeof input.name !== 'string') {
    sendError(req, res, 400, 'name is required'); return
  }
  const menu = await createMenu({
    name: input.name, location: input.location, items: input.items,
  }, session.id)
  sendJson(req, res, 201, { menu })
}

async function handleUpdateMenu(req, res, menuId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const input = await readJsonBody(req)
  const menu = await updateMenu(menuId, input, session.id)
  if (!menu) { sendError(req, res, 404, 'Menu not found'); return }
  sendJson(req, res, 200, { menu })
}

async function handleDeleteMenu(req, res, menuId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }
  const deleted = await deleteMenu(menuId, session.id)
  if (!deleted) { sendError(req, res, 404, 'Menu not found'); return }
  sendJson(req, res, 200, { ok: true })
}

async function handleDeleteCategory(req, res, categoryId, url) {
  const session = getAuthSession(req)
  if (!session) { sendError(req, res, 401, 'Unauthorized'); return }

  const result = await deleteCategory(categoryId, session.id)
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

// ── Contents ──────────────────────────────────────────────────────────────────

function validateContentInput(input) {
  const CONTENT_TYPES = ['post', 'page', 'notice', 'gallery']
  const contentType = CONTENT_TYPES.includes(input.contentType) ? input.contentType : null
  if (!contentType) return { error: `contentType must be one of: ${CONTENT_TYPES.join(', ')}.` }

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 200) return { error: 'title must be 1–200 characters.' }

  const status = ['draft', 'published', 'hidden', 'deleted'].includes(input.status) ? input.status : 'draft'
  const visibility = ['public', 'members', 'private'].includes(input.visibility) ? input.visibility : 'public'
  const accessLevel = ['public', 'member', 'employee', 'manager', 'admin'].includes(input.accessLevel) ? input.accessLevel : 'public'

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
      accessLevel,
    },
  }
}

// Admin: list contents
async function handleListContents(req, res, url) {
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const { items, total } = await listContents({
    contentType: url.searchParams.get('type') || null,
    status: url.searchParams.get('status') || null,
    limit: url.searchParams.get('limit') || 50,
    skip: url.searchParams.get('skip') || 0,
  })
  sendJson(req, res, 200, { items, total })
}

// Admin: create content
async function handleCreateContent(req, res, url) {
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const validation = validateContentInput(input)
  if (validation.error) { sendError(req, res, 400, validation.error); return }

  const tagIds = await findOrCreateTagsByNames(input.tagNames, auth.user.id)
  const categoryIds = Array.isArray(input.categoryIds) ? input.categoryIds : []
  const meta = { ...(input.meta && typeof input.meta === 'object' ? input.meta : {}) }
  if (Object.hasOwn(input, 'featured')) meta.featured = !!input.featured

  try {
    const content = await createContent(
      { ...validation.value, categoryIds, tagIds, meta, thumbnailImageId: input.thumbnailImageId || null },
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
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const result = await previewMarkdown(input.markdown || '')

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
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const content = await getContentById(contentId)
  if (!content) { sendError(req, res, 404, 'Content not found'); return }

  sendJson(req, res, 200, { content })
}

// Admin: update content
async function handleUpdateContent(req, res, contentId, url) {
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const fields = { ...input }

  if (Array.isArray(input.tagNames)) {
    fields.tagIds = await findOrCreateTagsByNames(input.tagNames, auth.user.id)
    delete fields.tagNames
  }

  if (Object.hasOwn(input, 'featured')) {
    const base = (input.meta && typeof input.meta === 'object') ? input.meta : {}
    fields.meta = { ...base, featured: !!input.featured }
    delete fields.featured
  }

  try {
    const content = await updateContent(contentId, fields, auth.user.id)
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
  const auth = await checkAdmin(req, 'manager')
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  try {
    const content = await updateContent(contentId, { status: 'deleted' }, auth.user.id)
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
  const tags = await getTagsByIds(content.tagIds || [])
  sendJson(req, res, 200, { content: { ...content, tagNames: tags.map(t => t.name) } })
}

async function handleCreateOwnContent(req, res) {
  const auth = checkSession(req)
  if (!auth.ok) { sendError(req, res, auth.status, auth.message); return }

  const input = await readJsonBody(req)
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title || title.length > 200) { sendError(req, res, 400, 'title must be 1–200 characters.'); return }

  const tagIds = Array.isArray(input.tagNames) && input.tagNames.length
    ? await findOrCreateTagsByNames(input.tagNames, auth.session.id)
    : []

  try {
    const content = await createOwnContent(auth.session.id, {
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
    fields.tagIds = await findOrCreateTagsByNames(input.tagNames, auth.session.id)
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

  const input = await readJsonBody(req)
  const result = await previewMarkdown(input.markdown || '')

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
  const { apiBase } = getConfig()
  const items = await listMedia()
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
  await processMediaUpload(req, res, session)
}

// Public: list published contents in a category — returns category + items + maps in one round trip
async function handlePublicCategoryPage(req, res, url, slug) {
  const category = await getCategoryBySlug(slug)
  if (!category) { sendError(req, res, 404, 'Category not found'); return }

  const db = await getMongoDb()
  const wantType = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const skip = Number(url.searchParams.get('skip')) || 0

  const filter = {
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
        thumbnailImageId: 1, authorId: 1, meta: 1, categoryIds: 1, tagIds: 1,
      },
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .skip(skip).limit(limit)
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  // Batch lookup thumbnails + authors + categories + tags
  const thumbIds = new Set()
  const authorIds = new Set()
  const allCategoryIds = new Set()
  const allTagIds = new Set()
  for (const d of docs) {
    if (d.thumbnailImageId) thumbIds.add(String(d.thumbnailImageId))
    if (d.authorId) authorIds.add(String(d.authorId))
    for (const id of d.categoryIds || []) allCategoryIds.add(String(id))
    for (const id of d.tagIds || []) allTagIds.add(String(id))
  }

  const [mediaMap, categoryDocs, tagDocs] = await Promise.all([
    thumbIds.size ? getMediaByIds([...thumbIds]) : Promise.resolve({}),
    allCategoryIds.size ? getCategoriesByIds([...allCategoryIds]) : Promise.resolve([]),
    allTagIds.size ? getTagsByIds([...allTagIds]) : Promise.resolve([]),
  ])
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

  const categoryLookup = Object.fromEntries(categoryDocs.map(c => [c.id, c]))
  const tagLookup = Object.fromEntries(tagDocs.map(t => [t.id, t]))

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
    categoryLabels: (d.categoryIds || []).map(id => categoryLookup[String(id)]).filter(Boolean),
    tagLabels: (d.tagIds || []).map(id => tagLookup[String(id)]).filter(Boolean),
  }))

  sendJson(req, res, 200, { category, items, total, mediaMap, authorMap })
}

// Public: list published contents tagged with a given slug — same shape as the category page.
async function handlePublicTagPage(req, res, url, slug) {
  const tag = await getTagBySlug(slug)
  if (!tag) { sendError(req, res, 404, 'Tag not found'); return }

  const db = await getMongoDb()
  const wantType = url.searchParams.get('type')
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50)
  const skip = Number(url.searchParams.get('skip')) || 0

  const filter = {
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
        thumbnailImageId: 1, authorId: 1, meta: 1, categoryIds: 1, tagIds: 1,
      },
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .skip(skip).limit(limit)
      .toArray(),
    db.collection('contents').countDocuments(filter),
  ])

  const thumbIds = new Set()
  const authorIds = new Set()
  const allCategoryIds = new Set()
  const allTagIds = new Set()
  for (const d of docs) {
    if (d.thumbnailImageId) thumbIds.add(String(d.thumbnailImageId))
    if (d.authorId) authorIds.add(String(d.authorId))
    for (const id of d.categoryIds || []) allCategoryIds.add(String(id))
    for (const id of d.tagIds || []) allTagIds.add(String(id))
  }

  const [mediaMap, categoryDocs, tagDocs] = await Promise.all([
    thumbIds.size ? getMediaByIds([...thumbIds]) : Promise.resolve({}),
    allCategoryIds.size ? getCategoriesByIds([...allCategoryIds]) : Promise.resolve([]),
    allTagIds.size ? getTagsByIds([...allTagIds]) : Promise.resolve([]),
  ])
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

  const categoryLookup = Object.fromEntries(categoryDocs.map(c => [c.id, c]))
  const tagLookup = Object.fromEntries(tagDocs.map(t => [t.id, t]))

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
    categoryLabels: (d.categoryIds || []).map(id => categoryLookup[String(id)]).filter(Boolean),
    tagLabels: (d.tagIds || []).map(id => tagLookup[String(id)]).filter(Boolean),
  }))

  sendJson(req, res, 200, { tag, items, total, mediaMap, authorMap })
}

// Public: list published contents (hides entries the requester can't access)
async function handlePublicListContents(req, res, url) {
  const level = await resolveRequesterLevel(req)
  const { items, total } = await listPublicContents({
    contentType: url.searchParams.get('type') || null,
    limit: url.searchParams.get('limit') || 20,
    skip: url.searchParams.get('skip') || 0,
    allowedAccessLevels: allowedAccessLevels(level),
  })
  sendJson(req, res, 200, { items, total })
}

// Public: published posts as card data — filtered by category and/or tag slugs.
// Used by the `postList` block (always queries fresh, never relies on cached html).
async function handlePublicPostCards(req, res, url) {
  const parseCsv = s => String(s || '').split(',').map(t => t.trim()).filter(Boolean)
  const categorySlugs = parseCsv(url.searchParams.get('categories'))
  const tagSlugs = parseCsv(url.searchParams.get('tags'))
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 6, 1), 24)

  const db = await getMongoDb()

  // Resolve slugs → ObjectIds (silently drop unknown slugs so a typo doesn't 500).
  const [catDocs, tagDocs] = await Promise.all([
    categorySlugs.length
      ? db.collection('categories').find(
          { slug: { $in: categorySlugs }, isDeleted: { $ne: true } },
          { projection: { _id: 1 } },
        ).toArray()
      : [],
    tagSlugs.length
      ? db.collection('tags').find(
          { slug: { $in: tagSlugs }, isDeleted: { $ne: true } },
          { projection: { _id: 1 } },
        ).toArray()
      : [],
  ])

  const filter = {
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

// ── Content access control (page/post level) ────────────────────────────────
// accessLevel: public | member | employee | manager | admin. Hierarchical —
// a user may view content whose required role level is <= their own.

// Max role level of the requester (0 = anonymous / not logged in).
async function resolveRequesterLevel(req) {
  const session = getAuthSession(req)
  if (!session) return 0
  const user = await getUserById(session.id)
  if (!user || user.status !== 'active') return 0
  return Math.max(0, ...(user.roles || []).map(r => ROLE_LEVELS[r.role] || 0))
}

// Required role level for an accessLevel string (0 = public / no login needed).
function accessLevelRank(accessLevel) {
  if (!accessLevel || accessLevel === 'public') return 0
  return ROLE_LEVELS[accessLevel] || 0
}

// accessLevel strings a user of the given level may view (always includes 'public').
function allowedAccessLevels(level) {
  return ['public', ...Object.keys(ROLE_LEVELS).filter(r => ROLE_LEVELS[r] <= level)]
}

// Public: get single published content by slug
async function handlePublicGetContent(req, res, slug, url) {
  const content = await getPublicContentBySlug(slug)
  if (!content) { sendError(req, res, 404, 'Not found'); return }

  const wantType = url?.searchParams?.get('type')
  if (wantType && content.contentType !== wantType) {
    sendError(req, res, 404, 'Not found')
    return
  }

  // Role gate: if this page/post requires a role, verify the requester's level.
  const requiredLevel = accessLevelRank(content.accessLevel)
  if (requiredLevel > 0) {
    const level = await resolveRequesterLevel(req)
    if (level < requiredLevel) {
      sendJson(req, res, 200, {
        locked: true,
        accessLevel: content.accessLevel,
        requiresLogin: level === 0,
        title: content.title,
        contentType: content.contentType,
        slug: content.slug,
      })
      return
    }
  }

  // Bundle every media doc referenced by the article — image blocks AND featured image.
  const ids = new Set(collectImageIds(content.blocks || []))
  if (content.thumbnailImageId) ids.add(String(content.thumbnailImageId))
  const mediaMap = ids.size ? await getMediaByIds([...ids]) : {}

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
      ? db.collection('categories').find({ _id: { $in: catObjectIds }, isDeleted: { $ne: true } }).toArray()
      : [],
    tagObjectIds.length
      ? db.collection('tags').find({ _id: { $in: tagObjectIds }, isDeleted: { $ne: true } }).toArray()
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
  const config = await getSiteConfig()
  sendJson(req, res, 200, {
    theme:      config.theme      || 'default',
    siteName:   config.siteName   || '',
    logoUrl:    config.logoUrl    || '',
    faviconUrl: config.faviconUrl || '',
  })
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

  const result = await updateSiteTheme(theme)
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
    const detail = await response.text().catch(() => '')
    console.error(`[oauth] ${provider} token request failed (${response.status}): ${detail}`)
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

// ── Analysis handlers ─────────────────────────────────────────────────────────

async function handleListAnalysis(req, res) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const items = await listAnalysisDocs()
  sendJson(req, res, 200, { items })
}

async function handleGetAnalysis(req, res, id) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const item = await getAnalysisDoc(id)
  if (!item) { sendError(req, res, 404, 'Not found'); return }
  sendJson(req, res, 200, { item })
}

async function handleCreateAnalysis(req, res) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const body = await readJsonBody(req)
  const item = await createAnalysisDoc(body)
  sendJson(req, res, 201, { item })
}

async function handleUpdateAnalysis(req, res, id) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const body = await readJsonBody(req)
  const ok = await updateAnalysisDoc(id, body)
  if (!ok) { sendError(req, res, 404, 'Not found'); return }
  sendJson(req, res, 200, { ok: true })
}

async function handleDeleteAnalysis(req, res, id) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const ok = await deleteAnalysisDoc(id)
  if (!ok) { sendError(req, res, 404, 'Not found'); return }
  sendJson(req, res, 200, { ok: true })
}

async function handleUploadAnalysisPdf(req, res) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const { uploadDir } = getConfig()
  const MAX = 30 * 1024 * 1024 // 30 MB
  const body = await readRawBody(req, MAX)
  const boundary = getMultipartBoundary(req.headers['content-type'])
  if (!boundary) { sendError(req, res, 400, 'multipart boundary missing'); return }
  const parts = parseMultipart(body, boundary)
  const filePart = parts.find(p => p.filename && p.data?.length > 0)
  if (!filePart) { sendError(req, res, 400, 'No file'); return }
  const ext = path.extname(filePart.filename || '').toLowerCase()
  if (ext !== '.pdf') { sendError(req, res, 400, 'PDF 파일만 업로드 가능합니다'); return }
  const hash = createHash('sha256').update(filePart.data).digest('hex')
  const { fullDir, fullPath, urlPath } = buildUploadPaths(uploadDir, filePart.filename, hash)
  await mkdir(fullDir, { recursive: true })
  await writeFile(fullPath, filePart.data)
  sendJson(req, res, 200, {
    filename: path.basename(fullPath),
    originalName: filePart.filename,
    urlPath,
  })
}

function urlPathToFilePath(urlPath, uploadDir) {
  const rel = urlPath.replace(/^\/uploads\//, '')
  return path.resolve(uploadDir, rel)
}

const ANALYSIS_PROMPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../docs/보험분석_prompt.md',
)
let analysisPromptCache = null
async function loadAnalysisPrompt() {
  if (analysisPromptCache == null) {
    analysisPromptCache = await readFile(ANALYSIS_PROMPT_PATH, 'utf8')
  }
  return analysisPromptCache
}

async function callClaudeApi(messages, systemPrompt, maxTokens = 4096, model = 'claude-sonnet-4-6') {
  const { anthropicApiKey } = getConfig()
  if (!anthropicApiKey) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다'), { statusCode: 500 })
  }
  const bodyStr = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-length': Buffer.byteLength(bodyStr),
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString())
          if (data.error) reject(new Error(data.error.message || 'Claude API error'))
          else resolve(data)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// OpenAI Chat Completions 호출 (PDF는 content의 file 파트로 전달, JSON 모드).
async function callOpenAiApi(messages, maxTokens = 16000, model) {
  const { openaiApiKey, openaiModel } = getConfig()
  if (!openaiApiKey) {
    throw Object.assign(new Error('OPENAI_API_KEY가 설정되지 않았습니다'), { statusCode: 500 })
  }
  const bodyStr = JSON.stringify({
    model: model || openaiModel,
    max_completion_tokens: maxTokens,
    response_format: { type: 'json_object' },
    messages,
  })
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${openaiApiKey}`,
        'content-length': Buffer.byteLength(bodyStr),
      },
    }, (res) => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const data = JSON.parse(Buffer.concat(chunks).toString())
          if (data.error) reject(new Error(data.error.message || 'OpenAI API error'))
          else resolve(data)
        } catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// Life-stage segment (A~G) from age. Boundaries mirror docs/보험분석_prompt.md.
function ageToSegment(age) {
  if (age === null || age === undefined || age === '') return null
  const a = Number(age)
  if (!Number.isFinite(a) || a <= 0) return null // 0/음수/NaN = 미입력 취급 (Number(null)===0 주의)
  if (a <= 15) return 'A'
  if (a <= 24) return 'B'
  if (a <= 34) return 'C'
  if (a <= 49) return 'D'
  if (a <= 64) return 'E'
  if (a <= 74) return 'F'
  return 'G'
}

// Authoritative age/segment block injected into the analysis prompt. When the
// user entered the insured's age we compute the life-stage type here and force
// the model to use it (and only its template) — no more guessing age/type from
// inconsistent PDF layouts.
function buildAgeSegmentText(insuredAge) {
  const seg = ageToSegment(insuredAge)
  if (!seg) return '- 피보험자 나이: (미입력 — PDF에서 추출)\n'
  return `- 피보험자 나이: ${Number(insuredAge)}세  ← 필수: customer.age 로 이 값을 사용\n`
    + `- 생애주기 유형: ${seg}  ← 필수: customer.segment="${seg}" 명시하고, issueList·title·pillars 등 모든 유형별 콘텐츠를 반드시 ${seg} 유형 규칙으로만 생성 (다른 유형 템플릿 사용 금지)\n`
}

async function handleAnalyzeInsurance(req, res, id) {
  const t0 = Date.now()
  console.log(`\n[analyze] ▶ 시작 id=${id}`)
  const session = await checkAdmin(req, res)
  if (!session) return
  const doc = await getAnalysisDoc(id)
  if (!doc) { console.log('[analyze] ✖ 문서 없음'); sendError(req, res, 404, 'Not found'); return }
  console.log(`[analyze] 문서 로드: 고객='${doc.customerName || ''}' 설계사='${doc.agentName || ''}' 기존PDF=${doc.existingInsurancePdf ? 'Y' : 'N'} 설계PDF=${(doc.proposalPdfs || []).filter(Boolean).length}개`)
  const { uploadDir } = getConfig()

  const content = []

  async function addPdf(pdfInfo, title) {
    if (!pdfInfo?.urlPath) return
    try {
      const data = await readFile(urlPathToFilePath(pdfInfo.urlPath, uploadDir))
      content.push({
        type: 'file',
        file: {
          filename: pdfInfo.originalName || `${title}.pdf`,
          file_data: `data:application/pdf;base64,${data.toString('base64')}`,
        },
      })
      console.log(`[analyze]   + PDF 첨부: '${title}' (${(data.length / 1024).toFixed(0)} KB)`)
    } catch (e) {
      console.log(`[analyze]   ! PDF 읽기 실패(skip): '${title}' ${pdfInfo.urlPath} — ${e.message}`)
    }
  }

  await addPdf(doc.existingInsurancePdf, '기존보험내역')
  for (let i = 0; i < (doc.proposalPdfs || []).length; i++) {
    await addPdf(doc.proposalPdfs[i], `보험설계서 ${i + 1}: ${doc.proposalPdfs[i]?.originalName || ''}`)
  }

  if (content.length === 0) {
    console.log('[analyze] ✖ 첨부된 PDF 없음 → 400')
    sendError(req, res, 400, '분석할 PDF 파일이 없습니다'); return
  }

  content.push({
    type: 'text',
    text: `보험 설계 화면의 입력 정보 (PDF와 다를 경우 아래 입력값을 우선 적용):\n`
      + `- 피보험자: ${doc.customerName || ''}\n`
      + `- 보험계약자: ${doc.contractorName || ''}\n`
      + `- 설계사명: ${doc.agentName || ''}\n`
      + `- 설계 note: ${doc.note || ''}\n`
      + buildAgeSegmentText(doc.insuredAge)
      + `\n위 기존 보험내역 및 보험설계서 PDF를 시스템 프롬프트의 규칙에 따라 분석하여, 설명 없이 순수 JSON만 생성하세요.`,
  })
  console.log(`[analyze] 입력: 피보험자='${doc.customerName || ''}' 계약자='${doc.contractorName || ''}' 나이=${doc.insuredAge ?? '(미입력)'} 유형=${ageToSegment(doc.insuredAge) ?? '-'}`)

  const systemPrompt = await loadAnalysisPrompt()
  const { openaiModel } = getConfig()
  console.log(`[analyze] 프롬프트 로드: ${systemPrompt.length} chars | content 블록 ${content.length}개 (PDF ${content.length - 1} + text 1)`)
  console.log(`[analyze] → OpenAI 호출 (model=${openaiModel}, max_completion_tokens=16000) ...`)

  let response
  try {
    response = await callOpenAiApi(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      16000,
    )
  } catch (e) {
    console.log(`[analyze] ✖ OpenAI 호출 실패: ${e.message}`)
    throw e
  }

  const usage = response.usage || {}
  const choice = response.choices?.[0] || {}
  console.log(`[analyze] ← OpenAI 응답: finish_reason=${choice.finish_reason} usage(prompt=${usage.prompt_tokens} completion=${usage.completion_tokens})`)

  const rawText = choice.message?.content || ''
  console.log(`[analyze] 응답 텍스트 길이: ${rawText.length} chars`)
  let analysisResult = null
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    analysisResult = JSON.parse(m?.[0] || rawText)
  } catch (e) {
    console.log(`[analyze] ✖ JSON 파싱 실패: ${e.message} (raw 일부: ${rawText.slice(0, 120)}...)`)
  }

  // Validate before storing. LLM degeneration (repetition loops, token-limit
  // truncation) yields syntactically-valid-but-structurally-broken JSON — e.g.
  // raw strings/numbers inside `pages`. Storing that crashes PDF generation
  // later, so reject it here and ask the user to re-run instead.
  const problems = []
  if (choice.finish_reason === 'length') {
    problems.push('응답이 토큰 한도에서 잘림(finish_reason=length)')
  }
  if (!analysisResult || typeof analysisResult !== 'object') {
    problems.push('JSON 파싱 실패')
  } else if (!Array.isArray(analysisResult.pages)) {
    problems.push('pages 배열 없음')
  } else {
    const badPages = analysisResult.pages.filter(p => !p || typeof p !== 'object' || Array.isArray(p)).length
    const okPages = analysisResult.pages.length - badPages
    if (badPages > 0) problems.push(`pages에 객체가 아닌 손상 항목 ${badPages}개`)
    if (okPages < 3) problems.push(`유효 페이지 부족(${okPages}개)`)
  }

  if (problems.length) {
    console.log(`[analyze] ✖ 검증 실패 → 저장 안 함: ${problems.join(' / ')}`)
    sendError(req, res, 502, `LLM 분석 결과가 손상되었습니다 (${problems.join(', ')}). 다시 시도해주세요.`)
    return
  }

  console.log(`[analyze] ✔ 검증 통과: top-keys=[${Object.keys(analysisResult).join(', ')}] pages=${analysisResult.pages.length}`)
  await updateAnalysisDoc(id, { analysisResult })
  console.log(`[analyze] ✅ 저장 완료 id=${id} (${Date.now() - t0}ms)`)
  sendJson(req, res, 200, { ok: true, analysisResult })
}

async function handleGenerateProposal(req, res, id) {
  const session = await checkAdmin(req, res)
  if (!session) return
  const doc = await getAnalysisDoc(id)
  if (!doc) { sendError(req, res, 404, 'Not found'); return }
  if (!doc.analysisResult) { sendError(req, res, 400, '먼저 분석(LLM)을 실행하세요'); return }

  const a = doc.analysisResult
  const companies = (a.proposals || []).map(p => p.company).filter(Boolean)
  const totalPages = 8 + (a.proposals || []).length

  const prompt = `다음 보험 분석 결과를 바탕으로 고객 제안서 JSON을 생성하세요.

분석결과: ${JSON.stringify(a, null, 2)}

아래 구조의 JSON을 반환하세요. JSON만 반환하고 설명은 쓰지 마세요.
페이지 구성: sectionCover(pageNo:1), missionStatement(pageNo:2), riskIceberg(pageNo:3), companyPuzzleOverview(pageNo:4), companyMatrix(pageNo:5), 각 보험사별 companyDetail(pageNo:6~), careJourney(마지막-1), closingBalance(마지막)

{
  "id": "proposal-${id}",
  "title": "고객 맞춤 통합 보장 블루프린트",
  "subtitle": "${companies.length}개사 강점 조립형 설계",
  "documentType": "customerProposal",
  "totalPages": ${totalPages},
  "customer": ${JSON.stringify(a.customer || { name: doc.customerName, age: 0, gender: '', contractor: doc.agentName })},
  "disclaimer": { "text": "본 자료는 보험 가입 검토를 돕기 위한 요약 제안서이며, 실제 보장 내용과 보험금 지급 기준은 각 보험사의 약관 및 상품설명서를 기준으로 합니다." },
  "renderHint": { "theme": "luxury", "layout": "center-focus", "background": "dark-navy", "accent": "gold" },
  "pages": [ ...각 페이지 객체 배열... ]
}

각 page 객체의 필수 필드: id, pageNo, type, eyebrow(seal,subtitle,pagination), footer(brand,pageNumber)
sectionCover는 cover(title,description) 포함
missionStatement는 title, body(missionCard,pillars) 포함
riskIceberg는 title, body(iceberg,aside) 포함
companyPuzzleOverview는 title, body(quote,pieces) 포함
companyMatrix는 title, body(table) 포함
companyDetail은 title, premium, visual(type,label,coverageList), strategy(heading,items,quote) 포함
careJourney는 title, body(journeyTag,journey) 포함
closingBalance는 title, body(balance,closingStatement) 포함`

  const response = await callClaudeApi(
    [{ role: 'user', content: prompt }],
    `당신은 한국 보험 제안서 작성 전문가입니다. 주어진 분석 결과를 기반으로 정확한 JSON 제안서를 생성합니다.
COMPANY_COLORS 참고: 흥국화재=#2A3E66, 라이나생명=#5C2A66, KB손해보험=#6E5A1B, 한화생명=#2C5E54
반드시 유효한 JSON만 반환하세요.`,
    8192,
  )

  const rawText = response.content?.[0]?.text || ''
  let proposalData
  try {
    const m = rawText.match(/\{[\s\S]*\}/)
    proposalData = JSON.parse(m?.[0] || rawText)
  } catch { sendError(req, res, 500, `JSON 파싱 실패: ${rawText.slice(0, 200)}`); return }

  await updateAnalysisDoc(id, { proposalData })
  sendJson(req, res, 200, { ok: true, proposalData })
}

async function handleGeneratePdf(req, res, id) {
  const session = await checkAdmin(req, res)
  if (!session) return

  const doc = await getAnalysisDoc(id)
  if (!doc) { sendError(req, res, 404, 'Not found'); return }
  if (!doc.analysisResult && !doc.proposalData) {
    sendError(req, res, 400, '먼저 분석(LLM)을 실행하세요'); return
  }

  // Use existing proposalData if available, otherwise build deterministically
  let proposalData = doc.proposalData
  if (!proposalData) {
    proposalData = await buildProposalData(doc.analysisResult, doc.customerName, doc.agentName)
    await updateAnalysisDoc(id, { proposalData })
  }

  const { uploadDir } = getConfig()

  let pdfResult
  try {
    pdfResult = await generatePdf(proposalData, uploadDir, doc.title || id)
  } catch (err) {
    sendError(req, res, 500, `PDF 생성 실패: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  await updateAnalysisDoc(id, { pdfPath: pdfResult.urlPath })
  sendJson(req, res, 200, { ok: true, pdfPath: pdfResult.urlPath })
}

// ─────────────────────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res)
    res.writeHead(204)
    res.end()
    return
  }

  let url
  try {
    url = new URL(req.url || '/', 'http://localhost')
  } catch {
    sendJson(req, res, 400, { error: 'Bad request' })
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

    // ── Analysis: insurancePlanning ───────────────────────────────────────────
    if (req.method === 'GET' && url.pathname === '/api/analysis') {
      await handleListAnalysis(req, res); return
    }
    if (req.method === 'POST' && url.pathname === '/api/analysis') {
      await handleCreateAnalysis(req, res); return
    }
    if (req.method === 'POST' && url.pathname === '/api/analysis/upload-pdf') {
      await handleUploadAnalysisPdf(req, res); return
    }
    const analysisIdMatch = url.pathname.match(/^\/api\/analysis\/([^/]+)$/)
    if (analysisIdMatch) {
      if (req.method === 'GET') { await handleGetAnalysis(req, res, analysisIdMatch[1]); return }
      if (req.method === 'PUT') { await handleUpdateAnalysis(req, res, analysisIdMatch[1]); return }
      if (req.method === 'DELETE') { await handleDeleteAnalysis(req, res, analysisIdMatch[1]); return }
    }
    const analysisActionMatch = url.pathname.match(/^\/api\/analysis\/([^/]+)\/(analyze|generate|generate-pdf)$/)
    if (analysisActionMatch && req.method === 'POST') {
      const [, id, action] = analysisActionMatch
      if (action === 'analyze')       { await handleAnalyzeInsurance(req, res, id);  return }
      if (action === 'generate')      { await handleGenerateProposal(req, res, id);  return }
      if (action === 'generate-pdf')  { await handleGeneratePdf(req, res, id);       return }
    }

    sendError(req, res, 404, 'Not found')
  } catch (error) {
    console.error(error)
    sendError(req, res, 500, error instanceof Error ? error.message : 'Internal server error')
  }
}

const server = http.createServer(handleRequest)
const { apiPort, uploadDir } = getConfig()

server.listen(apiPort, () => {
  console.log(`InsureDesign API server listening on http://localhost:${apiPort}`)
  console.log(`Upload directory: ${uploadDir}`)
})
