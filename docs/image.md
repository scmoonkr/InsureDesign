# image.md

## Image Policy

이미지는 `siteId` 기준으로 분리한다.

업로드 처리 순서:

```txt
원본 저장
webp 변환
large/medium/thumb 생성
metadata 저장
hash 저장
```

## Directory Structure

```txt
/uploads/sites/{siteId}/{yyyy}/{mm}/{size}/{filename}.webp
```

예시:

```txt
/uploads/sites/jeongeoncc/2026/05/thumb/a.webp
```

## Metadata

```js
{
  siteId,
  originalName,
  filename,
  mimeType,
  size,
  width,
  height,
  hash,
  storage,
  paths,
  alt,
  caption,
  uploadedBy,
  usedIn
}
```

## Storage

초기에는 아래 storage provider를 고려한다.

```txt
local
s3
r2
idrive
```

`paths`는 storage provider와 무관하게 공개 접근 가능한 경로 또는 내부 경로를 저장한다.

```js
paths: {
  original,
  large,
  medium,
  thumb
}
```

## Reference Policy

본문 block이나 콘텐츠가 이미지를 참조할 때는 반드시 같은 `siteId`인지 확인한다.

```txt
content.siteId === image.siteId
```

`usedIn`은 이미지 사용 위치를 추적한다.

```js
usedIn: [
  {
    contentId,
    field,
    usedAt
  }
]
```

## Delete Policy

이미지는 실제 파일 삭제보다 soft delete를 우선한다.

```js
{
  isDeleted: true,
  deletedAt,
  deletedBy
}
```

사용 중인 이미지는 기본적으로 삭제할 수 없다. 삭제가 필요한 경우 먼저 콘텐츠 참조를 제거해야 한다.
