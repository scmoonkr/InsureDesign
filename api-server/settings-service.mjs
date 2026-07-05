import { getMongoDb } from './mongo.mjs'

const SETTINGS_FIELDS = ['siteName', 'siteUrl', 'description', 'logoUrl', 'faviconUrl', 'theme']

// Single-site: settings live in one document selected by a fixed key.
const SETTINGS_SELECTOR = { key: 'site' }

export async function getSiteConfig() {
  const db = await getMongoDb()
  const doc = await db.collection('settings').findOne(SETTINGS_SELECTOR)
  return { theme: 'default', siteName: '', logoUrl: '', faviconUrl: '', ...doc }
}

export async function updateSiteTheme(theme) {
  const db = await getMongoDb()
  await db.collection('settings').updateOne(
    SETTINGS_SELECTOR,
    { $set: { theme, updatedAt: new Date() }, $setOnInsert: SETTINGS_SELECTOR },
    { upsert: true },
  )
  return { theme }
}

export async function getSiteSettings() {
  const db = await getMongoDb()
  const doc = await db.collection('settings').findOne(SETTINGS_SELECTOR)
  const defaults = { siteName: '', siteUrl: '', description: '', logoUrl: '', faviconUrl: '', theme: 'default' }
  if (!doc) return defaults
  const { _id, ...rest } = doc
  return { ...defaults, ...rest }
}

export async function updateSiteSettings(fields) {
  const db = await getMongoDb()
  const update = {}
  for (const key of SETTINGS_FIELDS) {
    if (Object.hasOwn(fields, key) && typeof fields[key] === 'string') {
      update[key] = fields[key]
    }
  }
  update.updatedAt = new Date()
  await db.collection('settings').updateOne(
    SETTINGS_SELECTOR,
    { $set: update, $setOnInsert: SETTINGS_SELECTOR },
    { upsert: true },
  )
  return update
}
