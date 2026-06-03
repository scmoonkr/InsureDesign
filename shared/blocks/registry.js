// Block registry — single source of truth for block types, options, defaults.
// Used by:
//   - api-server (parser/validator/renderer)
//   - app (BlockRenderer + posts editor)

export const INITIAL_BLOCK_NAMES = [
  'title',
  'notice', 'highlight', 'quote', 'youtube', 'button',
  'gallery', 'imageGrid', 'slide', 'file', 'map',
  'timeline',
  'row',
  'textCard',
  'heroCards',
  'iconList',
  'mediaText',
  'tabs',
  'postList',
  'image',
  // ── site-specific custom blocks ──
  'insuranceCalculator',
  'insurancePlanning',
  'insuranceAnalysis',
]

// Row layout tokens (mirrors the layout picker UI in BlockInsertModal).
// Each token splits on '-' into a list of column weights; the number of weights
// = the number of columns the row must contain. Arranged to fit a 4×3 picker.
export const ROW_LAYOUTS = [
  '1',
  '1-1', '1-2', '2-1',
  '1-1-1', '1-2-1', '2-1-1', '1-1-2',
  '1-1-1-1',
  '1-1-1-1-1-1',
  '1-1-1-1-1-1-1-1',
  '1-1-1-1-1-1-1-1-1-1-1-1',
]

// Per-block specs. requiresContent=true means body text is required.
// options[*].type: 'enum' | 'string' | 'url'
// Phase 1 implements notice only; others are placeholders so the registry is complete.
export const BLOCK_TYPES = {
  notice: {
    label: 'Notice',
    requiresContent: true,
    options: {
      type: { type: 'enum', values: ['info', 'warning', 'success', 'error'], default: 'info' },
    },
  },
  title: {
    label: 'Title Banner / Hero',
    requiresContent: false,
    allowsContent: true,                      // optional body = long-form description
    options: {
      title: { type: 'string', required: true },
      subtitle: { type: 'string' },
      imageId: { type: 'imageId' },           // background image (optional)
      backgroundColor: { type: 'color' },     // solid color fallback (optional)
      align: { type: 'enum', values: ['left', 'center', 'right'], default: 'center' },
      height: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      textColor: { type: 'enum', values: ['dark', 'light'], default: 'dark' },
      buttonText: { type: 'string' },
      buttonUrl: { type: 'string' },          // required-if-buttonText (custom check)
      buttonStyle: { type: 'enum', values: ['primary', 'secondary', 'warning'], default: 'primary' },
    },
  },
  highlight: { label: 'Highlight', requiresContent: true, options: {} },
  quote: {
    label: 'Quote',
    requiresContent: true,
    options: {
      cite: { type: 'string' },
    },
  },
  youtube: {
    label: 'YouTube',
    // content body = URL
    requiresContent: true,
    options: {},
  },
  button: {
    label: 'Button',
    requiresContent: false,
    options: {
      text: { type: 'string', required: true },
      url: { type: 'string', required: true },
      style: { type: 'enum', values: ['primary', 'secondary', 'warning'], default: 'primary' },
    },
  },
  image: {
    label: 'Image (single)',
    requiresContent: false,
    options: {
      imageId: { type: 'imageId', required: true },
      caption: { type: 'string' },                                        // optional <figcaption>
      width: { type: 'enum', values: ['normal', 'wide', 'full'], default: 'normal' },
      link: { type: 'string' },                                           // optional URL — image becomes a link
    },
  },
  gallery: {
    label: 'Gallery',
    requiresContent: false,
    options: {
      // JSON-encoded array of imageId strings, e.g. ["abc","def"]
      imageIds: { type: 'json-array', itemType: 'string', required: true, minItems: 1 },
    },
  },
  imageGrid: {
    label: 'Image Grid',
    requiresContent: false,
    options: {
      columns: { type: 'enum', values: ['2', '3', '4'], default: '3' },
      gap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      // JSON array of { imageId, caption }
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  slide: {
    label: 'Slide',
    requiresContent: false,
    options: {
      // JSON array of { imageId, title, desc }
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  file: {
    label: 'File',
    // content body = file URL (absolute or /uploads/... path)
    requiresContent: true,
    options: {
      name: { type: 'string' }, // display label override; falls back to filename from URL
    },
  },
  map: {
    label: 'Map',
    requiresContent: false,
    options: {
      lat: { type: 'number', required: true, min: -90, max: 90 },
      lng: { type: 'number', required: true, min: -180, max: 180 },
      zoom: { type: 'number', default: 15, min: 1, max: 19 },
      title: { type: 'string' },
    },
  },
  timeline: {
    label: 'Timeline',
    requiresContent: false,
    options: {
      // JSON array of { date, title, description, imageId? }
      // imageId is optional — items without it render text-only.
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  row: {
    label: 'Row Layout',
    requiresContent: false,
    // Container block: holds N columns of child blocks. `columns` is populated
    // by the parser (not a user-edited option) — it's a BlockNode[][] where the
    // outer length must equal layout.split('-').length.
    container: true,
    options: {
      layout: { type: 'enum', values: ROW_LAYOUTS, default: '1-1' },
      gap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
    },
  },
  textCard: {
    label: 'Text Card Grid',
    requiresContent: false,
    options: {
      columns: { type: 'enum', values: ['2', '3', '4'], default: '3' },
      gap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      backgroundColor: { type: 'color' },           // applies to every card unless item overrides
      textColor: { type: 'enum', values: ['dark', 'light'], default: 'dark' },
      // JSON array of { title, description, backgroundColor?, textColor? }
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  postList: {
    label: 'Post List (cards)',
    requiresContent: false,
    options: {
      // Comma-separated slugs. Empty = no filter on that axis.
      categories: { type: 'string' },
      tags: { type: 'string' },
      limit: { type: 'number', default: 6, min: 1, max: 24 },
      columns: { type: 'enum', values: ['2', '3', '4'], default: '3' },
      showFeatured: { type: 'enum', values: ['on', 'off'], default: 'on' },
      showAuthor: { type: 'enum', values: ['on', 'off'], default: 'on' },
      showDate: { type: 'enum', values: ['on', 'off'], default: 'on' },
      showExcerpt: { type: 'enum', values: ['on', 'off'], default: 'on' },
    },
  },
  tabs: {
    label: 'Tabs',
    requiresContent: false,
    options: {
      // JSON array of { label, title?, content? } — label is the tab button text,
      // title shows large on the left side of the panel, content fills the right side (inline markdown).
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  mediaText: {
    label: 'Media + Text (alternating)',
    requiresContent: false,
    options: {
      imageFrame: { type: 'enum', values: ['none', 'soft'], default: 'soft' },
      frameColor: { type: 'color' },                                        // soft frame bg color
      alternate: { type: 'enum', values: ['on', 'off'], default: 'on' },    // flip image side per row
      imagePosition: { type: 'enum', values: ['left', 'right'], default: 'left' },   // first row's image side
      gap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'large' },
      // JSON array of { imageId, title, description, list: string[] }
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  iconList: {
    label: 'Icon List',
    requiresContent: false,
    options: {
      columns: { type: 'enum', values: ['1', '2', '3'], default: '2' },
      gap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      iconColor: { type: 'color' },                                     // circle background
      iconTextColor: { type: 'enum', values: ['dark', 'light'], default: 'light' },
      // JSON array of { icon, title, description }
      // icon = any short string (emoji, single character, ▲ etc.) shown inside the badge
      items: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
    },
  },
  heroCards: {
    label: 'Hero + Cards',
    requiresContent: false,
    allowsContent: true,                           // optional description body under the title
    options: {
      eyebrow: { type: 'string' },                 // small overline above title
      title: { type: 'string', required: true },
      subtitle: { type: 'string' },
      imageId: { type: 'imageId' },                // background image
      backgroundColor: { type: 'color' },          // solid color / fallback
      align: { type: 'enum', values: ['left', 'center', 'right'], default: 'left' },
      height: { type: 'enum', values: ['small', 'medium', 'large'], default: 'large' },
      textColor: { type: 'enum', values: ['dark', 'light'], default: 'light' },
      buttonText: { type: 'string' },
      buttonUrl: { type: 'string' },
      buttonStyle: { type: 'enum', values: ['primary', 'secondary', 'warning'], default: 'primary' },
      // JSON array of { title, description, backgroundColor?, textColor? }
      cards: { type: 'json-array', itemType: 'object', required: true, minItems: 1 },
      cardColumns: { type: 'enum', values: ['2', '3', '4'], default: '3' },
      cardGap: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      cardOverlap: { type: 'enum', values: ['on', 'off'], default: 'on' },
    },
  },

  // ── site-specific custom blocks ──────────────────────────────
  insuranceCalculator: {
    label: '보험료 계산기',
    requiresContent: false,
    options: {
      title:       { type: 'string' },
      subtitle:    { type: 'string' },
      consultUrl:  { type: 'string' },
      defaultAge:  { type: 'number', min: 15, max: 70, default: 30 },
      defaultType: { type: 'enum', values: ['life', 'term', 'health', 'cancer'], default: 'life' },
    },
  },

  insurancePlanning: {
    label: '보험 설계 제안서',
    requiresContent: false,
    options: {
      id: { type: 'string', required: true },
    },
  },

  insuranceAnalysis: {
    label: '보험 설계 관리',
    requiresContent: false,
    options: {
      title: { type: 'string' },
    },
  },
}

export function isAllowedBlock(name, siteAllowed) {
  const allowed = (Array.isArray(siteAllowed) && siteAllowed.length)
    ? siteAllowed
    : INITIAL_BLOCK_NAMES
  return allowed.includes(name)
}
