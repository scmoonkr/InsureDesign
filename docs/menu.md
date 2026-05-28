# menu.md

## Menu Policy

메뉴는 siteId 기준으로 분리한다.

초기 정책은 수동 메뉴 구성을 기본으로 한다. `page.showInMenu`를 통한 자동 메뉴 생성은 필요 시 별도 기능으로 검토한다.

## Menu Schema

```js
{
  siteId,
  name,
  location,

  items: [
    {
      id,
      title,
      type,
      contentId,
      categoryId,
      url,
      target,
      order,
      isVisible,
      children: []
    }
  ]
}
```

## Menu Types

```txt
page
category
url
```

## Location

```txt
header
footer
sidebar
custom
```

## Validation

메뉴 저장 시 아래를 검증한다.

```txt
contentId가 같은 siteId에 존재하는지 확인
categoryId가 같은 siteId에 존재하는지 확인
url 타입의 외부 링크 허용 형식 확인
children depth 제한 확인
```

초기 children depth는 2단계까지 허용한다.

## Index

```js
db.menus.createIndex({ siteId: 1, name: 1 }, { unique: true })
db.menus.createIndex({ siteId: 1, location: 1 })
```
