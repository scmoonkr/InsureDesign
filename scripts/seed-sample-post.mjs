// Seed a sample post that exercises every supported block type.
// Picks real image IDs from the media collection so the
// gallery / imageGrid / slide / featured-image checks pass.
//
// Usage:
//   node scripts/seed-sample-post.mjs
//   node scripts/seed-sample-post.mjs --replace          (deletes existing sample first)

import { loadEnv } from '../api-server/config.mjs'
import { getMongoDb } from '../api-server/mongo.mjs'
import { createContent, deleteContent } from '../api-server/contents-service.mjs'
import { findOrCreateTagsByNames } from '../api-server/tags-service.mjs'

loadEnv()

function arg(name, defaultValue) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx === -1) return defaultValue
  const v = process.argv[idx + 1]
  if (!v || v.startsWith('--')) return true
  return v
}

const replace = arg('replace', false)
const authorEmail = arg('author', 'library4@naver.com')
const SAMPLE_SLUG = 'sample-all-blocks'

async function pickImages(n) {
  const db = await getMongoDb()
  const items = await db.collection('media')
    .find({ isDeleted: { $ne: true }, mimeType: /^image\// })
    .sort({ createdAt: 1 })
    .limit(n)
    .toArray()
  return items.map(it => String(it._id))
}

async function ensureCategory() {
  const db = await getMongoDb()
  let cat = await db.collection('categories').findOne({
    slug: 'sample', isDeleted: { $ne: true },
  })
  if (cat) return String(cat._id)
  const now = new Date()
  const result = await db.collection('categories').insertOne({
    name: 'Sample',
    slug: 'sample',
    parentId: null,
    order: 0,
    createdAt: now, updatedAt: now,
    createdBy: null, updatedBy: null,
    isDeleted: false, deletedAt: null, deletedBy: null,
  })
  return String(result.insertedId)
}

function buildMarkdown(imageIds) {
  // Pad to at least 6 images (repeating if needed) so all image blocks have content
  const pad = (n) => {
    if (!imageIds.length) return []
    const out = []
    for (let i = 0; i < n; i++) out.push(imageIds[i % imageIds.length])
    return out
  }
  const gallery6 = pad(6)
  const grid4 = pad(4)
  const slide3 = pad(3)

  const sections = []

  sections.push('# 모든 블록을 사용한 샘플 글')
  sections.push('이 글은 CMS에 등록된 10종 block을 모두 한 번에 보여주기 위한 샘플입니다. 위에서부터 순서대로 각 블록의 실제 렌더링을 확인할 수 있습니다.')

  sections.push('## 1. Notice — 공지 박스')
  sections.push(':::notice\ntype: info\n\n이것은 info 톤의 공지입니다. 작성자가 쓰는 일반적인 안내문이 들어갑니다.\n:::')
  sections.push(':::notice\ntype: warning\n\n중요한 사항을 환기시킬 때는 warning 톤을 사용합니다.\n:::')
  sections.push(':::notice\ntype: success\n\n등록이 완료되었습니다.\n:::')
  sections.push(':::notice\ntype: error\n\n파일 업로드에 실패했습니다.\n:::')

  sections.push('## 2. Highlight — 강조')
  sections.push(':::highlight\n핵심 메시지를 강조할 때 사용하는 amber 톤 박스입니다.\n:::')

  sections.push('## 3. Quote — 인용')
  sections.push(':::quote\ncite: 김 목사\n\n말씀이 곧 능력입니다. 우리 안에 거하시는 말씀이 우리를 새롭게 합니다.\n:::')

  sections.push('## 4. Button — 액션 버튼')
  sections.push('아래는 3가지 스타일의 버튼입니다.')
  sections.push(':::button\ntext: 자세히 보기\nurl: /post/sample-all-blocks\nstyle: primary\n:::')
  sections.push(':::button\ntext: 사이트 둘러보기\nurl: /\nstyle: secondary\n:::')
  sections.push(':::button\ntext: 행동 촉구\nurl: /\nstyle: warning\n:::')

  sections.push('## 5. YouTube — 영상 임베드')
  sections.push(':::youtube\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\n:::')

  if (gallery6.length) {
    sections.push('## 6. Gallery — 클릭 가능한 썸네일 그리드')
    sections.push(`:::gallery\nimageIds: ${JSON.stringify(gallery6)}\n:::`)
  } else {
    sections.push('## 6. Gallery (생략 — 등록된 이미지가 없습니다)')
  }

  if (grid4.length) {
    sections.push('## 7. Image Grid — 캡션 포함 그리드')
    const items = grid4.map((id, i) => ({ imageId: id, caption: `샘플 캡션 ${i + 1}` }))
    sections.push(`:::imageGrid\ncolumns: 2\ngap: medium\nitems: ${JSON.stringify(items)}\n:::`)
  }

  if (slide3.length) {
    sections.push('## 8. Slide — 좌우 네비게이션 캐러셀')
    const items = slide3.map((id, i) => ({
      imageId: id,
      title: `${i + 1}번 슬라이드`,
      desc: `슬라이드 설명 ${i + 1}번 — 좌우 버튼이나 하단 dot으로 이동할 수 있습니다.`,
    }))
    sections.push(`:::slide\nitems: ${JSON.stringify(items)}\n:::`)
  }

  sections.push('## 9. File — 파일 다운로드')
  sections.push(':::file\nname: 샘플 안내문 (PDF)\n\nhttps://example.com/sample-guide.pdf\n:::')

  sections.push('## 10. Map — 지도 임베드')
  sections.push(':::map\nlat: 37.5665\nlng: 126.9780\nzoom: 15\ntitle: 서울 시청\n:::')

  sections.push('## 마무리')
  sections.push('여기까지가 현재 CMS에 등록된 모든 block 유형의 렌더링 결과입니다. 새 block은 `shared/blocks/registry.js`에 schema 추가 + 서버 renderer + Vue component 한 쌍씩만 늘리면 됩니다.')

  return sections.join('\n\n')
}

async function run() {
  const db = await getMongoDb()

  // Replace existing sample if requested
  const existing = await db.collection('contents').findOne({
    slug: SAMPLE_SLUG, isDeleted: { $ne: true },
  })
  if (existing && replace) {
    console.log(`- replacing existing sample post ${existing._id}`)
    await deleteContent(String(existing._id), null)
  } else if (existing) {
    console.log(`! sample post already exists with slug "${SAMPLE_SLUG}" (id=${existing._id}).`)
    console.log(`  Re-run with --replace to overwrite. Aborting.`)
    process.exit(2)
  }

  // Collect resources
  const imageIds = await pickImages(6)
  console.log(`- found ${imageIds.length} image(s) in media collection`)
  if (imageIds.length === 0) {
    console.log(`  Image-based blocks (gallery/imageGrid/slide) will be skipped.`)
  }

  const categoryId = await ensureCategory()
  console.log(`- using category "Sample" (${categoryId})`)

  const tagIds = await findOrCreateTagsByNames(['sample', 'all-blocks', 'demo'], null)
  console.log(`- using ${tagIds.length} tag(s)`)

  // Resolve author by email
  let authorUser = null
  if (authorEmail) {
    authorUser = await db.collection('users').findOne({ email: authorEmail, isDeleted: { $ne: true } })
    if (!authorUser) {
      console.warn(`! no user with email "${authorEmail}" — leaving authorId null`)
    } else {
      console.log(`- author: ${authorUser.name || authorEmail} (${authorUser._id})`)
    }
  }
  const authorId = authorUser ? String(authorUser._id) : null

  const markdown = buildMarkdown(imageIds)
  const featured = imageIds[0] || null

  const post = await createContent({
    contentType: 'post',
    title: '모든 블록을 사용한 샘플 글',
    slug: SAMPLE_SLUG,
    summary: '10종 block(notice/highlight/quote/button/youtube/gallery/imageGrid/slide/file/map)을 한 글에 모두 사용한 데모입니다.',
    markdown,
    status: 'published',
    visibility: 'public',
    categoryIds: [categoryId],
    tagIds,
    thumbnailImageId: featured,
    meta: { featured: true },
  }, authorId)

  console.log()
  console.log(`✓ created sample post id=${post.id} slug=${post.slug}`)
  console.log(`  Public URL  : http://localhost:9001/post/${post.slug}`)
  console.log(`  API check   : http://localhost:9000/api/public/contents/${post.slug}?type=post`)
  console.log()
  console.log(`  Backend edit: http://localhost:9001/backend/posts  (open the row to edit)`)
  process.exit(0)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
