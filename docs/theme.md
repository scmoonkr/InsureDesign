# theme.md

## Theme Policy

완전 자유 편집 UI는 제공하지 않는다.

관리자는 미리 정의된 Template과 StyleFamily를 선택한다. 작성자는 허용된 범위 안에서 콘텐츠를 작성하고, 디자인 시스템은 InsureDesign가 통제한다.

```txt
사용자는 내용을 편집한다.
디자인 시스템은 InsureDesign가 통제한다.
레이아웃은 Template이 결정한다.
표현 확장은 허용된 Block만 사용한다.
스타일은 StyleFamily 안에서만 선택한다.
```

## Template Examples

```txt
home-basic
home-church
home-blog

list-card
list-simple
list-magazine

detail-basic
detail-sermon
detail-page
```

## Template Policy

- Template은 코드로 정의한다.
- 사용자는 허용된 Template 중 하나만 선택할 수 있다.
- 콘텐츠별 자유 레이아웃 편집은 허용하지 않는다.
- site별로 허용 Template을 제한할 수 있다.

```js
sites {
  allowedTemplates: [
    "home-basic",
    "list-card",
    "detail-basic"
  ]
}
```

## Style Family

색상, 타이포그래피, 여백 같은 시각 요소는 직접 입력하지 않고 family 구조로 선택한다.

```js
{
  styleFamily: "blue-soft"
}
```

## Family Examples

```txt
blue-soft
blue-modern
orange-warm
red-classic
green-calm
black-minimal
black-white
```

## CSS Variable

StyleFamily는 내부적으로 CSS variable을 생성할 수 있다.

```css
:root {
  --color-primary: #2F5D8C;
  --color-background: #FFFFFF;
  --color-text: #1F2937;
}
```

## Forbidden Customization

아래 자유도는 제공하지 않는다.

```txt
임의 HTML 입력
임의 CSS 입력
페이지별 font-size 직접 지정
페이지별 color 직접 지정
페이지별 margin/padding 직접 지정
absolute positioning
drag/drop page builder
플러그인식 디자인 확장
```
