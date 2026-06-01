// Fetch the site menu for a location (header/footer/sidebar) and return
// nav items ready to bind to <DefaultThemeTopbar :items="..."> / footer columns.
//
// When no menu is configured for the location, returns an empty array so the
// component can fall back to its own defaults.

type RawItem = {
  id: string
  title: string
  url: string
  target?: 'self' | 'blank'
  children?: RawItem[]
}

export type NavItem = {
  label: string
  to: string
  target?: 'self' | 'blank'
  current?: boolean
  /** Empty URL means this is a non-clickable section header (대표메뉴). */
  isHeader?: boolean
  children?: NavItem[]
}

function toNav(it: RawItem): NavItem {
  return {
    label: it.title,
    to: it.url || '#',
    target: it.target,
    isHeader: !it.url,
    children: (it.children || []).map(toNav),
  }
}

export function useSiteNav(location: 'header' | 'footer' | 'sidebar' = 'header') {
  const apiBase = useApiBase()

  const { data } = useFetch<{ menu: { items: RawItem[] } | null }>(
    `${apiBase}/api/public/menus/${location}`,
    {
      key: `public-nav-${location}`,
      default: () => ({ menu: null }),
    },
  )

  return computed<NavItem[]>(() => (data.value?.menu?.items || []).map(toNav))
}

// For a footer rendered as columns: top-level menu items become column headers,
// their children become link lists under that column.
// When the footer menu is flat (no children, no section headers — e.g., copied
// from the main header menu), collapse everything into a single row of links
// so the footer reads as a horizontal nav strip rather than empty column titles.
export type FooterColumn = {
  title: string
  /** When set, the column header is rendered as a link (NuxtLink). */
  titleTo?: string
  titleTarget?: 'self' | 'blank'
  body?: string
  links?: Array<{ label: string; to: string; target?: 'self' | 'blank' }>
  /** 'row' lays the column's links out horizontally; default is column. */
  layout?: 'row' | 'column'
}

export function useSiteFooterColumns() {
  const nav = useSiteNav('footer')
  return computed<FooterColumn[]>(() => {
    const items = nav.value
    if (!items.length) return []

    const isFlat = items.every(it => !it.isHeader && !(it.children && it.children.length))
    if (isFlat) {
      return [{
        title: '',
        layout: 'row',
        links: items.map(it => ({ label: it.label, to: it.to, target: it.target })),
      }]
    }

    // Column mode: each top-level item becomes a column. When the item has a URL
    // (not a 대표메뉴/header-only entry) we expose it via titleTo so the renderer
    // can wrap the heading in a clickable link.
    return items.map(item => ({
      title: item.label,
      titleTo: item.isHeader ? undefined : item.to,
      titleTarget: item.target,
      links: (item.children || []).map(c => ({
        label: c.label,
        to: c.to,
        target: c.target,
      })),
    }))
  })
}
