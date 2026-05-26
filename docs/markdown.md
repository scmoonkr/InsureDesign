# markdown.md

## Markdown Policy

Markdown = 기본 문서
Block = Markdown 안의 특수 UI

## Example

```md
# 제목

본문

:::notice
공지 내용
:::

다음 본문
```

## Supported Blocks

```txt
notice
highlight
quote
youtube
button
gallery
imageGrid
slide
cards
hero
```

## imageGrid Example

```md
:::imageGrid
columns: 3

images:
- imageId: img1
- imageId: img2
- imageId: img3
:::
```

## slide Example

```md
:::slide
slides:
- imageId: img1
  title: 제목
  desc: 설명
:::
```

## Rules

허용:

```txt
Block 삽입
Markdown 작성
```

금지:

```txt
custom HTML 전체 허용
custom CSS 전체 허용
drag/drop page builder
absolute position 지정
```

# Markdown & Block Policy

## 기본 방향

이 CMS의 콘텐츠 본문은 Markdown을 기본으로 한다.

Markdown은 글 작성, 수정, 백업, 이전, AI 생성에 유리하며, WordPress식 자유 편집보다 훨씬 가볍고 안정적이다.

핵심 구조는 다음과 같다.

```txt
Markdown = 기본 문서
Block = Markdown 안에 들어가는 특수 UI 문법
```

즉, Block을 별도 편집 시스템으로 만들지 않고 Markdown 안에 포함한다.

## Markdown 저장 방식

DB에는 원본 Markdown과 변환된 HTML을 함께 저장할 수 있다.

```js
{
  markdown: "...",
  html: "..."
}
```

역할은 다음과 같다.

```txt
markdown = 원본 데이터
html = 렌더링 캐시
```

수정할 때는 항상 markdown을 기준으로 한다.

```txt
markdown 수정
→ markdown parser 실행
→ custom block parser 실행
→ html 재생성
→ DB 저장
```

공개 페이지에서는 가능하면 html을 사용해 렌더링 비용을 줄인다.

## Markdown 작성 예시

```md
# 주일예배 안내

이번 주 주일예배는 오전 11시에 본당에서 드립니다.

예배 후에는 소그룹 나눔이 있습니다.
```

## Block 기본 개념

Markdown만으로 표현하기 어려운 UI는 Block 문법으로 처리한다.

예를 들면 공지 박스, 강조 박스, 유튜브, 버튼, 이미지 그리드, 슬라이드 등을 Block으로 만든다.

Block은 별도 DB 구조가 아니라 Markdown 안에 들어간다.

```md
# 주일예배 안내

본문 내용입니다.

:::notice
이번 주 예배 장소가 변경되었습니다.
:::

다음 본문이 이어집니다.
```

## Block 문법

기본 문법은 다음을 사용한다.

```md
:::blockName
내용
:::
```

예시:

```md
:::notice
중요 공지입니다.
:::
```

옵션이 필요한 경우 다음과 같이 작성한다.

```md
:::notice type="warning"
중요 공지입니다.
:::
```

또는 YAML 스타일로 작성할 수 있다.

```md
:::button
text: 예배 안내 보기
url: /worship
style: primary
:::
```

## 초기 지원 Block

초기에는 다음 Block만 지원한다.

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

사이트 성격에 따라 이후 다음 Block을 추가할 수 있다.

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

## notice Block

공지 박스용 Block이다.

```md
:::notice
이번 주 예배 장소가 변경되었습니다.
:::
```

옵션 예시:

```md
:::notice type="warning"
이번 주 예배 장소가 변경되었습니다.
:::
```

## highlight Block

본문 중 중요한 내용을 강조할 때 사용한다.

```md
:::highlight
이번 말씀의 핵심은 믿음으로 반응하는 삶입니다.
:::
```

## quote Block

인용문을 표현할 때 사용한다.

```md
:::quote
읽는다는 것은 단순히 글자를 보는 것이 아니라 생각을 깨우는 일입니다.
:::
```

## youtube Block

유튜브 영상을 삽입할 때 사용한다.

```md
:::youtube
https://www.youtube.com/watch?v=xxxx
:::
```

렌더링 시에는 YouTube player component로 변환한다.

## button Block

버튼 링크를 삽입할 때 사용한다.

```md
:::button
text: 예배 안내 보기
url: /worship
style: primary
:::
```

렌더링 시에는 미리 정의된 버튼 스타일로 출력한다.

사용자가 직접 색상, padding, margin을 지정하지 못하게 한다.

## gallery Block

여러 이미지를 갤러리 형태로 보여줄 때 사용한다.

```md
:::gallery
imageIds:
- img_001
- img_002
- img_003
:::
```

## imageGrid Block

이미지를 격자 형태로 보여줄 때 사용한다.

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
  caption: 찬양팀
:::
```

렌더링 시에는 `ImageGridBlock` 컴포넌트로 변환한다.

```vue
<ImageGridBlock
  :columns="3"
  :gap="'medium'"
  :images="images"
/>
```

## slide Block

슬라이드 또는 캐러셀을 보여줄 때 사용한다.

```md
:::slide
slides:
- imageId: img_001
  title: 독서 수준 측정
  desc: Reader KRIN을 통해 현재 독서 능력을 확인합니다.

- imageId: img_002
  title: 맞춤 도서 추천
  desc: Optimal Reading Zone에 맞는 책을 추천합니다.
:::
```

렌더링 시에는 `SlideBlock` 또는 `CarouselBlock` 컴포넌트로 변환한다.

## cards Block

카드형 정보 묶음을 표현할 때 사용한다.

```md
:::cards
columns: 3
style: shadow

items:
- title: KRIN 측정
  desc: 독서 수준을 분석합니다.
  imageId: img_001

- title: 맞춤 추천
  desc: 아이에게 맞는 책을 추천합니다.
  imageId: img_002

- title: 성장 기록
  desc: 읽기 성장을 데이터로 확인합니다.
  imageId: img_003
:::
```

## hero Block

페이지 상단 대표 영역이 필요한 경우 사용한다.

```md
:::hero
title: ReadFit
subtitle: 독서를 사고력 훈련으로
imageId: hero_001
buttonText: 시작하기
buttonUrl: /start
:::
```

단, hero는 모든 콘텐츠에 허용하지 않고 page 또는 landing 타입 콘텐츠에서만 허용하는 것을 권장한다.

## Block 렌더링 흐름

```txt
Markdown 입력
→ Markdown parser
→ Custom block parser
→ Block object 생성
→ Vue BlockRenderer
→ 실제 Vue component 출력
```

예시:

```md
:::notice
공지 내용
:::
```

변환 결과:

```js
{
  type: "notice",
  props: {
    content: "공지 내용"
  }
}
```

Vue 렌더링:

```vue
<BlockRenderer :blocks="blocks" />
```

내부 처리:

```vue
<NoticeBlock v-if="block.type === 'notice'" />
<ImageGridBlock v-if="block.type === 'imageGrid'" />
<SlideBlock v-if="block.type === 'slide'" />
```

## Block 사용 원칙

Block은 콘텐츠 표현을 위한 제한된 UI이다.

다음은 허용한다.

```txt
notice 넣기
button 넣기
youtube 넣기
imageGrid 넣기
slide 넣기
cards 넣기
```

다음은 금지한다.

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

## 왜 Markdown 안에 Block을 넣는가?

이 방식의 장점은 다음과 같다.

```txt
DB 구조가 단순하다.
작성 흐름이 자연스럽다.
백업과 이전이 쉽다.
AI로 콘텐츠 생성하기 쉽다.
디자인 통제가 가능하다.
WordPress식 복잡성을 피할 수 있다.
```

## 권장 비율

대부분의 콘텐츠는 일반 Markdown으로 작성한다.

```txt
Markdown 80~90%
Block 10~20%
```

Block은 꼭 필요한 UI 표현에만 사용한다.

## 결론

이 CMS의 본문 구조는 다음 원칙을 따른다.

```txt
본문은 Markdown
특수 UI는 Markdown 안의 Block
디자인은 Template과 Style Family가 통제
사용자는 정해진 Block만 선택
완전 자유 편집은 금지
```
