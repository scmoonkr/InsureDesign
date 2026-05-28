# api.md

## API Structure

관리자 API와 공개 API는 분리한다.

```txt
/api/admin/...
/api/public/...
```

## Admin API

관리자 API는 아래 조건을 모두 확인한다.

```txt
로그인 여부
role 권한
siteId 접근 권한
입력 schema validation
허용 Template/Block 범위
```

예시:

```txt
/api/admin/sites
/api/admin/contents
/api/admin/media
/api/admin/menus
```

## Public API

공개 API는 현재 domain 기준으로 `siteId`를 결정한다.

```txt
request host
-> sites.domains.host 조회
-> siteId 결정
-> published/public 데이터만 반환
```

공개 API는 아래 조건을 만족하는 콘텐츠만 반환한다.

```js
{
  siteId,
  status: "published",
  visibility: "public",
  isDeleted: false
}
```

예시:

```txt
/api/public/contents
/api/public/contents/:slug
/api/public/categories
/api/public/menus/:location
```

## URL Policy

초기 공개 URL은 contentType과 slug를 조합하는 방식을 기본으로 한다.

```txt
/{contentType}/{slug}
```

예:

```txt
/post/church-news
/page/about
/notice/service-time
/gallery/summer-camp
```

고정 페이지는 필요할 경우 alias URL을 별도로 허용할 수 있다.

## Slug Conflict API Policy

콘텐츠 저장 시 slug는 서버에서 최종 확정한다.

```txt
title 입력
-> base slug 생성
-> siteId + slug 중복 확인
-> 중복 시 -2, -3 suffix 부여
-> unique index 충돌 시 재시도
```

관리자가 slug를 직접 입력하더라도 최종 중복 검사는 서버에서 수행한다.

## Redirect Policy

published 이후 slug가 변경되면 이전 URL을 `redirects` 컬렉션에 저장한다.

```js
{
  siteId,
  fromPath,
  toPath,
  statusCode: 301,
  contentId
}
```

## Validation Policy

API는 저장 전에 아래를 검증한다.

```txt
siteId 권한
contentType 허용 여부
template 허용 여부
block 허용 여부
imageId siteId 일치 여부
categoryId/tagId siteId 일치 여부
임의 HTML/CSS 포함 여부
```
