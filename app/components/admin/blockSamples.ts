// Sample data registry — every block type gets a self-contained `{ block, mediaMap, markdown }`
// triple so the editor can both PREVIEW the block (via BlockRenderer) and INSERT a ready-to-edit
// markdown snippet at the cursor when the author clicks "이 sample 삽입".
//
// `mediaMap` keys match `imageId` values used by the sample block. We point them at picsum.photos
// seeded URLs so previews render without touching real media docs.

export type BlockNode = { type: string; props: Record<string, unknown> }
export type SampleMediaInfo = {
  paths?: { original?: string }
  title?: string
  alt?: string
}
export type BlockSample = {
  label: string                                 // shown in modal header
  block: BlockNode                              // rendered via BlockRenderer for preview
  mediaMap?: Record<string, SampleMediaInfo>    // image lookups referenced by the sample
  markdown: string                              // inserted at cursor on "Insert sample"
}

const PIC = (seed: string, w = 600, h = 400) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`

export const BLOCK_SAMPLES: Record<string, BlockSample> = {
  // ───────────────────────────────────────────────────────────────────────────
  // Title Banner / Hero — image background + eyebrow-less hero with CTA
  // ───────────────────────────────────────────────────────────────────────────
  title: {
    label: 'Title Banner / Hero',
    block: {
      type: 'title',
      props: {
        title: 'Briefly explain what you do.',
        subtitle: 'A short supporting line under the title.',
        content: 'Use this space for a longer paragraph that describes your offering in more detail. Inline **markdown** is supported.',
        imageId: 'sample-title-bg',
        align: 'center',
        height: 'medium',
        textColor: 'light',
        buttonText: 'Get Started',
        buttonUrl: '/start',
        buttonStyle: 'primary',
      },
    },
    mediaMap: {
      'sample-title-bg': { paths: { original: PIC('title-banner', 1400, 600) } },
    },
    markdown: `:::title
title: Briefly explain what you do.
subtitle: A short supporting line under the title.
align: center
height: medium
textColor: light
buttonText: Get Started
buttonUrl: /start

Use this space for a longer paragraph that describes your offering in more detail. Inline **markdown** is supported.
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Notice — info banner with type variants
  // ───────────────────────────────────────────────────────────────────────────
  notice: {
    label: 'Notice',
    block: {
      type: 'notice',
      props: {
        type: 'info',
        content: '시스템 점검이 예정되어 있습니다. 6월 1일 새벽 2시~4시 사이 서비스가 일시 중단됩니다.',
      },
    },
    markdown: `:::notice
type: info

시스템 점검이 예정되어 있습니다. 6월 1일 새벽 2시~4시 사이 서비스가 일시 중단됩니다.
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Highlight — call-out box for important content
  // ───────────────────────────────────────────────────────────────────────────
  highlight: {
    label: 'Highlight',
    block: {
      type: 'highlight',
      props: {
        content: '이 단락이 글에서 가장 강조하고 싶은 핵심 메시지입니다. **굵게**나 *기울임*도 사용 가능합니다.',
      },
    },
    markdown: `:::highlight
이 단락이 글에서 가장 강조하고 싶은 핵심 메시지입니다. **굵게**나 *기울임*도 사용 가능합니다.
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Quote — pull quote with optional citation
  // ───────────────────────────────────────────────────────────────────────────
  quote: {
    label: 'Quote',
    block: {
      type: 'quote',
      props: {
        cite: 'Steve Jobs',
        content: 'Design is not just what it looks like and feels like. Design is how it works.',
      },
    },
    markdown: `:::quote
cite: Steve Jobs

Design is not just what it looks like and feels like. Design is how it works.
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // YouTube — embedded video (uses youtube-nocookie iframe)
  // ───────────────────────────────────────────────────────────────────────────
  youtube: {
    label: 'YouTube',
    block: {
      type: 'youtube',
      props: {
        // "Me at the zoo" — the first YouTube video ever uploaded; safe + always-available sample
        content: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
      },
    },
    markdown: `:::youtube
https://www.youtube.com/watch?v=jNQXAC9IVRw
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Button — standalone CTA link styled as a button
  // ───────────────────────────────────────────────────────────────────────────
  button: {
    label: 'Button',
    block: {
      type: 'button',
      props: {
        text: '자세히 보기',
        url: '/about',
        style: 'primary',
      },
    },
    markdown: `:::button
text: 자세히 보기
url: /about
style: primary
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Image — single full-width image with optional caption + link
  // ───────────────────────────────────────────────────────────────────────────
  image: {
    label: 'Image (single)',
    block: {
      type: 'image',
      props: {
        imageId: 's-image-1',
        caption: '이미지 설명을 여기에 적습니다 (선택).',
        width: 'wide',
      },
    },
    mediaMap: {
      's-image-1': { paths: { original: PIC('single-image', 1400, 700) }, alt: 'Sample image' },
    },
    markdown: `:::image
imageId: <your-image-id>
caption: 이미지 설명을 여기에 적습니다 (선택).
width: wide
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Gallery — masonry-ish set of images that link to full size
  // ───────────────────────────────────────────────────────────────────────────
  gallery: {
    label: 'Gallery',
    block: {
      type: 'gallery',
      props: {
        imageIds: ['s-gal-1', 's-gal-2', 's-gal-3', 's-gal-4', 's-gal-5', 's-gal-6'],
      },
    },
    mediaMap: {
      's-gal-1': { paths: { original: PIC('gallery-1') }, alt: 'Sample 1' },
      's-gal-2': { paths: { original: PIC('gallery-2') }, alt: 'Sample 2' },
      's-gal-3': { paths: { original: PIC('gallery-3') }, alt: 'Sample 3' },
      's-gal-4': { paths: { original: PIC('gallery-4') }, alt: 'Sample 4' },
      's-gal-5': { paths: { original: PIC('gallery-5') }, alt: 'Sample 5' },
      's-gal-6': { paths: { original: PIC('gallery-6') }, alt: 'Sample 6' },
    },
    // Real galleries use the image picker to pick media IDs from the site library —
    // this sample is preview-only; users insert via the picker, not the markdown below.
    markdown: `:::gallery
imageIds: ["<your-image-id-1>","<your-image-id-2>","<your-image-id-3>"]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Image Grid — uniform cells with captions, columns configurable
  // ───────────────────────────────────────────────────────────────────────────
  imageGrid: {
    label: 'Image Grid',
    block: {
      type: 'imageGrid',
      props: {
        columns: '3',
        gap: 'medium',
        items: [
          { imageId: 's-grid-1', caption: '첫 번째 사진' },
          { imageId: 's-grid-2', caption: '두 번째 사진' },
          { imageId: 's-grid-3', caption: '세 번째 사진' },
          { imageId: 's-grid-4', caption: '네 번째 사진' },
          { imageId: 's-grid-5', caption: '다섯 번째 사진' },
          { imageId: 's-grid-6', caption: '여섯 번째 사진' },
        ],
      },
    },
    mediaMap: {
      's-grid-1': { paths: { original: PIC('grid-1') } },
      's-grid-2': { paths: { original: PIC('grid-2') } },
      's-grid-3': { paths: { original: PIC('grid-3') } },
      's-grid-4': { paths: { original: PIC('grid-4') } },
      's-grid-5': { paths: { original: PIC('grid-5') } },
      's-grid-6': { paths: { original: PIC('grid-6') } },
    },
    markdown: `:::imageGrid
columns: 3
gap: medium
items: [
  {"imageId":"<image-id-1>","caption":"첫 번째 사진"},
  {"imageId":"<image-id-2>","caption":"두 번째 사진"},
  {"imageId":"<image-id-3>","caption":"세 번째 사진"}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Slide — horizontal slideshow with title/desc per slide
  // ───────────────────────────────────────────────────────────────────────────
  slide: {
    label: 'Slide',
    block: {
      type: 'slide',
      props: {
        items: [
          { imageId: 's-slide-1', title: '첫 슬라이드', desc: '슬라이드 설명을 여기에 적습니다.' },
          { imageId: 's-slide-2', title: '두 번째 슬라이드', desc: '두 번째 설명.' },
          { imageId: 's-slide-3', title: '세 번째 슬라이드', desc: '세 번째 설명.' },
        ],
      },
    },
    mediaMap: {
      's-slide-1': { paths: { original: PIC('slide-1', 1200, 600) } },
      's-slide-2': { paths: { original: PIC('slide-2', 1200, 600) } },
      's-slide-3': { paths: { original: PIC('slide-3', 1200, 600) } },
    },
    markdown: `:::slide
items: [
  {"imageId":"<image-id-1>","title":"첫 슬라이드","desc":"슬라이드 설명을 여기에 적습니다."},
  {"imageId":"<image-id-2>","title":"두 번째 슬라이드","desc":"두 번째 설명."},
  {"imageId":"<image-id-3>","title":"세 번째 슬라이드","desc":"세 번째 설명."}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // File — download link card (PDF/doc/etc.) — content body = URL
  // ───────────────────────────────────────────────────────────────────────────
  file: {
    label: 'File',
    block: {
      type: 'file',
      props: {
        name: '회사 소개서 (Sample)',
        content: '/uploads/sample/company-intro.pdf',
      },
    },
    markdown: `:::file
name: 회사 소개서 (Sample)

/uploads/sample/company-intro.pdf
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Map — OpenStreetMap embed centered on a lat/lng with marker + zoom
  // ───────────────────────────────────────────────────────────────────────────
  map: {
    label: 'Map',
    block: {
      type: 'map',
      props: {
        // N서울타워 (Namsan Seoul Tower) — well-known landmark for a clear sample
        lat: 37.5512,
        lng: 126.9882,
        zoom: 15,
        title: 'N서울타워',
      },
    },
    markdown: `:::map
lat: 37.5512
lng: 126.9882
zoom: 15
title: N서울타워
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Timeline — vertical event timeline with date/title/desc per entry
  // ───────────────────────────────────────────────────────────────────────────
  timeline: {
    label: 'Timeline',
    block: {
      type: 'timeline',
      props: {
        items: [
          {
            date: '2024 - 03',
            title: '회사 설립',
            description: '서울 강남구에서 3명의 공동창업자로 회사를 설립했습니다.',
            imageId: '',
          },
          {
            date: '2024 - 09',
            title: '첫 제품 출시',
            description: 'MVP 버전의 첫 제품을 출시해 100명의 베타 사용자를 확보했습니다.',
            imageId: '',
          },
          {
            date: '2025 - 05',
            title: '시리즈 A 투자 유치',
            description: '20억 원 규모의 시리즈 A 라운드를 마무리하며 본격적인 성장 단계에 진입했습니다.',
            imageId: '',
          },
          {
            date: '2026 - 01',
            title: '글로벌 진출',
            description: '일본·동남아시아 시장에 정식 론칭, 첫 해외 고객사 30곳과 계약을 체결했습니다.',
            imageId: '',
          },
        ],
      },
    },
    markdown: `:::timeline
items: [
  {"date":"2024 - 03","title":"회사 설립","description":"서울 강남구에서 3명의 공동창업자로 회사를 설립했습니다.","imageId":""},
  {"date":"2024 - 09","title":"첫 제품 출시","description":"MVP 버전의 첫 제품을 출시해 100명의 베타 사용자를 확보했습니다.","imageId":""},
  {"date":"2025 - 05","title":"시리즈 A 투자 유치","description":"20억 원 규모의 시리즈 A 라운드를 마무리하며 본격적인 성장 단계에 진입했습니다.","imageId":""},
  {"date":"2026 - 01","title":"글로벌 진출","description":"일본·동남아시아 시장에 정식 론칭, 첫 해외 고객사 30곳과 계약을 체결했습니다.","imageId":""}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Row layout — container with 2 columns (1:2), each holding child blocks
  // Note: `columns` is normally populated by the parser from nested `:::col`
  // fences. For preview we hand-construct the nested BlockNode tree.
  // ───────────────────────────────────────────────────────────────────────────
  row: {
    label: 'Row Layout (1-2)',
    block: {
      type: 'row',
      props: {
        layout: '1-2',
        gap: 'medium',
        columns: [
          [
            { type: 'highlight', props: { content: '왼쪽 컬럼에는 짧은 highlight가 들어있습니다.' } },
          ],
          [
            { type: 'text', props: { markdown: '## 오른쪽 컬럼\n\n오른쪽은 더 넓은 영역으로, 본문과 추가 블록을 자유롭게 조합할 수 있습니다.' } },
            { type: 'button', props: { text: '자세히 보기', url: '/x', style: 'primary' } },
          ],
        ],
      },
    },
    markdown: `:::row
layout: 1-2
gap: medium

:::col
:::highlight
왼쪽 컬럼에는 짧은 highlight가 들어있습니다.
:::
:::

:::col
## 오른쪽 컬럼

오른쪽은 더 넓은 영역으로, 본문과 추가 블록을 자유롭게 조합할 수 있습니다.

:::button
text: 자세히 보기
url: /x
style: primary
:::
:::

:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Text Card Grid — uniform colored cards with title + description
  // ───────────────────────────────────────────────────────────────────────────
  textCard: {
    label: 'Text Card Grid',
    block: {
      type: 'textCard',
      props: {
        columns: '3',
        gap: 'medium',
        backgroundColor: '#5d7e8d',
        textColor: 'light',
        items: [
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
        ],
      },
    },
    markdown: `:::textCard
columns: 3
gap: medium
backgroundColor: #5d7e8d
textColor: light
items: [
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."},
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."},
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Hero + Cards — full-width hero with overlapping card row at the bottom
  // ───────────────────────────────────────────────────────────────────────────
  heroCards: {
    label: 'Hero + Cards',
    block: {
      type: 'heroCards',
      props: {
        eyebrow: 'ADD AN OVERLINE TEXT',
        title: 'Briefly and concisely explain what you do for your audience.',
        imageId: 's-herocards-bg',
        align: 'left',
        height: 'large',
        textColor: 'light',
        cardColumns: '3',
        cardGap: 'medium',
        cardOverlap: 'on',
        cards: [
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
          { title: 'Add a Title', description: 'Use this space to add a medium length description. Be brief and give enough information to earn a click.' },
        ],
      },
    },
    mediaMap: {
      's-herocards-bg': { paths: { original: PIC('herocards-bg', 1600, 800) } },
    },
    markdown: `:::heroCards
eyebrow: ADD AN OVERLINE TEXT
title: Briefly and concisely explain what you do for your audience.
align: left
height: large
textColor: light
cardColumns: 3
cardGap: medium
cardOverlap: on
cards: [
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."},
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."},
  {"title":"Add a Title","description":"Use this space to add a medium length description. Be brief and give enough information to earn a click."}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Icon List — 2-column feature list with circular icon badges
  // ───────────────────────────────────────────────────────────────────────────
  iconList: {
    label: 'Icon List',
    block: {
      type: 'iconList',
      props: {
        columns: '2',
        gap: 'medium',
        iconColor: '#3d7e7c',
        iconTextColor: 'light',
        items: [
          { icon: 'ⓘ', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
          { icon: '⏱', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
          { icon: '🔊', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
          { icon: '★', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
          { icon: '◆', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
          { icon: '✓', title: 'Give your list item a title', description: 'Use this short paragraph to write a supporting description of your list item.' },
        ],
      },
    },
    markdown: `:::iconList
columns: 2
gap: medium
iconColor: #3d7e7c
iconTextColor: light
items: [
  {"icon":"ⓘ","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."},
  {"icon":"⏱","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."},
  {"icon":"🔊","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."},
  {"icon":"★","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."},
  {"icon":"◆","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."},
  {"icon":"✓","title":"Give your list item a title","description":"Use this short paragraph to write a supporting description of your list item."}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Media + Text (alternating) — image+text rows that flip L/R
  // ───────────────────────────────────────────────────────────────────────────
  mediaText: {
    label: 'Media + Text (alternating)',
    block: {
      type: 'mediaText',
      props: {
        imageFrame: 'soft',
        frameColor: '#d8efe5',
        alternate: 'on',
        imagePosition: 'left',
        gap: 'large',
        items: [
          {
            imageId: 's-mt-1',
            title: 'Add a descriptive title for the column.',
            description: 'Use this space to add a medium length description. Be brief and give enough information to earn their attention.',
            list: ['Add a list item', 'Add a list item', 'Add a list item'],
          },
          {
            imageId: 's-mt-2',
            title: 'Add a descriptive title for the column.',
            description: 'Use this space to add a medium length description. Be brief and give enough information to earn their attention.',
            list: ['Add a list item', 'Add a list item', 'Add a list item'],
          },
        ],
      },
    },
    mediaMap: {
      's-mt-1': { paths: { original: PIC('mediatext-1', 800, 600) } },
      's-mt-2': { paths: { original: PIC('mediatext-2', 800, 600) } },
    },
    markdown: `:::mediaText
imageFrame: soft
frameColor: #d8efe5
alternate: on
imagePosition: left
gap: large
items: [
  {"imageId":"<image-id-1>","title":"Add a descriptive title for the column.","description":"Use this space to add a medium length description. Be brief and give enough information to earn their attention.","list":["Add a list item","Add a list item","Add a list item"]},
  {"imageId":"<image-id-2>","title":"Add a descriptive title for the column.","description":"Use this space to add a medium length description. Be brief and give enough information to earn their attention.","list":["Add a list item","Add a list item","Add a list item"]}
]
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Post List — published posts filtered by category/tag, rendered as cards.
  // Preview uses real data from /api/public/post-cards (no filters → 6 latest posts).
  // ───────────────────────────────────────────────────────────────────────────
  postList: {
    label: 'Post List (cards)',
    block: {
      type: 'postList',
      props: {
        categories: '',
        tags: '',
        limit: 6,
        columns: '3',
        showFeatured: 'on',
        showAuthor: 'on',
        showDate: 'on',
        showExcerpt: 'on',
      },
    },
    markdown: `:::postList
categories:
tags:
limit: 6
columns: 3
showFeatured: on
showAuthor: on
showDate: on
showExcerpt: on
:::`,
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Tabs — clickable tab bar with 2-column panel (left title, right body)
  // ───────────────────────────────────────────────────────────────────────────
  tabs: {
    label: 'Tabs',
    block: {
      type: 'tabs',
      props: {
        items: [
          {
            label: 'Tab name',
            title: 'Type a brief and clear title for this panel.',
            content: 'Write a short descriptive paragraph about your tab that will help users find what they are looking for and get access to content without further exploration.\n\n**Featured subhead**\n\n- Add a single and succinct list item\n- Add a single and succinct list item\n- Add a single and succinct list item',
          },
          {
            label: 'Tab name',
            title: 'Second panel title.',
            content: 'Each tab is independent — fill it with markdown and the panel switches when the tab is clicked.\n\n- Bullet item one\n- Bullet item two',
          },
          {
            label: 'Tab name',
            title: 'Third panel title.',
            content: 'You can put **bold**, *italic*, `code` and [links](https://example.com) here too.',
          },
        ],
      },
    },
    markdown: `:::tabs
items: [
  {"label":"Tab name","title":"Type a brief and clear title for this panel.","content":"Write a short descriptive paragraph about your tab that will help users find what they are looking for and get access to content without further exploration.\\n\\n**Featured subhead**\\n\\n- Add a single and succinct list item\\n- Add a single and succinct list item\\n- Add a single and succinct list item"},
  {"label":"Tab name","title":"Second panel title.","content":"Each tab is independent — fill it with markdown and the panel switches when the tab is clicked.\\n\\n- Bullet item one\\n- Bullet item two"},
  {"label":"Tab name","title":"Third panel title.","content":"You can put **bold**, *italic*, \`code\` and [links](https://example.com) here too."}
]
:::`,
  },
}
