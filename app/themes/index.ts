import type { Component } from 'vue'
import DefaultThemeIndexPage from '~/components/public/DefaultThemeIndexPage.vue'
import DefaultThemeErrataPage from '~/components/public/DefaultThemeErrataPage.vue'

export type ThemeComponents = {
  indexPage: Component
  errataPage: Component
}

export type ThemeDefinition = {
  name: string
  label: string
  description: string
  components: ThemeComponents
}

export const themes: Record<string, ThemeDefinition> = {
  default: {
    name: 'default',
    label: 'Default',
    description: 'Serif + Minimal black/white 디자인',
    components: {
      indexPage: DefaultThemeIndexPage,
      errataPage: DefaultThemeErrataPage,
    },
  },
}

export function getTheme(name: string): ThemeDefinition {
  return themes[name] ?? themes.default
}
