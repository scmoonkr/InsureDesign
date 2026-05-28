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

```txt
super
admin
manager
writer
viewer
```

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

## Role Meaning

```txt
super   전체 사이트 관리
admin   특정 siteId 전체 관리
manager 콘텐츠/메뉴/이미지 운영 관리
writer  콘텐츠 작성
viewer  읽기 전용 접근
```

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
