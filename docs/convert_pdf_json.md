Filename Based Insurance PDF Processing Guide

## 목적

Vue + Node.js 운영 구조에서 보험 설계서 PDF의 `filename` 또는 `filePath`를 기준으로 PDF를 표준 JSON으로 변환하고, 이후 LLM 분석에 넘기는 구현 지침입니다.

권장 구조는 Node.js가 전체 API 흐름을 담당하고, Python worker가 `pdfplumber`로 PDF 표/텍스트 추출을 담당하는 방식입니다.

## 전체 흐름

```text
Vue
  -> PDF 업로드 또는 파일명 선택
Node.js API
  -> 파일명 검증
  -> 실제 PDF 경로 생성
  -> Python worker 실행
Python worker
  -> PDF 텍스트/표 추출
  -> 표준 JSON 생성
  -> schema_gap_log 생성
Node.js API
  -> JSON 읽기
  -> DB 저장
  -> LLM 분석 요청
  -> Vue에 결과 반환
```

## 폴더 구조 예시

```text
server/
  src/
    routes/
      proposals.route.js
    services/
      proposalExtractor.service.js
      proposalAnalyzer.service.js
    utils/
      safeFilename.js
  workers/
    extract_insurance_pdf.py
  uploads/
    insurance-proposals/
  outputs/
    insurance-json/
```

현재 작업 파일 기준:

```text
C:\Develop\Codex\InsuranceAdvisor\
  insurance_pdf_to_standard_json.py
  insurance_pdf_to_standard_json.mjs
  insurance_json_output\
  insurance_json_output_node\
```

## 입력 방식

운영에서는 사용자가 직접 전체 경로를 넘기지 않게 합니다.

권장 입력:

```json
{
  "filename": "문영애 저축 10만원.pdf"
}
```

Node 서버 내부에서만 실제 경로로 변환합니다.

```js
const UPLOAD_DIR = "D:/OneDrive/0. InsureDesign/done1";
const pdfPath = path.join(UPLOAD_DIR, safeFilename(filename));
```

## 파일명 검증

파일명을 그대로 경로에 붙이면 위험합니다. 반드시 아래 조건을 적용합니다.

- `.pdf` 확장자만 허용
- `..`, `/`, `\`, 드라이브 문자 포함 금지
- 실제 업로드 폴더 내부 파일인지 확인
- 존재하지 않는 파일은 즉시 오류 처리

예시:

```js
import path from "node:path";

export function safePdfFilename(filename) {
  const base = path.basename(filename);

  if (base !== filename) {
    throw new Error("Invalid filename path segment");
  }

  if (!base.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed");
  }

  if (base.includes("..")) {
    throw new Error("Invalid filename");
  }

  return base;
}
```

## Node에서 Python worker 호출

Node는 파일명을 받아 실제 PDF 경로를 만들고, Python worker를 실행합니다.

```js
import { spawn } from "node:child_process";
import path from "node:path";
import { safePdfFilename } from "../utils/safeFilename.js";

const UPLOAD_DIR = "D:/OneDrive/0. InsureDesign/done1";
const PYTHON = process.env.PYTHON_PATH || "python";

export function extractProposalByFilename(filename) {
  const safeName = safePdfFilename(filename);
  const pdfPath = path.join(UPLOAD_DIR, safeName);

  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, [
      "workers/extract_insurance_pdf.py",
      pdfPath
    ], {
      cwd: process.cwd(),
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });

    child.on("close", code => {
      if (code !== 0) {
        reject(new Error(stderr || `Python worker failed: ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Invalid JSON from Python worker: ${error.message}`));
      }
    });
  });
}
```

## Python worker 역할

Python worker는 stdout에 JSON만 출력해야 합니다.

로그, 경고, 디버그 메시지는 stderr로 출력합니다.

```python
import json
import sys
from pathlib import Path

from insurance_pdf_to_standard_json import convert_pdf, build_schema_gap_log


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: extract_insurance_pdf.py <pdf_path>")

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        raise FileNotFoundError(str(pdf_path))

    result = convert_pdf(pdf_path)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
```

## API 라우트 예시

```js
router.post("/proposals/extract", async (req, res, next) => {
  try {
    const { filename } = req.body;
    const extracted = await extractProposalByFilename(filename);

    res.json({
      ok: true,
      filename,
      data: extracted,
      schemaGapSummary: extracted.extraction?.schema_gap_summary
    });
  } catch (error) {
    next(error);
  }
});
```

## LLM 분석 단계

LLM에는 원본 PDF가 아니라 표준 JSON을 넘깁니다.

권장 입력:

```json
{
  "document": {},
  "insurer": {},
  "product": {},
  "proposal": {},
  "parties": {},
  "premium_summary": {},
  "coverages": [],
  "refund_schedule": [],
  "notices": [],
  "extraction": {
    "schema_gap_summary": {}
  }
}
```

LLM에 넘기기 전에 필요한 경우 개인정보를 마스킹합니다.

예:

```js
function redactForLlm(data) {
  return {
    ...data,
    parties: {
      ...data.parties,
      policyholder: data.parties?.policyholder ? "고객" : null,
      insured: data.parties?.insured ? "피보험자" : null
    },
    advisor: {
      ...data.advisor,
      phone: null
    }
  };
}
```

## schema_gap_log 활용

새 보험사 또는 새 양식이 들어오면 기존 표준 스키마에 없는 항목이 생길 수 있습니다.

이 경우 아래 로그를 확인합니다.

```text
insurance_json_output/schema_gap_log.json
```

확인할 항목:

- `missing_standard_fields`: 필수에 가까운 표준 필드인데 못 채운 항목
- `potential_schema_extensions`: 새 필드 또는 alias 후보
- `unparsed_tables`: 보험 관련 표로 보이나 파서가 아직 해석하지 못한 표
- `warnings`: 보험사 미식별, 담보 파싱 부족 등

보완 순서:

1. `potential_schema_extensions`에서 새 라벨 확인
2. 기존 필드와 같은 의미면 `FIELD_ALIASES`에 alias 추가
3. 완전히 새로운 개념이면 `STANDARD_SCHEMA`에 필드 추가
4. 표 구조 문제면 담보/환급금 파서 로직 보완
5. 같은 PDF를 다시 실행해 로그 감소 확인

### 이 서버(InsureDesign)에서의 gap 로그

`POST /api/analysis/:id/extract` 로 PDF를 변환할 때, 표준 포맷에 없는 라벨(용어) 등
gap 상세는 append-only JSONL 로그로 남겨 추후 처리할 수 있게 합니다.

- 위치: `api-server/logs/schema-gap.jsonl` (env `SCHEMA_GAP_LOG` 로 재정의 가능)
- 기록 시점: **새로 변환된 PDF만** (참조 변경 없이 재사용된 건은 중복 기록하지 않음)
- DB 문서(`insurancePlanning.existing` / `proposal[]`)에는 요약(`extraction.schema_gap_summary`)만
  저장하고, gap 상세는 로그 파일에만 남겨 문서 비대화를 막습니다.

로그 한 줄(JSON) 예시 필드:

```json
{
  "loggedAt": "2026-09-14T12:00:00.000Z",
  "docId": "<분석 문서 id>",
  "slot": "existing | proposal[0] ...",
  "sourceUrlPath": "/uploads/....pdf",
  "originalName": "설계서.pdf",
  "insurer": "라이나생명",
  "documentType": "상품설명서",
  "missingStandardFields": [],
  "unknownLabels": [
    { "label": "우수인증 설계사/대리점", "valueSample": "...", "suggestedStandardField": null, "sourcePage": 1 }
  ],
  "unparsedTables": [],
  "warnings": []
}
```

서버 콘솔에도 변환 시 `[schema-gap]` 요약 경고가 출력되어 새 보험사/양식 유입을 즉시 확인할 수 있습니다.

## 운영 시 권장 원칙

- Node API는 파일 저장, 권한, DB, LLM 호출 담당
- Python worker는 PDF 추출만 담당
- stdout에는 JSON만 출력
- stderr에는 오류/로그만 출력
- 원본 PDF, 표준 JSON, LLM 분석 결과, schema gap log를 분리 저장
- 새 보험사 양식은 `schema_gap_log.json`으로 점진 보완

## 실행 예시

Python 변환 스크립트 직접 실행:

```powershell
cd C:\Develop\Codex\InsuranceAdvisor
& 'C:\Users\scmoo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -X utf8 insurance_pdf_to_standard_json.py
```

Node 변환 스크립트 직접 실행:

```powershell
cd C:\Develop\Codex\InsuranceAdvisor
& 'C:\Users\scmoo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' insurance_pdf_to_standard_json.mjs
```

특정 파일만 Node로 실행:

```powershell
& 'C:\Users\scmoo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' insurance_pdf_to_standard_json.mjs 'D:\OneDrive\0. InsureDesign\done1\문영애 저축 10만원.pdf'
```

## 결론

운영 구조는 Node.js 중심으로 가져가되, 보험 설계서 PDF의 표 추출 정확도를 위해 Python `pdfplumber` worker를 함께 사용하는 방식을 권장합니다.

파일명 기반 구현에서는 사용자가 넘긴 `filename`을 직접 신뢰하지 말고, 반드시 안전한 파일명 검증 후 서버 내부의 업로드 폴더와 결합해 처리해야 합니다.


보험용어 Label 정의 Table
표준 필드	의미	대표 Label / Alias	예시 값
insurer.name	보험회사	보험회사, 보험사, 회사명, 인수회사	한화손해보험
product.name	상품명	상품명, 상품, 보험상품명, 주보험명	한화 3N5 더간편건강보험
product.type	상품 유형	상품형태, 상품유형, 상품종류, 보종, 종목	해약환급금 미지급형
product.plan	플랜/가입형태	계약사항, 가입플랜, 플랜, 가입형태	기본형, 납입면제형
product.underwriting_type	고지/심사 유형	고지유형, 건강고지유형, 간편고지유형	3N5간편고지형
product.refund_type	환급 유형	해약환급금, 해지환급금, 환급유형	납입후 50% 지급형
proposal.proposal_number	설계/청약 번호	설계번호, 청약번호, 가입설계번호, 발행번호	LA260109332453
proposal.issued_at	발행/설계 일시	발행일, 발행일시, 설계일시, 작성일시	2026.01.09 17:27
proposal.payment_cycle	납입 주기	납입주기, 납입형태, 납입방법	월납
proposal.total_monthly_premium_krw	월 보험료	보험료, 합계보험료, 월보험료, 초회보험료, 할인후초회보험료	100,000원
parties.policyholder	계약자	계약자, 계약자명, 계약자 성명	문영애
parties.insured	피보험자	피보험자, 피보험자명, 주피보험자, 대표피보험자	문영애
parties.age_change_date	보험나이 변경일	보험나이변경일, 상령일, 보험료 상령일	매년 8월 19일
parties.job	직업/직무	직업, 직업급수, 직무, 직업/직무	보험대리점주
advisor.name	모집인/설계사	모집자, 보험모집자, 담당설계사, 컨설턴트, RC	문경운
advisor.phone	모집인 휴대전화	연락처, 휴대전화, 핸드폰, Mobile	010-7577-3065
advisor.office_phone	지점/사무실 전화	전화번호, Tel, 대표전화	032-424-7726
advisor.branch	소속/지점	소속, 지점명, 판매지점, 대리점명	GAK-휴먼선운
advisor.advisor_id	모집인 식별번호	고유번호, 모집인번호, 설계사번호	19990565030045
coverages[].name	담보명	가입담보, 담보명, 보장명, 특약명	질병사망
coverages[].coverage_amount	가입금액	가입금액, 보험가입금액, 지급금액	2,700만원
coverages[].monthly_premium_krw	담보별 보험료	보험료, 담보보험료	46,197원
coverages[].period_text	납입/보험기간	만기/납기, 납입 및 만기, 납입기간/보험기간	80세만기 / 10년납
refund_schedule[]	해약환급금 예시	해약환급금, 환급률, 납입보험료	30년, 환급률 43.3%


미지정 용어 발생시 처리방안
상황	처리	로그 위치	다음 조치
기존 필드와 같은 뜻의 새 라벨	JSON 변환은 계속 진행, potential_schema_extensions에 기록	schema_gap_log.json	FIELD_ALIASES에 alias 추가
완전히 새로운 보험 개념	원문은 raw.pages, raw.tables에 보존	schema_gap_log.json	STANDARD_SCHEMA에 새 필드 추가 검토
담보 표를 못 읽음	가능한 원문 텍스트만 저장	unparsed_tables	보험사별 표 파서 패턴 추가
보험사 미식별	insurer.name = null로 저장	warnings.kind = unknown_insurer	보험사 alias 추가
필수 필드 누락	누락 필드 목록 기록	missing_standard_fields	정규식/alias/표 파서 보완
LLM 분석 전 불확실 항목 존재	분석 요청에 schema_gap_summary 포함	개별 JSON의 extraction.schema_gap_summary	LLM에게 “추출 불확실”로 표시


운영 규칙
1. 새 용어 발견 시 바로 스키마를 늘리지 말고 먼저 FIELD_ALIASES로 흡수 가능한지 본다.
2. 같은 의미의 표현이면 alias 추가가 우선이다.
3. 새 보험 개념이면 STANDARD_SCHEMA 확장 후보로 둔다.
4. 표 구조 문제는 schema_gap_log.json의 unparsed_tables를 보고 파서 보완한다.
5. LLM에는 표준 JSON과 schema_gap_summary를 함께 전달해 추출 신뢰도를 반영한다.

{
  "source": {
    "based_on": "제공된 보험 설계서 PDF 14개 변환 결과",
    "json_folder": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output",
    "schema_file": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output\\standard_schema.json",
    "gap_log_file": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output\\schema_gap_log.json"
  },
  "insurers_observed": [
    "현대해상",
    "흥국화재",
    "한화손해보험",
    "삼성화재",
    "KB손해보험",
    "한화생명",
    "라이나생명"
  ],
  "label_dictionary": {
    "insurer.name": {
      "meaning": "보험회사",
      "observed_labels": ["보험회사", "보험사", "회사명", "인수회사"],
      "observed_values": ["현대해상", "흥국화재", "한화손해보험", "삼성화재", "KB손해보험", "한화생명", "라이나생명"]
    },
    "product.name": {
      "meaning": "상품명",
      "observed_labels": ["상품명", "상품", "보험상품명", "주보험명"],
      "observed_values_examples": [
        "무배당현대해상내삶엔(3N)맞춤간편건강보험",
        "무배당 흥Good 든든한 3N5간편 종합보험",
        "한화 시그니처 여성 간편건강보험4.0 무배당",
        "무배당 삼성화재 건강보험 New내돈내삼1640",
        "KB 5.10.10 Young 플러스 건강보험",
        "시그니처 H통합보험",
        "무배당새로담는간편건강보험"
      ]
    },
    "product.type": {
      "meaning": "상품 유형/형태",
      "observed_labels": ["상품형태", "상품유형", "상품종류", "보종", "종목"],
      "observed_values_examples": [
        "해약환급금미지급형",
        "해약환급금지급형",
        "납입후 해약환급금지급형의 50%지급형",
        "세만기형",
        "20년갱신형",
        "갱신형"
      ]
    },
    "product.plan": {
      "meaning": "가입 플랜/계약사항",
      "observed_labels": ["계약사항", "가입플랜", "플랜", "가입형태", "가입유형"],
      "observed_values_examples": [
        "기본형",
        "납입면제형",
        "납입면제 미운영형",
        "12대 납입면제",
        "기본플랜",
        "99형(3.9.9.9)"
      ]
    },
    "product.underwriting_type": {
      "meaning": "고지/심사 유형",
      "observed_labels": ["고지유형", "건강고지 유형구분", "건강고지유형", "간편고지유형", "고지형"],
      "observed_values_examples": [
        "3N5간편고지형",
        "3형(345간편고지형)",
        "9형(355간편고지형(고혈압및당뇨추가고지))",
        "8년고지",
        "10년고지",
        "건강고지형(10년)"
      ]
    },
    "product.refund_type": {
      "meaning": "해약/해지 환급 유형",
      "observed_labels": ["해약환급금", "해지환급금", "환급유형", "해약환급금 유형", "해지환급금 유형"],
      "observed_values_examples": [
        "해약환급금미지급형",
        "해약환급금지급형",
        "납입후50%해약환급금지급형",
        "해약환급금 미지급형Ⅱ",
        "해약환급금50%지급형"
      ]
    },
    "proposal.proposal_number": {
      "meaning": "설계/청약/발행 번호",
      "observed_labels": ["설계번호", "청약번호", "가입설계번호", "발행번호", "증권번호", "계약번호"],
      "observed_values_examples": [
        "L02601186411",
        "942694302101",
        "LA260109313219",
        "1269203458500001",
        "RQ26-52848060",
        "0526011659724"
      ]
    },
    "proposal.issued_at": {
      "meaning": "발행/설계 일시",
      "observed_labels": ["발행일", "발행일시", "청약서 발행일시", "설계일시", "작성일", "작성일시", "발급일시"],
      "observed_values_examples": [
        "2026-01-08",
        "2026-01-19",
        "2026.01.09. 17:20",
        "2026-08-13 14:36:09",
        "2026.01.16. 16:28:08"
      ]
    },
    "proposal.payment_cycle": {
      "meaning": "보험료 납입 주기",
      "observed_labels": ["납입주기", "납입형태", "보험료 납입주기", "납입방법"],
      "observed_values_examples": ["월납", "매월", "1월납"]
    },
    "proposal.total_monthly_premium_krw": {
      "meaning": "월/합계 보험료",
      "observed_labels": [
        "보험료",
        "합계보험료",
        "월보험료",
        "초회보험료",
        "1회 보험료",
        "1회차보험료",
        "1회차보험료(할인후)",
        "할인후초회보험료",
        "적용보험료",
        "적용(초회)보험료",
        "영업보험료",
        "보장보험료"
      ],
      "observed_values_examples": [
        "252,610원",
        "221,834원",
        "300,000원",
        "155,365원",
        "56,632원",
        "100,000원",
        "82,143원",
        "41,867원",
        "28,860원",
        "34,395원"
      ]
    },
    "parties.policyholder": {
      "meaning": "계약자",
      "observed_labels": ["계약자", "계약자명", "계 약 자", "계약자 성명"],
      "observed_values_examples": ["고재민", "권언규", "권영미", "김동훈", "김유리안", "문영애", "연다혜", "연동욱", "조성대"]
    },
    "parties.insured": {
      "meaning": "피보험자",
      "observed_labels": ["피보험자", "피보험자명", "피 보 험 자", "주피보험자", "(대표)피보험자", "대표피보험자"],
      "observed_values_examples": ["고재민", "권언규", "권영미", "김동훈", "김유리안", "문영애", "연다혜", "연동욱", "조성대"]
    },
    "parties.age_change_date": {
      "meaning": "보험나이 변경일/상령일",
      "observed_labels": ["보험나이변경일", "보험나이 변경일", "보험나이 변경일자", "상령일", "보험료 상령일"],
      "observed_values_examples": [
        "매년 1월 7일",
        "매년 8월 19일",
        "매년 11월 28일",
        "2026-08-15",
        "2027-02-18"
      ]
    },
    "parties.job": {
      "meaning": "직업/직무",
      "observed_labels": ["직업", "직업급수", "직무", "직업/직무"],
      "observed_values_examples": [
        "전업주부, 1급",
        "보험대리점주 및 사용인(당사), 2급",
        "회사 사무직 종사자"
      ]
    },
    "advisor.name": {
      "meaning": "보험모집자/설계사",
      "observed_labels": ["모집자", "보험모집자", "보험모집인", "담당설계사", "컨설턴트", "설계사명", "하이플래너", "RC"],
      "observed_values_examples": ["문경운", "문영애"]
    },
    "advisor.phone": {
      "meaning": "모집자 휴대전화",
      "observed_labels": ["연락처", "휴대전화", "핸드폰", "핸 드 폰", "Mobile", "모바일"],
      "observed_values_examples": ["010-7577-3065", "010)7577-3065", "010.7577.3065", "010-8334-8564"]
    },
    "advisor.office_phone": {
      "meaning": "지점/사무실 전화",
      "observed_labels": ["전화번호", "전 화 번 호", "Tel", "대표전화"],
      "observed_values_examples": ["032-424-7726", "032)424-7726"]
    },
    "advisor.branch": {
      "meaning": "모집자 소속/지점/대리점",
      "observed_labels": ["소속", "소 속", "지점명", "판매지점", "대리점명", "보험대리점명"],
      "observed_values_examples": [
        "부평AM지점",
        "경인GA지점",
        "부천GA지점 / GAK-휴먼선운",
        "인천GA-프런티어3지점",
        "지에이코리아 휴먼선운지점"
      ]
    },
    "advisor.advisor_id": {
      "meaning": "모집자 식별번호",
      "observed_labels": ["고유번호", "모집인번호", "설계사번호", "인증번호"],
      "observed_values_examples": ["19990565030045", "20251120003441", "7000109064", "2026-08097"]
    }
  },
  "coverage_term_frequency": {
    "수술": 113,
    "치료": 100,
    "암": 100,
    "질병": 84,
    "진단": 64,
    "상해": 64,
    "유사암": 52,
    "입원": 45,
    "항암": 39,
    "방사선": 21,
    "뇌": 21,
    "갑상선": 19,
    "사망": 16,
    "간병": 13,
    "골절": 12,
    "뇌혈관": 10,
    "심장": 10,
    "납입면제": 9,
    "허혈성": 9,
    "로봇": 8,
    "통원": 7,
    "후유장해": 6,
    "뇌출혈": 5,
    "화상": 4,
    "급성심근경색": 3
  },
  "coverage_label_dictionary": {
    "coverages[].name": {
      "meaning": "담보/특약명",
      "observed_labels": ["가입담보", "담보명", "담 보 명", "담보가입현황", "보장명", "가입담보 및 보장내용"],
      "examples": [
        "질병사망",
        "암진단비",
        "유사암진단비",
        "뇌혈관질환진단",
        "허혈성심장질환진단",
        "상해입원일당",
        "질병수술비",
        "항암방사선치료",
        "로봇수술",
        "보험료납입면제대상"
      ]
    },
    "coverages[].coverage_amount": {
      "meaning": "가입금액/보험가입금액",
      "observed_labels": ["가입금액", "보험가입금액", "지급금액"],
      "examples": ["10만원", "100만원", "500만원", "1,000만원", "3,000만원", "5,000만원", "1억원"]
    },
    "coverages[].monthly_premium_krw": {
      "meaning": "담보별 보험료",
      "observed_labels": ["보험료", "보험료(원)", "담보보험료"],
      "examples": ["21원", "496원", "2,985원", "46,197원", "58,300원"]
    },
    "coverages[].period_text": {
      "meaning": "납입기간/보험기간",
      "observed_labels": ["납기/만기", "만기/납기", "납입 및 만기", "납입기간/보험기간", "보험기간", "납입기간"],
      "examples": ["10년납 / 100세만기", "20년납90세만기", "20년갱신 100세만기", "30년납 / 종신"]
    }
  },
  "unmapped_or_schema_extension_candidates": [
    {
      "label": "사망보험금수익자",
      "value_sample": "법정상속인",
      "suggested_field": "beneficiaries.death_benefit"
    },
    {
      "label": "만기수익자",
      "value_sample": "계약자명",
      "suggested_field": "beneficiaries.maturity_benefit"
    },
    {
      "label": "운전여부",
      "value_sample": "자가용",
      "suggested_field": "parties.driving_status"
    },
    {
      "label": "보장담보 개요",
      "value_sample": "기본계약/특약 대상 계약 수 및 해당 보험료",
      "suggested_field": "premium_summary.coverage_overview"
    },
    {
      "label": "보험유형",
      "value_sample": "보장성보험",
      "suggested_field": "product.insurance_type"
    },
    {
      "label": "적용금리유형",
      "value_sample": "금리연동형",
      "suggested_field": "product.interest_rate_type"
    },
    {
      "label": "해약환급률",
      "value_sample": "3년/5년/7년 환급률",
      "suggested_field": "refund_schedule"
    },
    {
      "label": "고객콜센터",
      "value_sample": "1544-0114",
      "suggested_field": "insurer.customer_center"
    },
    {
      "label": "홈페이지",
      "value_sample": "www.kbinsure.co.kr",
      "suggested_field": "insurer.homepage"
    },
    {
      "label": "우수인증 설계사/대리점",
      "value_sample": "인증번호 2026-08097",
      "suggested_field": "advisor.certification"
    }
  ],
  "recommended_schema_additions": {
    "beneficiaries": {
      "death_benefit": "사망보험금 수익자",
      "maturity_benefit": "만기/중도/해약환급금 수익자",
      "non_death_benefit": "사망 외 보험금 수익자"
    },
    "parties": {
      "driving_status": "운전 여부/운전 형태",
      "motorcycle_status": "이륜차 탑승 여부"
    },
    "product": {
      "insurance_type": "보장성/저축성 등 보험유형",
      "interest_rate_type": "금리연동형/확정금리형 등 적용금리 유형"
    },
    "insurer": {
      "customer_center": "보험회사 고객센터",
      "homepage": "보험회사 홈페이지"
    },
    "advisor": {
      "certification": "우수인증 설계사/대리점 인증 정보"
    }
  }
}{
  "source": {
    "based_on": "제공된 보험 설계서 PDF 14개 변환 결과",
    "json_folder": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output",
    "schema_file": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output\\standard_schema.json",
    "gap_log_file": "C:\\Develop\\Codex\\InsuranceAdvisor\\insurance_json_output\\schema_gap_log.json"
  },
  "insurers_observed": [
    "현대해상",
    "흥국화재",
    "한화손해보험",
    "삼성화재",
    "KB손해보험",
    "한화생명",
    "라이나생명"
  ],
  "label_dictionary": {
    "insurer.name": {
      "meaning": "보험회사",
      "observed_labels": ["보험회사", "보험사", "회사명", "인수회사"],
      "observed_values": ["현대해상", "흥국화재", "한화손해보험", "삼성화재", "KB손해보험", "한화생명", "라이나생명"]
    },
    "product.name": {
      "meaning": "상품명",
      "observed_labels": ["상품명", "상품", "보험상품명", "주보험명"],
      "observed_values_examples": [
        "무배당현대해상내삶엔(3N)맞춤간편건강보험",
        "무배당 흥Good 든든한 3N5간편 종합보험",
        "한화 시그니처 여성 간편건강보험4.0 무배당",
        "무배당 삼성화재 건강보험 New내돈내삼1640",
        "KB 5.10.10 Young 플러스 건강보험",
        "시그니처 H통합보험",
        "무배당새로담는간편건강보험"
      ]
    },
    "product.type": {
      "meaning": "상품 유형/형태",
      "observed_labels": ["상품형태", "상품유형", "상품종류", "보종", "종목"],
      "observed_values_examples": [
        "해약환급금미지급형",
        "해약환급금지급형",
        "납입후 해약환급금지급형의 50%지급형",
        "세만기형",
        "20년갱신형",
        "갱신형"
      ]
    },
    "product.plan": {
      "meaning": "가입 플랜/계약사항",
      "observed_labels": ["계약사항", "가입플랜", "플랜", "가입형태", "가입유형"],
      "observed_values_examples": [
        "기본형",
        "납입면제형",
        "납입면제 미운영형",
        "12대 납입면제",
        "기본플랜",
        "99형(3.9.9.9)"
      ]
    },
    "product.underwriting_type": {
      "meaning": "고지/심사 유형",
      "observed_labels": ["고지유형", "건강고지 유형구분", "건강고지유형", "간편고지유형", "고지형"],
      "observed_values_examples": [
        "3N5간편고지형",
        "3형(345간편고지형)",
        "9형(355간편고지형(고혈압및당뇨추가고지))",
        "8년고지",
        "10년고지",
        "건강고지형(10년)"
      ]
    },
    "product.refund_type": {
      "meaning": "해약/해지 환급 유형",
      "observed_labels": ["해약환급금", "해지환급금", "환급유형", "해약환급금 유형", "해지환급금 유형"],
      "observed_values_examples": [
        "해약환급금미지급형",
        "해약환급금지급형",
        "납입후50%해약환급금지급형",
        "해약환급금 미지급형Ⅱ",
        "해약환급금50%지급형"
      ]
    },
    "proposal.proposal_number": {
      "meaning": "설계/청약/발행 번호",
      "observed_labels": ["설계번호", "청약번호", "가입설계번호", "발행번호", "증권번호", "계약번호"],
      "observed_values_examples": [
        "L02601186411",
        "942694302101",
        "LA260109313219",
        "1269203458500001",
        "RQ26-52848060",
        "0526011659724"
      ]
    },
    "proposal.issued_at": {
      "meaning": "발행/설계 일시",
      "observed_labels": ["발행일", "발행일시", "청약서 발행일시", "설계일시", "작성일", "작성일시", "발급일시"],
      "observed_values_examples": [
        "2026-01-08",
        "2026-01-19",
        "2026.01.09. 17:20",
        "2026-08-13 14:36:09",
        "2026.01.16. 16:28:08"
      ]
    },
    "proposal.payment_cycle": {
      "meaning": "보험료 납입 주기",
      "observed_labels": ["납입주기", "납입형태", "보험료 납입주기", "납입방법"],
      "observed_values_examples": ["월납", "매월", "1월납"]
    },
    "proposal.total_monthly_premium_krw": {
      "meaning": "월/합계 보험료",
      "observed_labels": [
        "보험료",
        "합계보험료",
        "월보험료",
        "초회보험료",
        "1회 보험료",
        "1회차보험료",
        "1회차보험료(할인후)",
        "할인후초회보험료",
        "적용보험료",
        "적용(초회)보험료",
        "영업보험료",
        "보장보험료"
      ],
      "observed_values_examples": [
        "252,610원",
        "221,834원",
        "300,000원",
        "155,365원",
        "56,632원",
        "100,000원",
        "82,143원",
        "41,867원",
        "28,860원",
        "34,395원"
      ]
    },
    "parties.policyholder": {
      "meaning": "계약자",
      "observed_labels": ["계약자", "계약자명", "계 약 자", "계약자 성명"],
      "observed_values_examples": ["고재민", "권언규", "권영미", "김동훈", "김유리안", "문영애", "연다혜", "연동욱", "조성대"]
    },
    "parties.insured": {
      "meaning": "피보험자",
      "observed_labels": ["피보험자", "피보험자명", "피 보 험 자", "주피보험자", "(대표)피보험자", "대표피보험자"],
      "observed_values_examples": ["고재민", "권언규", "권영미", "김동훈", "김유리안", "문영애", "연다혜", "연동욱", "조성대"]
    },
    "parties.age_change_date": {
      "meaning": "보험나이 변경일/상령일",
      "observed_labels": ["보험나이변경일", "보험나이 변경일", "보험나이 변경일자", "상령일", "보험료 상령일"],
      "observed_values_examples": [
        "매년 1월 7일",
        "매년 8월 19일",
        "매년 11월 28일",
        "2026-08-15",
        "2027-02-18"
      ]
    },
    "parties.job": {
      "meaning": "직업/직무",
      "observed_labels": ["직업", "직업급수", "직무", "직업/직무"],
      "observed_values_examples": [
        "전업주부, 1급",
        "보험대리점주 및 사용인(당사), 2급",
        "회사 사무직 종사자"
      ]
    },
    "advisor.name": {
      "meaning": "보험모집자/설계사",
      "observed_labels": ["모집자", "보험모집자", "보험모집인", "담당설계사", "컨설턴트", "설계사명", "하이플래너", "RC"],
      "observed_values_examples": ["문경운", "문영애"]
    },
    "advisor.phone": {
      "meaning": "모집자 휴대전화",
      "observed_labels": ["연락처", "휴대전화", "핸드폰", "핸 드 폰", "Mobile", "모바일"],
      "observed_values_examples": ["010-7577-3065", "010)7577-3065", "010.7577.3065", "010-8334-8564"]
    },
    "advisor.office_phone": {
      "meaning": "지점/사무실 전화",
      "observed_labels": ["전화번호", "전 화 번 호", "Tel", "대표전화"],
      "observed_values_examples": ["032-424-7726", "032)424-7726"]
    },
    "advisor.branch": {
      "meaning": "모집자 소속/지점/대리점",
      "observed_labels": ["소속", "소 속", "지점명", "판매지점", "대리점명", "보험대리점명"],
      "observed_values_examples": [
        "부평AM지점",
        "경인GA지점",
        "부천GA지점 / GAK-휴먼선운",
        "인천GA-프런티어3지점",
        "지에이코리아 휴먼선운지점"
      ]
    },
    "advisor.advisor_id": {
      "meaning": "모집자 식별번호",
      "observed_labels": ["고유번호", "모집인번호", "설계사번호", "인증번호"],
      "observed_values_examples": ["19990565030045", "20251120003441", "7000109064", "2026-08097"]
    }
  },
  "coverage_term_frequency": {
    "수술": 113,
    "치료": 100,
    "암": 100,
    "질병": 84,
    "진단": 64,
    "상해": 64,
    "유사암": 52,
    "입원": 45,
    "항암": 39,
    "방사선": 21,
    "뇌": 21,
    "갑상선": 19,
    "사망": 16,
    "간병": 13,
    "골절": 12,
    "뇌혈관": 10,
    "심장": 10,
    "납입면제": 9,
    "허혈성": 9,
    "로봇": 8,
    "통원": 7,
    "후유장해": 6,
    "뇌출혈": 5,
    "화상": 4,
    "급성심근경색": 3
  },
  "coverage_label_dictionary": {
    "coverages[].name": {
      "meaning": "담보/특약명",
      "observed_labels": ["가입담보", "담보명", "담 보 명", "담보가입현황", "보장명", "가입담보 및 보장내용"],
      "examples": [
        "질병사망",
        "암진단비",
        "유사암진단비",
        "뇌혈관질환진단",
        "허혈성심장질환진단",
        "상해입원일당",
        "질병수술비",
        "항암방사선치료",
        "로봇수술",
        "보험료납입면제대상"
      ]
    },
    "coverages[].coverage_amount": {
      "meaning": "가입금액/보험가입금액",
      "observed_labels": ["가입금액", "보험가입금액", "지급금액"],
      "examples": ["10만원", "100만원", "500만원", "1,000만원", "3,000만원", "5,000만원", "1억원"]
    },
    "coverages[].monthly_premium_krw": {
      "meaning": "담보별 보험료",
      "observed_labels": ["보험료", "보험료(원)", "담보보험료"],
      "examples": ["21원", "496원", "2,985원", "46,197원", "58,300원"]
    },
    "coverages[].period_text": {
      "meaning": "납입기간/보험기간",
      "observed_labels": ["납기/만기", "만기/납기", "납입 및 만기", "납입기간/보험기간", "보험기간", "납입기간"],
      "examples": ["10년납 / 100세만기", "20년납90세만기", "20년갱신 100세만기", "30년납 / 종신"]
    }
  },
  "unmapped_or_schema_extension_candidates": [
    {
      "label": "사망보험금수익자",
      "value_sample": "법정상속인",
      "suggested_field": "beneficiaries.death_benefit"
    },
    {
      "label": "만기수익자",
      "value_sample": "계약자명",
      "suggested_field": "beneficiaries.maturity_benefit"
    },
    {
      "label": "운전여부",
      "value_sample": "자가용",
      "suggested_field": "parties.driving_status"
    },
    {
      "label": "보장담보 개요",
      "value_sample": "기본계약/특약 대상 계약 수 및 해당 보험료",
      "suggested_field": "premium_summary.coverage_overview"
    },
    {
      "label": "보험유형",
      "value_sample": "보장성보험",
      "suggested_field": "product.insurance_type"
    },
    {
      "label": "적용금리유형",
      "value_sample": "금리연동형",
      "suggested_field": "product.interest_rate_type"
    },
    {
      "label": "해약환급률",
      "value_sample": "3년/5년/7년 환급률",
      "suggested_field": "refund_schedule"
    },
    {
      "label": "고객콜센터",
      "value_sample": "1544-0114",
      "suggested_field": "insurer.customer_center"
    },
    {
      "label": "홈페이지",
      "value_sample": "www.kbinsure.co.kr",
      "suggested_field": "insurer.homepage"
    },
    {
      "label": "우수인증 설계사/대리점",
      "value_sample": "인증번호 2026-08097",
      "suggested_field": "advisor.certification"
    }
  ],
  "recommended_schema_additions": {
    "beneficiaries": {
      "death_benefit": "사망보험금 수익자",
      "maturity_benefit": "만기/중도/해약환급금 수익자",
      "non_death_benefit": "사망 외 보험금 수익자"
    },
    "parties": {
      "driving_status": "운전 여부/운전 형태",
      "motorcycle_status": "이륜차 탑승 여부"
    },
    "product": {
      "insurance_type": "보장성/저축성 등 보험유형",
      "interest_rate_type": "금리연동형/확정금리형 등 적용금리 유형"
    },
    "insurer": {
      "customer_center": "보험회사 고객센터",
      "homepage": "보험회사 홈페이지"
    },
    "advisor": {
      "certification": "우수인증 설계사/대리점 인증 정보"
    }
  }
}