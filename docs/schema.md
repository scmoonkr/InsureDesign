# schema.md

## Collections

```txt
sites
users
categories
tags
images
contents
menus
```

## Common Rules

```js
{
  siteId,
  createdAt,
  updatedAt
}
```

soft delete 권장:

```js
{
  isDeleted: false
}
```

## sites

```js
{
  siteId,
  name,
  domains: [],
  themeId,
  styleFamily,
  themeConfig
}
```

## users

```js
{
  provider,
  providerId,
  name,
  email,

  roles: [
    {
      siteId,
      role
    }
  ]
}
```

## categories

```js
{
  siteId,
  name,
  slug,
  parentId,
  order
}
```

## tags

```js
{
  siteId,
  name,
  slug,
  usageCount
}
```

## images

```js
{
  siteId,
  originalName,
  filename,

  paths: {
    original,
    large,
    medium,
    thumb
  },

  uploadedBy,
  usedIn: []
}
```

## contents

```js
{
  siteId,

  contentType,

  title,
  slug,
  summary,

  markdown,
  html,

  categoryIds: [],
  tagIds: [],

  thumbnailImageId,
  imageIds: [],

  status,

  authorId,
  publishedAt
}
```
