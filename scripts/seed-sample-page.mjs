// Seed a sample `page` by cloning the markdown / featured image / summary from
// the existing sample-all-blocks post. Pages skip categories/tags (taxonomy is
// post convention) and carry page-specific meta (parentId, template, showInMenu).
//
// Usage:
//   node scripts/seed-sample-page.mjs
//   node scripts/seed-sample-page.mjs --replace
//   node scripts/seed-sample-page.mjs --slug about    # custom slug

import { loadEnv } from '../api-server/config.mjs'
import { getMongoDb } from '../api-server/mongo.mjs'
import { createContent, deleteContent } from '../api-server/contents-service.mjs'

loadEnv()

function arg(name, defaultValue) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  const v = process.argv[idx + 1]
  if (!v || v.startsWith('--')) return true
  return v
}

const replace = arg('replace', false)
const customSlug = arg('slug', '')
const SOURCE_SLUG = 'sample-all-blocks'
const DEFAULT_TARGET_SLUG = 'sample-all-blocks-page'

async function run() {
  const db = await getMongoDb()

  // 1. Load the source post
  const source = await db.collection('contents').findOne({
    slug: SOURCE_SLUG, contentType: 'post', isDeleted: { $ne: true },
  })
  if (!source) {
    console.error(`× source post "${SOURCE_SLUG}" not found.`)
    console.error(`  Run: npm run seed:sample-post`)
    process.exit(1)
  }
  console.log(`- source post: ${source.title} (${source._id})`)

  const targetSlug = customSlug || DEFAULT_TARGET_SLUG

  // 2. Remove existing target if --replace
  const existing = await db.collection('contents').findOne({
    slug: targetSlug, contentType: 'page', isDeleted: { $ne: true },
  })
  if (existing && replace) {
    console.log(`- replacing existing sample page ${existing._id}`)
    await deleteContent(String(existing._id), null)
  } else if (existing) {
    console.log(`! sample page already exists with slug "${targetSlug}" (id=${existing._id}).`)
    console.log(`  Re-run with --replace to overwrite. Aborting.`)
    process.exit(2)
  }

  // 3. Create the page — same markdown / featured image / summary, page-specific meta
  const page = await createContent({
    contentType: 'page',
    title: '모든 블록을 사용한 샘플 페이지',
    slug: targetSlug,
    summary: source.summary || '10종 block을 한 페이지에 모두 사용한 샘플입니다.',
    markdown: source.markdown,
    status: 'published',
    visibility: 'public',
    // Pages typically don't carry taxonomy — leave categoryIds/tagIds empty.
    categoryIds: [],
    tagIds: [],
    thumbnailImageId: source.thumbnailImageId ? String(source.thumbnailImageId) : null,
    // Page-specific meta (per docs/content.md Type Meta section)
    meta: {
      parentId: null,           // top-level page (no parent)
      template: 'page-basic',   // template selector (templates not yet implemented)
      showInMenu: true,         // surface in primary nav once menu system uses this
    },
  }, source.authorId ? String(source.authorId) : null)

  console.log()
  console.log(`✓ created sample page id=${page.id} slug=${page.slug}`)
  console.log(`  Public URL  : http://localhost:9001/page/${page.slug}`)
  console.log(`  API check   : http://localhost:9000/api/public/contents/${page.slug}?type=page`)
  console.log()
  console.log(`  Backend edit: not yet (only posts.vue exists; pages.vue is a future page).`)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
