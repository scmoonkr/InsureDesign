export function useBackendMenu() {
  const navItems = [
    { label: 'The Index', to: '/' },
    { label: 'The Errata', to: '/errata' },
    { label: 'Backend', to: '/backend', current: true },
    { label: 'Admin', to: '/admin' },
  ]

  const menuItems = [
    { key: 'contents', label: 'Contents', to: '/backend/contents' },
    { key: 'media', label: 'Media', to: '/backend/media' },
    { key: 'users', label: 'Users', to: '/backend/users' },
    { key: 'theme', label: 'Theme', to: '/backend/theme' },
    { key: 'sites', label: 'Sites', to: '/backend/sites' },
    { key: 'foundation', label: 'Foundation', to: '/backend/foundation' },
  ]

  return { navItems, menuItems }
}
