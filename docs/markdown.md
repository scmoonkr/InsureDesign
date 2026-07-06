# markdown.md

## Markdown Policy

InsureDesign 본문은 Markdown을 기본 원본으로 사용한다.

```txt
Markdown = 기본 문서
Block = Markdown 안에 들어가는 제한된 UI 확장 문법
```

Block은 별도의 자유형 편집 시스템이 아니다. 작성자는 정해진 block만 Markdown 안에 삽입할 수 있다.

## Storage

DB에는 원본 Markdown과 렌더링 캐시를 함께 저장할 수 있다.

```js
{
  markdown,
  html,
  blocks,
  plainText,
  searchText
}
```

수정 시에는 항상 `markdown`을 원본으로 사용한다.

```txt
markdown 수정
-> markdown parser 실행
-> custom block parser 실행
-> html, blocks, plainText, searchText 재생성
-> DB 저장
```

## Basic Syntax

```md
# 제목

본문 내용입니다.

:::notice
중요 공지 내용입니다.
:::

다음 본문이 이어집니다.
```

## Block Syntax

기본 문법은 아래 형식을 사용한다.

```md
:::blockName
content
:::
```

옵션이 필요한 경우 YAML 스타일을 우선 사용한다.

```md
:::button
text: 예배 안내 보기
url: /worship
style: primary
:::
```

## Initial Supported Blocks

초기에는 아래 block만 지원한다.

```txt
notice
highlight
quote
youtube
button
gallery
imageGrid
slide
file
map
```

추후 사이트 성격에 따라 아래 block을 추가할 수 있다.

```txt
sermonInfo
bible
prayer
schedule
bookCard
readingLevel
faq
cards
hero
timeline
stats
```

새 block은 코드로 검증 가능한 형태로만 추가한다.

## Block Validation

저장 전 block을 반드시 검증한다.

```txt
허용된 block인지 확인
필수 필드 존재 여부 확인
imageId가 같은 siteId에 존재하는지 확인
button url이 허용된 형식인지 확인
youtube url이 정상인지 확인
hero block을 허용된 contentType에서만 사용하는지 확인
```

본문 block에서 참조하는 이미지와 콘텐츠의 `siteId`는 반드시 같아야 한다.

```txt
content.siteId === image.siteId
```

## notice Block

```md
:::notice
이번 주 예배 장소가 변경되었습니다.
:::
```

```md
:::notice
type: warning

이번 주 예배 장소가 변경되었습니다.
:::
```

## highlight Block

```md
:::highlight
본문 중 중요한 내용을 강조합니다.
:::
```

## quote Block

```md
:::quote
인용문 내용을 표시합니다.
:::
```

## youtube Block

```md
:::youtube
https://www.youtube.com/watch?v=xxxx
:::
```

렌더링 시에는 YouTube player component로 변환한다.

## button Block

```md
:::button
text: 예배 안내 보기
url: /worship
style: primary
:::
```

작성자가 직접 색상, padding, margin을 지정할 수 없다. `style`은 InsureDesign가 미리 정의한 값만 허용한다.

## gallery Block

```md
:::gallery
imageIds:
- img_001
- img_002
- img_003
:::
```

## imageGrid Block

```md
:::imageGrid
columns: 3
gap: medium

images:
- imageId: img_001
  caption: 예배 사진
- imageId: img_002
  caption: 수련회
- imageId: img_003
  caption: 찬양대
:::
```

렌더링 시에는 `ImageGridBlock` component로 변환한다.

## slide Block

```md
:::slide
slides:
- imageId: img_001
  title: 첫 번째 슬라이드
  desc: 설명 문구

- imageId: img_002
  title: 두 번째 슬라이드
  desc: 설명 문구
:::
```

렌더링 시에는 `SlideBlock` 또는 `CarouselBlock` component로 변환한다.

## cards Block

```md
:::cards
columns: 3
style: shadow

items:
- title: 카드 제목
  desc: 카드 설명
  imageId: img_001
:::
```

`cards`는 초기 필수 block이 아니며, 사이트 요구가 있을 때 추가한다.

## hero Block

```md
:::hero
title: 사이트 이름
subtitle: 소개 문구
imageId: hero_001
buttonText: 시작하기
buttonUrl: /start
:::
```

`hero`는 모든 콘텐츠에서 허용하지 않는다. `page` 또는 landing 성격의 template에서만 허용하는 것을 기본 정책으로 한다.

## Render Flow

```txt
Markdown 입력
-> Markdown parser
-> Custom block parser
-> Block object 생성
-> Vue BlockRenderer
-> 실제 Vue component 출력
```

예시:

```js
{
  type: "notice",
  props: {
    content: "중요 공지 내용"
  }
}
```

Vue 렌더링:

```vue
<BlockRenderer :blocks="blocks" />
```

## Freedom Limits

허용:

```txt
Markdown 작성
notice 넣기
button 넣기
youtube 넣기
imageGrid 넣기
slide 넣기
cards 넣기
```

금지:

```txt
사용자 custom HTML 전체 입력
사용자 custom CSS 전체 입력
absolute position 지정
margin/padding 직접 지정
font-size 직접 지정
색상 코드 직접 지정
drag/drop page builder
Gutenberg식 전체 block editor
```

## Principle

본문은 Markdown으로 관리하고, 특수 UI는 Markdown 안의 제한된 Block으로 처리한다.

디자인은 Template과 StyleFamily가 통제하며, 작성자는 정해진 범위 안에서만 표현을 선택한다.
