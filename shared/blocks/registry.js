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
]

// Row layout tokens (mirrors the layout picker UI in BlockInsertModal).
// Each token splits on '-' into a list of column weights; the number of weights
// = the number of columns the row must contain.
export const ROW_LAYOUTS = [
  '1',
  '1-1', '1-2', '2-1',
  '1-1-1', '1-2-1', '2-1-1', '1-1-2',
  '1-1-1-1',
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
    label: 'Title Banner',
    requiresContent: false,
    options: {
      title: { type: 'string', required: true },
      subtitle: { type: 'string' },
      imageId: { type: 'imageId' },           // background image (optional)
      backgroundColor: { type: 'color' },     // solid color fallback (optional)
      align: { type: 'enum', values: ['left', 'center', 'right'], default: 'center' },
      height: { type: 'enum', values: ['small', 'medium', 'large'], default: 'medium' },
      textColor: { type: 'enum', values: ['dark', 'light'], default: 'dark' },
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
}

export function isAllowedBlock(name, siteAllowed) {
  const allowed = (Array.isArray(siteAllowed) && siteAllowed.length)
    ? siteAllowed
    : INITIAL_BLOCK_NAMES
  return allowed.includes(name)
}
