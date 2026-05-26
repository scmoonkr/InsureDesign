# AGENTS.md

## Project Overview

이 프로젝트는 Node.js + MongoDB + Vue/Nuxt 기반의 멀티사이트 CMS이다.

핵심 목표:

- Markdown 중심 CMS
- Minimal Block 확장
- 선택형 Template UI
- Style Family 기반 디자인
- siteId 기반 멀티사이트 구조
- WordPress식 자유 편집 금지

## Core Rules

- 모든 주요 데이터는 siteId 기준으로 분리한다.
- 관리자 API와 공개 API를 분리한다.
- Markdown을 본문 원본으로 사용한다.
- Block은 Markdown 안의 확장 문법으로 처리한다.
- 완전 자유형 page builder를 만들지 않는다.
- Template + StyleFamily 기반 구조를 유지한다.
- 디자인 자유도보다 안정성을 우선한다.

## Documents

세부 규칙은 아래 문서를 참고한다.

```txt
docs/schema.md
docs/markdown.md
docs/theme.md
docs/api.md
docs/auth.md
docs/image.md
docs/content.md
docs/menu.md
docs/search.md
```
