export function useBackendMenu() {
  const navItems = [
    { label: 'The Index', to: '/' },
    { label: 'The Errata', to: '/errata' },
    { label: 'Backend', to: '/backend', current: true },
    { label: 'Admin', to: '/admin' },
  ]

  const menuItems = [
    { key: 'posts', label: 'Posts', to: '/backend/posts' },
    { key: 'pages', label: 'Pages', to: '/backend/pages' },
    { key: 'categories', label: 'Categories', to: '/backend/categories' },
    { key: 'menus', label: 'Menus', to: '/backend/menus' },
    { key: 'media', label: 'Media', to: '/backend/media' },
    { key: 'users', label: 'Users', to: '/backend/users' },
    { key: 'theme', label: 'Theme', to: '/backend/theme' },
    { key: 'sites', label: 'Sites', to: '/backend/sites' },
    { key: 'foundation', label: 'Foundation', to: '/backend/foundation' },
    { key: 'analysis', label: 'Insurance Analysis', to: '/backend/analysis' },
  ]

  return { navItems, menuItems }
}
