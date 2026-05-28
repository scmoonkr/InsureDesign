import { getMongoDb } from './mongo.mjs'

const SETTINGS_FIELDS = ['siteName', 'siteUrl', 'description', 'logoUrl', 'faviconUrl', 'theme']

export async function getSiteConfig(siteId) {
  const db = await getMongoDb()
  const doc = await db.collection('settings').findOne({ siteId })
  return { theme: 'default', ...doc }
}

export async function updateSiteTheme(siteId, theme) {
  const db = await getMongoDb()
  await db.collection('settings').updateOne(
    { siteId },
    { $set: { theme, updatedAt: new Date() } },
    { upsert: true },
  )
  return { theme }
}

export async function getSiteSettings(siteId) {
  const db = await getMongoDb()
  const doc = await db.collection('settings').findOne({ siteId })
  const defaults = { siteName: '', siteUrl: '', description: '', logoUrl: '', faviconUrl: '', theme: 'default' }
  if (!doc) return defaults
  const { _id, ...rest } = doc
  return { ...defaults, ...rest }
}

export async function updateSiteSettings(siteId, fields) {
  const db = await getMongoDb()
  const update = {}
  for (const key of SETTINGS_FIELDS) {
    if (Object.hasOwn(fields, key) && typeof fields[key] === 'string') {
      update[key] = fields[key]
    }
  }
  update.siteId = siteId
  update.updatedAt = new Date()
  await db.collection('settings').updateOne(
    { siteId },
    { $set: update },
    { upsert: true },
  )
  return update
}
