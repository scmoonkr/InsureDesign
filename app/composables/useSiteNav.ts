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
  const config = useRuntimeConfig()
  const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')

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
export type FooterColumn = {
  title: string
  body?: string
  links?: Array<{ label: string; to: string; target?: 'self' | 'blank' }>
}

export function useSiteFooterColumns() {
  const nav = useSiteNav('footer')
  return computed<FooterColumn[]>(() =>
    nav.value.map(item => ({
      title: item.label,
      links: (item.children || []).map(c => ({
        label: c.label,
        to: c.to,
        target: c.target,
      })),
    })),
  )
}
