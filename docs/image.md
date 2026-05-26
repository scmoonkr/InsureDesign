# image.md

## Image Policy

업로드 시:

1. 원본 저장
2. webp 변환
3. large/medium/thumb 생성
4. metadata 저장

## Directory Structure

```txt
/uploads/sites/{siteId}/{yyyy}/{mm}/{size}/{filename}.webp
```

예시:

```txt
/uploads/sites/jeongeoncc/2026/05/thumb/a.webp
```

## Delete Policy

실제 삭제 대신 soft delete 우선.
