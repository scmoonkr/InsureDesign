# 사이트 브랜딩 관리 (Logo · Favicon · Title)

사이트별 로고, 파비콘, 제목은 **Backend → Sites** 메뉴에서 관리합니다.

---

## 설정 위치

**Backend → Sites → (사이트 선택) → 외관 탭**

| 항목 | 필드명 | 설명 |
|---|---|---|
| 사이트 제목 | `siteName` | 상단 바 브랜드명, 브라우저 탭 제목 |
| 로고 이미지 | `logoUrl` | 상단 바 좌측 로고 이미지 |
| 파비콘 | `faviconUrl` | 브라우저 탭 아이콘 |

---

## 동작 방식

```
Backend Settings DB (settings 컬렉션)
        ↓
GET /api/public/site-config   (인증 불필요, 사이트 도메인 기준 자동 판별)
        ↓
useSiteConfig() composable    (useAsyncData로 캐싱, 앱 전체 공유)
        ↓
app.vue → useHead()           → 브라우저 탭 title / favicon
DefaultThemeTopbar.vue        → 로고 이미지 / 브랜드명
```

### 핵심 파일

| 파일 | 역할 |
|---|---|
| `api-server/settings-service.mjs` | DB 읽기/쓰기 (`getSiteConfig`, `updateSiteSettings`) |
| `api-server/index.mjs` | `GET /api/public/site-config` 엔드포인트 |
| `app/composables/useSiteConfig.ts` | 프론트엔드 전역 상태 (캐싱) |
| `app/app.vue` | `useHead`로 title·favicon 주입 |
| `app/components/public/DefaultThemeTopbar.vue` | 로고·브랜드명 렌더링 |

---

## logoUrl / faviconUrl 입력 형식

- **업로드 파일 경로**: `/uploads/sites/{siteId}/...` 형식 (업로드 후 자동 채워짐)
- **외부 URL**: `https://example.com/logo.png` 형식도 가능
- **미설정**: 로고는 `/themes/default/logo.png` 기본 이미지 사용, 파비콘은 브라우저 기본

---

## 멀티사이트 동작

도메인이 여러 개인 경우 요청 `Host` 헤더 → `sites` 컬렉션의 `domains` 배열 매칭 → 해당 `siteId`의 `settings` 문서를 반환합니다.

`DEFAULT_SITE_ID` 환경변수로 기본 사이트를 지정합니다 (`.env`).

---

## 변경 즉시 반영 여부

- **서버 사이드 렌더링(SSR)**: 페이지 요청 시마다 최신 값 반영
- **클라이언트 캐시**: `useAsyncData('site-config', ...)` 키로 세션 내 1회 fetch, 새로고침 시 재요청
