/**
 * 테마 표시용 메타데이터.
 * Vue 컴포넌트를 import하지 않으므로 admin 페이지에서 안전하게 사용 가능.
 * 새 테마 추가 시 themes/index.ts 와 이 파일을 함께 업데이트한다.
 */
export type ThemeMeta = {
  value: string
  label: string
  description: string
  previewColor: string
}

export const themesMeta: ThemeMeta[] = [
  {
    value: 'default',
    label: 'Default',
    description: 'Serif + Minimal black/white 디자인',
    previewColor: '#1a1a2e',
  },
]
