# schema.md

## Collections

핵심 컬렉션은 아래 7개를 기본으로 한다.

```txt
sites
users
categories
tags
media
contents
menus
```

운영 안정성을 위해 아래 컬렉션은 초기 단계부터 함께 고려한다.

```txt
settings
redirects
contentRevisions
auditLogs
```

## Database Policy

- MongoDB는 공식 Node.js Driver SDK를 사용한다.
- Mongoose는 사용하지 않는다.
- 모든 주요 데이터는 `siteId` 기준으로 분리한다.
- 관리자 API에서는 항상 사용자의 `siteId` 권한을 확인한다.
- 공개 API에서는 현재 domain으로 `siteId`를 결정한다.
- `_id`는 MongoDB 기본 `ObjectId`를 사용한다.
- 참조 필드는 가능한 한 `ObjectId`로 저장한다.

## Common Fields

대부분의 site scoped 컬렉션은 아래 필드를 가진다.

```js
{
  siteId,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

기본 삭제 정책은 soft delete이다.

```js
{
  isDeleted: false,
  deletedAt: null
}
```

## sites

```js
{
  _id,
  siteId,
  name,

  domains: [
    {
      host,
      isPrimary,
      verifiedAt,
      status
    }
  ],

  primaryDomain,
  status,        // active | disabled | maintenance
  locale,
  timezone,

  themeId,
  styleFamily,
  themeConfig,

  allowedTemplates: [],
  allowedBlocks: [],

  createdAt,
  updatedAt,
  isDeleted,
  deletedAt
}
```

### Index

```js
db.sites.createIndex({ siteId: 1 }, { unique: true })
db.sites.createIndex({ "domains.host": 1 }, { unique: true })
```

## users

사용자는 전역 계정으로 관리하고, 사이트 권한은 `roles` 배열로 분리한다.

```js
{
  _id,
  provider,      // kakao | naver | local
  providerId,
  name,
  nickname,
  email,
  gender,         // M | F | U
  dob,            // YYYY-MM-DD
  avatarUrl,
  avatarImageId,

  status,        // active | blocked | pending
  lastLoginAt,

  roles: [
    {
      siteId,
      role        // super | admin | manager | writer | viewer
    }
  ],

  createdAt,
  updatedAt,
  isDeleted,
  deletedAt
}
```

### Index

```js
db.users.createIndex({ provider: 1, providerId: 1 }, { unique: true })
db.users.createIndex({ email: 1 })
db.users.createIndex({ "roles.siteId": 1, "roles.role": 1 })
```

## categories

```js
{
  _id,
  siteId,
  name,
  slug,
  parentId,
  order,

  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

### Index

```js
db.categories.createIndex({ siteId: 1, slug: 1 }, { unique: true })
db.categories.createIndex({ siteId: 1, parentId: 1, order: 1 })
```

## tags

```js
{
  _id,
  siteId,
  name,
  slug,
  usageCount,

  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

### Index

```js
db.tags.createIndex({ siteId: 1, slug: 1 }, { unique: true })
db.tags.createIndex({ siteId: 1, usageCount: -1 })
```

## media

```js
{
  _id,
  siteId,
  originalName,
  filename,
  mimeType,
  size,
  width,
  height,
  hash,

  storage,       // local | s3 | r2 | idrive

  paths: {
    original,
    large,
    medium,
    thumb
  },

  alt,
  caption,

  uploadedBy,
  usedIn: [
    {
      contentId,
      field,      // thumbnail | body | gallery | block
      usedAt
    }
  ],

  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

### Index

```js
db.media.createIndex({ siteId: 1, createdAt: -1 })
db.media.createIndex({ siteId: 1, hash: 1 })
```

## contents

`contents`는 `post`, `page`, `notice`, `gallery`를 공통 모델로 저장한다.

```js
{
  _id,
  siteId,

  contentType,       // post | page | notice | gallery

  title,
  slug,
  slugBase,
  slugSuffix,
  summary,

  template,
  styleFamily,

  markdown,
  html,
  blocks,
  plainText,
  searchText,

  categoryIds: [],
  tagIds: [],

  thumbnailImageId,
  imageIds: [],

  status,            // draft | published | hidden
  visibility,        // public | members | private

  authorId,
  publishedAt,
  scheduledAt,
  expiredAt,

  meta: {
    parentId,
    showInMenu,
    pinned,
    importantUntil
  },

  revisionNo,

  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

### Slug Policy

- slug는 기본적으로 `title`에서 자동 생성한다.
- slug는 `siteId`별로 관리한다.
- 같은 `siteId` 안에서는 slug가 중복될 수 없다.
- 다른 `siteId`에서는 같은 slug를 사용할 수 있다.
- 중복 시 `slug`, `slug-2`, `slug-3` 순서로 생성한다.
- published 이후 slug 변경 시 `redirects`에 이전 경로를 기록한다.
- soft deleted 콘텐츠의 slug도 재사용하지 않는 것을 기본 정책으로 한다.

### Index

```js
db.contents.createIndex({ siteId: 1, slug: 1 }, { unique: true })
db.contents.createIndex({ siteId: 1, status: 1, publishedAt: -1 })
db.contents.createIndex({ siteId: 1, contentType: 1, status: 1, publishedAt: -1 })
db.contents.createIndex({ siteId: 1, categoryIds: 1, publishedAt: -1 })
db.contents.createIndex({ siteId: 1, tagIds: 1, publishedAt: -1 })
```

## menus

```js
{
  _id,
  siteId,
  name,
  location,      // header | footer | sidebar | custom

  items: [
    {
      id,
      title,
      type,       // page | category | url
      contentId,
      categoryId,
      url,
      target,     // self | blank
      order,
      isVisible,
      children: []
    }
  ],

  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  isDeleted,
  deletedAt,
  deletedBy
}
```

### Index

```js
db.menus.createIndex({ siteId: 1, name: 1 }, { unique: true })
db.menus.createIndex({ siteId: 1, location: 1 })
```

## settings

사이트별 운영 설정을 저장한다.

```js
{
  _id,
  siteId,
  seo,
  social,
  analytics,
  uploadPolicy,
  publicConfig,
  createdAt,
  updatedAt
}
```

## redirects

slug 변경 등으로 발생한 이전 URL을 보존한다.

```js
{
  _id,
  siteId,
  fromPath,
  toPath,
  statusCode,    // 301 | 302
  contentId,
  createdAt,
  createdBy
}
```

### Index

```js
db.redirects.createIndex({ siteId: 1, fromPath: 1 }, { unique: true })
```

## contentRevisions

콘텐츠 수정 이력을 저장한다.

```js
{
  _id,
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

### Index

```js
db.contentRevisions.createIndex({ siteId: 1, contentId: 1, revisionNo: -1 })
```

## auditLogs

관리자 작업 이력을 저장한다.

```js
{
  _id,
  siteId,
  userId,
  action,
  resourceType,
  resourceId,
  before,
  after,
  createdAt
}
```

### Index

```js
db.auditLogs.createIndex({ siteId: 1, createdAt: -1 })
db.auditLogs.createIndex({ siteId: 1, resourceType: 1, resourceId: 1 })
```
