# theme.md

## Theme Policy

완전 자유 편집형 UI는 금지한다.

관리자는 미리 정의된 Template와 StyleFamily를 선택만 한다.

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

## Style Family

직접 색상 입력 대신 family 구조를 사용한다.

예시:

```js
styleFamily: "blue-soft"
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

```css
:root {
  --color-primary: #2F5D8C;
  --color-background: #FFFFFF;
  --color-text: #1F2937;
}
```
