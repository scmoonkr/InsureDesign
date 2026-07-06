# content.md

## Content Policy

본문 원본은 Markdown을 기준으로 한다.

```js
{
  markdown,
  html,
  blocks,
  plainText,
  searchText
}
```

- `markdown`: 작성자가 편집하는 원본 데이터
- `html`: 렌더링 결과 캐시
- `blocks`: Markdown 안의 확장 block 파싱 결과 캐시
- `plainText`: 검색과 미리보기에 사용하는 순수 텍스트
- `searchText`: 검색용 합성 문자열

수정은 항상 `markdown`을 기준으로 한다.

## Content Types

초기 지원 타입은 아래로 제한한다.

```txt
post
page
notice
gallery
```

타입별 특수 필드는 `meta`에 저장한다.

```js
{
  contentType: "notice",
  meta: {
    pinned: true,
    importantUntil: null
  }
}
```

## Type Meta

```js
post {
  categoryIds,
  tagIds,
  authorId
}
```

```js
page {
  parentId,
  template,
  showInMenu
}
```

```js
notice {
  pinned,
  importantUntil
}
```

```js
gallery {
  imageIds
}
```

## Status

```txt
draft
published
hidden
```

삭제 상태는 `status: "deleted"`로 표현하지 않고 soft delete 필드로 관리한다.

```js
{
  isDeleted,
  deletedAt,
  deletedBy
}
```

## Visibility

```txt
public
members
private
```

초기 공개 API는 `public`이고 `published` 상태인 콘텐츠만 반환한다.

## Publish Policy

```js
{
  publishedAt,
  scheduledAt,
  expiredAt
}
```

- `publishedAt`: 실제 공개 일시
- `scheduledAt`: 예약 공개 일시
- `expiredAt`: 공개 종료 일시

예약 발행은 초기에는 필수 기능이 아니지만 schema에는 반영한다.

## Slug Policy

- slug는 기본적으로 `title`에서 자동 생성한다.
- slug는 `siteId`별로 관리한다.
- 같은 사이트 안에서 slug가 중복되면 `-2`, `-3`, `-4` 순서로 suffix를 붙인다.
- 사용자는 slug를 직접 수정할 수 있다.
- published 이후 slug를 변경하면 이전 URL은 `redirects`에 저장한다.
- 삭제된 콘텐츠의 slug는 기본적으로 재사용하지 않는다.

예시:

```txt
church-news
church-news-2
church-news-3
```

## Revision Policy

콘텐츠 수정 시 이전 버전을 `contentRevisions`에 저장한다.

```js
{
  siteId,
  contentId,
  revisionNo,
  title,
  slug,
  markdown,
  html,
  blocks,
  plainText,
  editedBy,
  createdAt
}
```

초기 구현에서는 저장 시점마다 revision을 남기는 단순 정책을 우선한다.

## Design Freedom Policy

콘텐츠 작성자는 내용을 편집하고, 디자인 시스템은 InsureDesign가 통제한다.

허용:

```txt
Markdown 본문 작성
허용된 Block 삽입
Template 선택
StyleFamily 선택
이미지 업로드/선택
카테고리/태그 지정
메뉴 구성
```

금지:

```txt
임의 HTML 입력
임의 CSS 입력
drag/drop page builder
absolute positioning
사용자 지정 font-size/color/margin/padding
플러그인식 기능 확장
페이지별 완전 자유 레이아웃
```
