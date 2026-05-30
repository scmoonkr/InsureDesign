# auth.md

## Auth Providers

초기 인증 provider는 아래를 기준으로 한다.

```txt
kakao
naver
local
```

## User Identify

OAuth 사용자는 `provider + providerId` 조합으로 식별한다.

```js
{
  provider,
  providerId
}
```

## Roles

User-facing 역할 3종 + 시스템 전용 1종:

```txt
member    공개 콘텐츠 + 본인 프로필
manager   /backend/* 전체 접근, 콘텐츠/미디어/카테고리/태그 CRUD
admin     manager 전체 + 사용자 role 부여/회수, 사이트 설정
super     (시스템 전용) 모든 siteId 우회, sites CRUD
```

`super`는 UI에서 노출하지 않으며 시스템 부트스트랩/멀티사이트 운영자에게만 부여합니다.

## Site Scoped Permission

`super`를 제외한 모든 사용자는 `siteId` 기준으로 권한이 제한된다.

```js
users {
  roles: [
    {
      siteId,
      role
    }
  ]
}
```

## Backend Access Policy

`/backend/*` 모든 페이지는 **manager 이상**(super 포함)만 접근 가능합니다.

- 클라이언트: `app/middleware/backend-auth.global.ts`가 `/api/auth/me`로 role 확인 후 미달이면 alert + 홈으로 redirect.
- 서버: admin API 핸들러는 `checkAdmin(req, siteId, 'manager')`로 동일 정책을 강제합니다.

## New User Default

신규 OAuth 가입자는 `[{ siteId: DEFAULT_SITE_ID, role: 'member' }]`로 생성됩니다.
backend 접근이 필요한 사용자는 admin이 `/backend/users`에서 role을 manager 이상으로 승격해야 합니다.

## Permission Detail

초기에는 role 기반으로 시작하되, 구현 시 아래 action 기준을 명확히 둔다.

```js
{
  contents: {
    create: true,
    updateOwn: true,
    updateAny: false,
    publish: false,
    delete: false
  }
}
```

권장 기본 정책:

```txt
writer는 본인이 작성한 draft를 수정할 수 있다.
writer는 직접 publish할 수 없다.
manager 이상이 publish할 수 있다.
admin은 siteId 안의 모든 리소스를 관리할 수 있다.
super는 모든 siteId에 접근할 수 있다.
```

## Audit Policy

관리자 API에서 주요 변경이 발생하면 `auditLogs`에 기록한다.

```txt
content create/update/delete/publish
image upload/delete
menu update
site setting update
user role update
```
