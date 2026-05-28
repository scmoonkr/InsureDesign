# search.md

## Search Policy

초기 검색은 `searchText` 기반의 단순 검색으로 시작한다.

```js
searchText =
  title + summary + plainText + tags
```

검색 대상은 공개 API 기준으로 아래 조건을 만족해야 한다.

```js
{
  siteId,
  status: "published",
  visibility: "public",
  isDeleted: false
}
```

## Search Fields

```js
contents {
  title,
  summary,
  plainText,
  searchText,
  tagIds,
  categoryIds
}
```

## Index Examples

```js
db.contents.createIndex({ siteId: 1, slug: 1 }, { unique: true })
db.contents.createIndex({ siteId: 1, status: 1, publishedAt: -1 })
db.contents.createIndex({ siteId: 1, contentType: 1, status: 1, publishedAt: -1 })
```

MongoDB text index는 초기 필수는 아니다. 검색 요구가 커질 경우 아래를 검토한다.

```js
db.contents.createIndex({
  title: "text",
  summary: "text",
  plainText: "text",
  searchText: "text"
})
```

## Future Search

검색 품질이 중요해지는 단계에서는 아래를 검토한다.

```txt
MongoDB text index
external search engine
초성 검색
태그 기반 필터
카테고리 기반 필터
```
