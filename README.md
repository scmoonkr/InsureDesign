# InsureDesign

Node.js + MongoDB + Nuxt 기반 단일 사이트 InsureDesign입니다.

## 실행 환경

- Node.js 20+
- MongoDB 6+

## 1) 설치

```bash
npm install
```

## 2) 환경변수 설정

`.env.example`을 복사해 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

최소 필수 설정:

- `PORT` (API 서버 포트, 기본 9000)
- `SITE_URL` (웹 주소, 예: `http://localhost:9001`)
- `NUXT_PUBLIC_API_BASE` (예: `http://localhost:9000`)
- `MONGODB_ADDR`, `MONGO_USERNAME`, `MONGO_PWD`, `MONGO_DBNAME`
- `JWT_SECRET`, `SESSION_SECRET`, `NUXT_SESSION_PASSWORD`

## 3) 개발 실행

웹(Nuxt) 개발 서버 실행:

```bash
npm run dev
```

- `SITE_URL`의 포트를 기준으로 웹 서버 포트가 결정됩니다. (기본 9001)
- API 포트는 `PORT`를 사용합니다. (기본 9000)

API 서버만 단독 실행:

```bash
npm run dev:api
```

## 4) 빌드 / 프리뷰

```bash
npm run build
npm run preview
```

## 5) DB 인덱스 관리

초기 인덱스 생성:

```bash
npm run db:init
```

인덱스 검증:

```bash
npm run db:verify
```

### 멀티사이트 → 단일 사이트 마이그레이션 (1회성)

이 InsureDesign는 단일 사이트 구조로, 데이터에 `siteId` 개념이 없습니다. 과거 멀티사이트
버전에서 넘어온 DB라면 아래를 한 번 실행해 `settings` 문서를 단일 셀렉터로 이관하고,
`sites` 컬렉션 제거·`siteId` 필드 정리·인덱스 재생성을 수행합니다.

```bash
npm run db:migrate-single-site
npm run db:init
```

> 새로 만든 단일 사이트 DB에서도 안전하게 실행할 수 있습니다.

## 6) Git 설정

### 신규 로컬 환경에서 클론

```bash
git clone https://github.com/scmoonkr/InsureDesign.git
cd InsureDesign
```

### 기존 프로젝트를 원격에 처음 연결할 때

```bash
git init
git remote add origin https://github.com/scmoonkr/InsureDesign.git
git branch -M main
git add .
git commit -m "first commit"
git push -u origin main
```

### 원격 저장소 확인 / 변경

```bash
# 현재 원격 확인
git remote -v

# 원격 URL 변경
git remote set-url origin https://github.com/scmoonkr/InsureDesign.git
```

### 원격 변경사항 가져오기

```bash
git pull origin main
```

### 로컬 변경사항 올리기

```bash
git add .
git commit -m "커밋 메시지"
git push origin main
```

### 특정 파일만 스테이징

```bash
git add api-server/index.mjs app/pages/backend/contents.vue
git commit -m "커밋 메시지"
git push origin main
```
