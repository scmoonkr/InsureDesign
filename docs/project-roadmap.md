# project-roadmap.md

## Project Roadmap

현재 프로젝트는 문서 정리, DB collection/index 생성, 기본 디렉터리 구조 생성까지 완료된 상태이다.

이후 진행은 Nuxt 앱 실행 기반을 만든 뒤, MongoDB SDK 공통 모듈, 정책 상수, validator, service, API, UI 순서로 진행한다.

## 1. Nuxt 기본 앱 세팅

현재 `package.json`에는 MongoDB SDK만 있다.

먼저 Nuxt 실행 환경을 구성한다.

```txt
nuxt.config.ts
app.vue
기본 layout
dev/build/start script
```

필요 의존성:

```txt
nuxt
vue
typescript
```

## 2. 환경 변수 정리

`.env.example`을 실제 사용하는 변수명 기준으로 보강한다.

```env
PORT=
NUXT_PUBLIC_API_BASE=
SITE_URL=

MONGODB_ADDR=
MONGO_USERNAME=
MONGO_PWD=
MONGO_DBNAME=

JWT_SECRET=
SESSION_SECRET=
NUXT_SESSION_PASSWORD=

UPLOAD_DIR=
```

주의:

```txt
.env는 Git에 올리지 않는다.
.env 안의 실제 키/비밀번호 주석은 제거하거나 재발급한다.
```

## 3. MongoDB SDK 공통 모듈 작성

MongoDB 공식 Node.js Driver SDK만 사용한다. Mongoose는 사용하지 않는다.

권장 파일:

```txt
server/db/client.js
server/db/collections.js
server/db/indexes.js
```

역할:

```txt
MongoClient 재사용
DB 이름 선택
collection 이름 상수화
index 정의 재사용
```

기존 script는 가능하면 `server/db/indexes.js`를 재사용하도록 정리한다.

```txt
scripts/init-db-indexes.mjs
scripts/verify-db-indexes.mjs
```

## 4. Shared Constants 작성

정책상 허용 범위를 코드 상수로 고정한다.

권장 파일:

```txt
shared/constants/contentTypes.js
shared/constants/roles.js
shared/constants/blocks.js
shared/constants/templates.js
shared/constants/styleFamilies.js
```

초기 값:

```txt
contentTypes: post, page, notice, gallery
roles: super, admin, manager, writer, viewer
blocks: notice, highlight, quote, youtube, button, gallery, imageGrid, slide, file, map
```

## 5. Validators 작성

WordPress식 자유 편집을 막기 위해 저장 전 검증 계층을 먼저 만든다.

권장 파일:

```txt
server/validators/content.js
server/validators/markdownBlocks.js
server/validators/menu.js
server/validators/image.js
server/validators/permission.js
server/validators/site.js
```

검증 대상:

```txt
siteId 필수
허용된 contentType
허용된 block
허용된 template
허용된 styleFamily
임의 HTML/CSS 차단
다른 siteId의 imageId/categoryId/tagId 참조 차단
관리자 role 권한 확인
```

## 6. Core Services 작성

API handler에 DB 로직을 직접 넣지 않는다. 실제 처리는 service로 분리한다.

권장 service:

```txt
server/services/sites.js
server/services/contents.js
server/services/categories.js
server/services/tags.js
server/services/media.js
server/services/menus.js
server/services/users.js
```

우선 구현할 핵심 로직:

```txt
siteId 조회
title 기반 slug 자동 생성
slug 중복 suffix 처리
content revision 저장
published 이후 slug 변경 시 redirect 생성
image usedIn 갱신
```

## 7. Admin API 1차 구현

관리자 API는 `/api/admin/...` 아래에 둔다.

우선순위:

```txt
/api/admin/sites
/api/admin/contents
/api/admin/categories
/api/admin/tags
/api/admin/media
/api/admin/menus
```

관리자 API 필수 검증:

```txt
로그인 여부
role 권한
siteId 접근 권한
입력 schema validation
허용 Template/Block 범위
```

초기 개발 단계에서는 인증 완성 전까지 개발용 임시 user/site context를 둘 수 있다.

## 8. Public API 1차 구현

공개 API는 `/api/public/...` 아래에 둔다.

우선순위:

```txt
/api/public/site
/api/public/contents
/api/public/contents/:slug
/api/public/categories
/api/public/menus/:location
```

공개 API 필수 조건:

```txt
domain -> siteId 결정
status: published
visibility: public
isDeleted: false
```

## 9. Markdown Parser / Block Parser 구현

본문 저장 흐름:

```txt
markdown 입력
-> markdown parser
-> custom block parser
-> html 생성
-> blocks 생성
-> plainText 생성
-> searchText 생성
-> DB 저장
```

초기 지원 block:

```txt
notice
highlight
quote
youtube
button
gallery
imageGrid
slide
```

Block parser는 저장 전에 validator와 함께 동작해야 한다.

## 10. 관리자 화면 구현

API가 어느 정도 안정된 뒤 관리자 UI를 구현한다.

우선순위:

```txt
/admin
/admin/contents
/admin/contents/new
/admin/media
/admin/menus
/admin/settings
```

관리자 화면 원칙:

```txt
기능형 UI 우선
자유형 page builder 금지
Template 선택 UI 제공
StyleFamily 선택 UI 제공
허용 block 삽입 UI 제공
```

## 11. 공개 화면 구현

Template + StyleFamily 기반 공개 페이지를 구현한다.

우선순위:

```txt
/{contentType}/{slug}
post list
page detail
notice list
gallery detail
category list
menu render
```

공개 화면은 DB의 자유 스타일 값을 직접 신뢰하지 않고, 코드에 정의된 Template/StyleFamily만 사용한다.

## 12. Auth 구현

초기에는 local/admin 또는 개발용 세션으로 시작할 수 있다.

이후 아래 provider를 붙인다.

```txt
naver
kakao
```

필수 기능:

```txt
login
logout
session
role check
siteId permission
```

## 13. 이미지 업로드 구현

초기에는 local storage부터 구현한다.

처리 순서:

```txt
원본 저장
webp 변환
large/medium/thumb 생성
metadata 저장
hash 저장
media collection 저장
```

이후 storage provider를 분리한다.

```txt
local
s3
r2
idrive
```

## 14. 테스트 추가

초기 테스트는 정책이 깨지기 쉬운 영역부터 작성한다.

우선순위:

```txt
slug 중복 처리
siteId 권한 분리
block validation
public API published 필터
image siteId 검증
permission validation
```

## MVP 1차 목표

1차 개발 목표는 아래 범위로 제한한다.

```txt
Nuxt 앱 실행 가능
MongoDB 연결 가능
sites CRUD
contents CRUD
categories/tags CRUD
title 기반 slug 생성
Markdown 저장 및 html 캐시
public contents 조회
admin contents 작성 화면
공개 detail page 렌더링
```

## Recommended First Sprint

가장 먼저 진행할 순서:

```txt
Nuxt 기본 앱 세팅
-> server/db 공통 모듈
-> shared constants
-> validators 기본형
-> contents service + slug 생성
-> admin contents API
-> public contents API
```
