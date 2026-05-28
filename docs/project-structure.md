# project-structure.md

## Project Structure Policy

이 프로젝트는 Nuxt 기반 단일 앱 구조를 기본으로 한다.

프론트엔드 화면, 서버 API, MongoDB 접근 코드, 공통 상수, 정책 검증 코드를 한 저장소 안에서 관리하되, 역할별 경계를 명확히 나눈다.

핵심 원칙:

```txt
관리자 API와 공개 API를 분리한다.
MongoDB SDK 접근 코드는 server/db에 모은다.
비즈니스 로직은 server/services에 둔다.
정책 검증은 server/validators에 둔다.
프론트와 서버가 공유하는 값은 shared에 둔다.
MVP 정적 파일은 참고 자료로만 유지한다.
```

## Directory Layout

```txt
CMS/
├─ app/
│  ├─ assets/
│  ├─ components/
│  │  ├─ admin/
│  │  ├─ public/
│  │  └─ blocks/
│  ├─ composables/
│  ├─ layouts/
│  ├─ middleware/
│  ├─ pages/
│  │  ├─ admin/
│  │  └─ public/
│  └─ plugins/
│
├─ server/
│  ├─ api/
│  │  ├─ admin/
│  │  └─ public/
│  ├─ db/
│  ├─ middleware/
│  ├─ services/
│  ├─ utils/
│  └─ validators/
│
├─ shared/
│  ├─ constants/
│  ├─ schemas/
│  └─ types/
│
├─ scripts/
├─ tests/
│  ├─ integration/
│  └─ unit/
│
├─ docs/
├─ MVP/
├─ uploads/
├─ nuxt.config.ts
├─ package.json
└─ package-lock.json
```

## app

Nuxt/Vue 프론트엔드 영역이다.

```txt
app/assets      CSS, 이미지, 정적 프론트 자산
app/components  Vue component
app/composables Vue composable
app/layouts     public/admin layout
app/middleware  route middleware
app/pages       route page
app/plugins     Nuxt plugin
```

Component는 역할별로 나눈다.

```txt
components/admin   관리자 화면 전용 component
components/public  공개 사이트 전용 component
components/blocks  Markdown block 렌더링 component
```

## server

Nuxt Nitro 서버 영역이다.

```txt
server/api/admin    관리자 API
server/api/public   공개 API
server/db           MongoDB SDK 연결, collection, index 정의
server/services     콘텐츠/이미지/메뉴/사이트 비즈니스 로직
server/validators   schema, block, 권한, siteId 검증
server/middleware   서버 요청 middleware
server/utils        서버 공통 helper
```

API handler는 가볍게 유지하고, 실제 처리는 service와 validator로 위임한다.

## server/db

MongoDB 공식 Node.js Driver SDK만 사용한다. Mongoose는 사용하지 않는다.

권장 파일:

```txt
server/db/client.js       MongoClient 생성 및 재사용
server/db/collections.js  collection 이름 상수
server/db/indexes.js      collection/index 정의
```

DB 초기화 script는 가능하면 `server/db/indexes.js`를 재사용한다.

## server/api

관리자 API와 공개 API는 반드시 분리한다.

```txt
server/api/admin/...
server/api/public/...
```

관리자 API는 아래를 확인한다.

```txt
로그인 여부
role 권한
siteId 접근 권한
입력 schema validation
허용 Template/Block 범위
```

공개 API는 domain 기준으로 `siteId`를 결정하고 `published/public` 데이터만 반환한다.

## server/services

비즈니스 로직을 담당한다.

권장 service:

```txt
contents
images
menus
sites
users
```

예:

```txt
slug 자동 생성
slug 중복 suffix 처리
revision 저장
redirect 생성
image usedIn 갱신
```

## server/validators

정책상 허용된 범위만 저장되도록 검증한다.

권장 validator:

```txt
content
markdownBlocks
menu
image
permission
site
```

검증 대상:

```txt
임의 HTML/CSS 금지
허용되지 않은 block 금지
다른 siteId의 imageId/categoryId/tagId 참조 금지
허용되지 않은 template/styleFamily 금지
관리자 role 권한 확인
```

## shared

프론트와 서버가 같이 쓰는 상수, 타입, schema를 둔다.

권장 파일:

```txt
shared/constants/contentTypes.js
shared/constants/roles.js
shared/constants/blocks.js
shared/constants/templates.js
shared/constants/styleFamilies.js
```

## scripts

운영/개발 보조 스크립트를 둔다.

현재 역할:

```txt
init-db-indexes.mjs     CMS DB collection/index 생성
verify-db-indexes.mjs   CMS DB collection/index 확인
```

## tests

초기 테스트는 아래 영역을 우선한다.

```txt
slug 중복 처리
siteId 권한 분리
block validation
public API published 필터
image siteId 검증
```

## MVP

`MVP/`는 참고용 정적 시안 자료이다.

실제 Nuxt 앱 구현 코드는 `app/`, `server/`, `shared/`에 둔다. MVP 파일을 직접 운영 코드로 사용하지 않는다.

## uploads

개발용 로컬 업로드 저장소이다.

운영 환경에서는 S3, R2, iDrive 같은 object storage를 사용할 수 있도록 storage provider를 분리한다.
