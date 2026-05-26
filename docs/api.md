# api.md

## API Structure

```txt
/api/admin/...
/api/public/...
```

## Admin API

- 로그인 필요
- role 체크 필요
- siteId 권한 체크 필요

## Public API

- published 상태만 반환
- 현재 domain 기준 siteId 결정

## Example

```txt
/api/admin/contents
/api/admin/images

/api/public/contents
/api/public/contents/:slug
```
