# deploy-apache.md

## 개요

CentOS + Apache httpd 기반 운영 환경 설정이다.

이 CMS는 단일 Nuxt 인스턴스와 단일 API 서버로 여러 도메인을 함께 처리한다.  
도메인별로 별도 Node.js 프로세스를 띄우지 않고, Apache가 Host 헤더를 보존한 채  
같은 백엔드로 라우팅하면 API 서버가 도메인 → siteId 를 결정한다.

```
브라우저 (insuredesign.co.kr 또는 oneminutebible.co.kr)
  ↓ HTTPS
Apache httpd
  ├── /api/*      → API server  :9000  (siteId 해석)
  ├── /uploads/*  → API server  :9000  (정적 파일)
  └── /*          → Nuxt        :9001  (Host 헤더로 siteId 판단)
```

`ProxyPreserveHost On` 이 핵심이다.  
Apache가 `Host: insuredesign.co.kr` 헤더를 Nuxt까지 그대로 전달해야  
Nuxt SSR plugin 이 `x-site-host` 헤더를 API 서버로 넘기고,  
API 서버가 `sites` 컬렉션에서 siteId 를 결정할 수 있다.

---

## Apache 설정 파일 구조

`httpd.conf` 본체는 건드리지 않는다.  
사이트별 파일을 `conf.d/` 에 분리하는 것이 표준이다.

```
/etc/httpd/conf.d/
├── insuredesign.conf
└── oneminutebible.conf
```

---

## /etc/httpd/conf.d/insuredesign.conf

```apache
# ── HTTP → HTTPS redirect ────────────────────────────────────
<VirtualHost *:80>
    ServerName insuredesign.co.kr
    ServerAlias www.insuredesign.co.kr

    RewriteEngine On
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [R=301,L]
</VirtualHost>

# ── HTTPS ────────────────────────────────────────────────────
<VirtualHost *:443>
    ServerName insuredesign.co.kr
    ServerAlias www.insuredesign.co.kr

    # Let's Encrypt 인증서 (certbot 발급 기준)
    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/insuredesign.co.kr/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/insuredesign.co.kr/privkey.pem
    SSLProtocol           all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite        ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384

    # 실제 도메인을 Node.js까지 전달 — 없으면 multi-site 동작 안 함
    ProxyPreserveHost On

    # WebSocket 지원 (Nuxt dev HMR 또는 실시간 기능)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:9001/$1 [P,L]

    # API 서버로 라우팅
    ProxyPass        /api/      http://localhost:9000/api/
    ProxyPassReverse /api/      http://localhost:9000/api/

    ProxyPass        /uploads/  http://localhost:9000/uploads/
    ProxyPassReverse /uploads/  http://localhost:9000/uploads/

    # 나머지는 Nuxt로
    ProxyPass        /          http://localhost:9001/
    ProxyPassReverse /          http://localhost:9001/

    ErrorLog  /var/log/httpd/insuredesign-error.log
    CustomLog /var/log/httpd/insuredesign-access.log combined
</VirtualHost>
```

---

## /etc/httpd/conf.d/oneminutebible.conf

```apache
<VirtualHost *:80>
    ServerName oneminutebible.co.kr
    ServerAlias www.oneminutebible.co.kr

    RewriteEngine On
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName oneminutebible.co.kr
    ServerAlias www.oneminutebible.co.kr

    SSLEngine on
    SSLCertificateFile    /etc/letsencrypt/live/oneminutebible.co.kr/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/oneminutebible.co.kr/privkey.pem
    SSLProtocol           all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite        ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384

    ProxyPreserveHost On

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)           ws://localhost:9001/$1 [P,L]

    ProxyPass        /api/      http://localhost:9000/api/
    ProxyPassReverse /api/      http://localhost:9000/api/

    ProxyPass        /uploads/  http://localhost:9000/uploads/
    ProxyPassReverse /uploads/  http://localhost:9000/uploads/

    ProxyPass        /          http://localhost:9001/
    ProxyPassReverse /          http://localhost:9001/

    ErrorLog  /var/log/httpd/oneminutebible-error.log
    CustomLog /var/log/httpd/oneminutebible-access.log combined
</VirtualHost>
```

---

## 필수 Apache 모듈

```bash
# 활성화 여부 확인
httpd -M | grep -E 'proxy|rewrite|ssl'

# /etc/httpd/conf/httpd.conf 에서 아래 LoadModule 이 주석 해제되어 있어야 한다
LoadModule proxy_module          modules/mod_proxy.so
LoadModule proxy_http_module     modules/mod_proxy_http.so
LoadModule proxy_wstunnel_module modules/mod_proxy_wstunnel.so
LoadModule rewrite_module        modules/mod_rewrite.so
LoadModule ssl_module            modules/mod_ssl.so
```

---

## 환경 변수 (.env)

path-based 라우팅이므로 브라우저 API 요청이 같은 도메인의 `/api/` 로 전달된다.  
브라우저 입장에서는 same-origin 이므로 CORS 가 발생하지 않는다.

```env
# API 서버 (.env)
ALLOWED_ORIGINS=https://insuredesign.co.kr,https://oneminutebible.co.kr
DEFAULT_SITE_ID=default

# Nuxt (.env)
# SSR 은 localhost 직접 호출, 브라우저 JS 는 Apache 를 통해 /api/ 로 접근
NUXT_PUBLIC_API_BASE=http://localhost:9000
```

---

## 요청 흐름

### 브라우저 API 요청

```
브라우저: GET https://insuredesign.co.kr/api/public/site-config
  → Apache VirtualHost insuredesign.co.kr
  → ProxyPass /api/ → localhost:9000/api/
  → API server: req.headers.host = "insuredesign.co.kr"  ← ProxyPreserveHost
  → resolveSiteId: getSiteByDomain("insuredesign.co.kr") → siteId: "insure"
```

### Nuxt SSR 내부 API 요청

```
Nuxt SSR plugin (site-theme.ts):
  $fetch("http://localhost:9000/api/public/site-config", {
    headers: { "x-site-host": "insuredesign.co.kr" }   ← useRequestHeaders로 전달
  })
  → API server: x-site-host 헤더로 siteId 결정 → "insure"
```

---

## SSL 인증서 발급 (Let's Encrypt)

```bash
# certbot 설치 (CentOS 8+)
dnf install certbot python3-certbot-apache

# 도메인별 발급
certbot --apache -d insuredesign.co.kr -d www.insuredesign.co.kr
certbot --apache -d oneminutebible.co.kr -d www.oneminutebible.co.kr

# 설정 적용
systemctl reload httpd

# 자동 갱신 확인 (cron 또는 systemd timer 로 등록되어 있어야 함)
certbot renew --dry-run
```

---

## 새 사이트 추가 절차

1. **DNS** — 새 도메인의 A 레코드를 서버 IP 로 설정한다.
2. **DB** — `sites` 컬렉션에 siteId + 도메인 매핑을 등록한다.

```bash
# seed 스크립트 방식
node scripts/seed-insure-site.mjs

# 또는 API 방식 (세션 쿠키 필요)
curl -X POST http://localhost:9000/api/admin/sites \
  -H 'Content-Type: application/json' \
  -b 'session=...' \
  -d '{"siteId":"bible","name":"One Minute Bible"}'

curl -X POST http://localhost:9000/api/admin/sites/bible/domains \
  -H 'Content-Type: application/json' \
  -b 'session=...' \
  -d '{"host":"oneminutebible.co.kr","isPrimary":true}'
```

3. **Apache** — `conf.d/` 에 새 `.conf` 파일을 만들고 인증서를 발급한다.
4. **ALLOWED_ORIGINS** — API 서버 `.env` 에 새 도메인을 추가한다.
5. **httpd reload** — `systemctl reload httpd`

---

## 포트 정리

| 포트 | 역할 | 외부 노출 |
|------|------|-----------|
| 80   | HTTP (→ HTTPS redirect) | Apache |
| 443  | HTTPS | Apache |
| 9000 | API server (Node.js) | localhost only |
| 9001 | Nuxt frontend (Node.js) | localhost only |

9000, 9001 은 방화벽에서 외부 접근을 차단하고 Apache 가 proxy 로만 접근한다.

```bash
# firewalld 기준 — 9000, 9001 은 열지 않는다
firewall-cmd --list-ports          # 확인
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```
