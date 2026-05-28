import { getTheme } from '~/themes'

export function useSiteTheme() {
  const themeName = useState<string>('siteTheme', () => 'default')
  const theme = computed(() => getTheme(themeName.value))
  return { themeName, theme }
}
