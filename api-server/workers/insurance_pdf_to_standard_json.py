import json
import re
from datetime import datetime
from pathlib import Path

import pdfplumber


SOURCE_FILES = [
    r"D:/OneDrive/0. InsureDesign/done1/고재민 L02601186411.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/권언규 942694302101_가입제안서_권언규님_3.10.5_20년갱신형_유해지.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/권영미 시그니처.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/김동훈 942693856996_가입제안서_김동훈님_3.10.5_30년90세_무해지.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/김유리안 1269203458500001_김유리안_가입제안서.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/문영애 저축 10만원.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/성상훈님 제안서 (1).pdf",
    r"D:/OneDrive/0. InsureDesign/done1/연다혜 _82143원_RQ2652848060_상품제안서.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/연다혜 20260813_연O혜님_보장분석.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/연동욱 20260813_연O욱님_보장분석.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/연동욱 한화생명 시그니처 H통합보험(무)(건강)(10년)_제안서_연동욱_20260721144913_368424838.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/이명임 시그니처 종합.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/조성대님 새담간편_갱 28860.pdf",
    r"D:/OneDrive/0. InsureDesign/done1/조성대님 새담간편_비 34395.pdf",
]


STANDARD_SCHEMA = {
    "schema_name": "insurance_proposal_standard_json",
    "schema_version": "1.0.0",
    "purpose": "보험사별 PDF 가입제안서/상품설명서/보장분석서를 공통 구조로 저장",
    "top_level_fields": {
        "schema_version": "string",
        "document": "원본 파일, 문서 유형, 페이지 수, 추출 시각",
        "insurer": "보험회사 및 표준화된 보험사명",
        "product": "상품명, 상품 유형, 플랜/고지/환급 유형",
        "proposal": "설계번호, 청약번호, 발행일시, 납입주기, 총보험료",
        "parties": "계약자, 피보험자, 성별, 보험나이, 직업, 상령일",
        "advisor": "모집인, 소속, 연락처, 고유번호",
        "premium_summary": "총보험료, 주계약/특약 보험료, 할인 정보",
        "coverages": "담보/특약별 가입금액, 보험료, 납입기간, 보험기간",
        "refund_schedule": "해약환급금 예시 표준 배열",
        "analysis": "보장분석서일 때 기존계약 목록 및 분석 텍스트",
        "notices": "문서 내 핵심 유의사항",
        "raw": "페이지별 추출 텍스트와 표 원본",
        "extraction": "추출 도구, 경고, 필드별 신뢰도",
    },
    "coverage_item": {
        "sequence": "number|null",
        "category": "string|null",
        "name": "string",
        "coverage_amount": "string|null",
        "monthly_premium_krw": "number|null",
        "payment_period": "string|null",
        "insurance_period": "string|null",
        "period_text": "string|null",
        "source_page": "number|null",
        "raw_line": "string",
    },
    "schema_gap_log": {
        "missing_standard_fields": "표준 필드 중 값이 비어 있어 확인이 필요한 경로",
        "potential_schema_extensions": "새 스키마 필드 후보가 될 수 있는 미매핑 라벨/값 및 추천 표준 필드",
        "unparsed_tables": "보험 관련 표처럼 보이나 현재 담보/환급/분석 표로 분류하지 못한 표",
        "warnings": "해당 PDF 처리 중 발생한 경고",
    },
    "field_aliases": "보험사별 라벨 차이를 표준 필드 경로로 매핑하는 사전",
}


FIELD_ALIASES = {
    "insurer.name": ["보험회사", "보험사", "회사명", "인수회사"],
    "product.name": ["상품명", "상품", "보험상품명", "주보험명"],
    "product.type": ["상품형태", "상품유형", "상품종류", "보종", "종목"],
    "product.plan": ["계약사항", "가입플랜", "플랜", "가입형태", "가입유형"],
    "product.underwriting_type": ["고지유형", "건강고지 유형구분", "건강고지유형", "간편고지유형", "고지형"],
    "product.refund_type": ["해약환급금", "해지환급금", "환급유형", "해약환급금 유형", "해지환급금 유형"],
    "proposal.proposal_number": ["설계번호", "청약번호", "가입설계번호", "발행번호", "증권번호", "계약번호"],
    "proposal.issued_at": ["발행일", "발행일시", "청약서 발행일시", "설계일시", "작성일", "작성일시", "발급일시"],
    "proposal.payment_cycle": ["납입주기", "납입형태", "보험료 납입주기", "납입방법"],
    "proposal.total_monthly_premium_krw": [
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
        "보장보험료",
    ],
    "parties.policyholder": ["계약자", "계약자명", "계 약 자", "계약자 성명"],
    "parties.insured": ["피보험자", "피보험자명", "피 보 험 자", "주피보험자", "(대표)피보험자", "대표피보험자"],
    "parties.age_change_date": ["보험나이변경일", "보험나이 변경일", "보험나이 변경일자", "상령일", "보험료 상령일"],
    "parties.job": ["직업", "직업급수", "직무", "직업/직무"],
    "advisor.name": ["모집자", "보험모집자", "보험모집인", "담당설계사", "컨설턴트", "설계사명", "하이플래너", "RC"],
    "advisor.phone": ["연락처", "휴대전화", "핸드폰", "핸 드 폰", "Mobile", "모바일"],
    "advisor.office_phone": ["전화번호", "전 화 번 호", "Tel", "대표전화"],
    "advisor.branch": ["소속", "소 속", "지점명", "판매지점", "대리점명", "보험대리점명"],
    "advisor.advisor_id": ["고유번호", "모집인번호", "설계사번호", "인증번호"],
}


def normalize_label(label):
    return re.sub(r"[\s:：ㆍ·_\-()/\[\]]+", "", label or "").lower()


FIELD_ALIAS_LOOKUP = {
    normalize_label(alias): field_path
    for field_path, aliases in FIELD_ALIASES.items()
    for alias in aliases
}


IMPORTANT_FIELD_PATHS = [
    ("insurer.name", ("insurer", "name")),
    ("product.name", ("product", "name")),
    ("proposal.proposal_number", ("proposal", "proposal_number")),
    ("proposal.issued_at", ("proposal", "issued_at")),
    ("proposal.total_monthly_premium_krw", ("proposal", "total_monthly_premium_krw")),
    ("parties.policyholder", ("parties", "policyholder")),
    ("parties.insured", ("parties", "insured")),
    ("advisor.name", ("advisor", "name")),
    ("advisor.phone", ("advisor", "phone")),
]


def compact(text):
    return re.sub(r"\s+", " ", text or "").strip()


def parse_money(value):
    if not value:
        return None
    value = value.replace(",", "").replace(" ", "")
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    if not match:
        return None
    number = float(match.group(1))
    if "만" in value:
        number *= 10000
    elif "천" in value and "원" in value:
        number *= 1000
    return int(round(number))


def first_match(patterns, text):
    for pattern in patterns:
        match = re.search(pattern, text, re.MULTILINE)
        if match:
            return compact(match.group(1))
    return None


def first_value_by_alias(text, standard_field):
    aliases = FIELD_ALIASES.get(standard_field, [])
    for alias in aliases:
        escaped = re.escape(alias)
        patterns = [
            rf"{escaped}\s*[:：]\s*([^\n|]+)",
            rf"{escaped}\s+([^\n|]+)",
        ]
        value = first_match(patterns, text)
        if value:
            return value
    return None


def field_for_label(label):
    normalized = normalize_label(label)
    if normalized in FIELD_ALIAS_LOOKUP:
        return FIELD_ALIAS_LOOKUP[normalized]
    for alias, field_path in FIELD_ALIAS_LOOKUP.items():
        if alias and (alias in normalized or normalized in alias):
            return field_path
    return None


def detect_insurer(text):
    candidates = [
        ("현대해상", ["현대해상"]),
        ("흥국화재", ["흥Good", "흥국화재"]),
        ("한화손해보험", ["한화손해보험", "한화 시그니처", "한화 3N5"]),
        ("삼성화재", ["삼성화재"]),
        ("KB손해보험", ["KB손보", "KB손해보험", "KB 5.10.10"]),
        ("한화생명", ["한화생명"]),
        ("라이나생명", ["lina.co.kr", "라이나", "무배당새로담는"]),
    ]
    for normalized, needles in candidates:
        if any(needle in text for needle in needles):
            return normalized
    return None


def detect_document_type(text):
    if "보장분석" in text or "전체 계약리스트" in text:
        return "보장분석서"
    if "상품설명서" in text:
        return "상품설명서"
    if "가입제안서" in text:
        return "가입제안서"
    if "상품제안서" in text:
        return "상품제안서"
    return "보험문서"


def extract_product(text):
    product_patterns = [
        r"(무배당[^\n]{5,120}보험[^\n]*)",
        r"(한화[^\n]{3,120}보험[^\n]*)",
        r"(KB[^\n]{3,120}보험[^\n]*)",
        r"(시그니처 H통합보험[^\n]*)",
    ]
    name = first_match(product_patterns, text) or first_value_by_alias(text, "product.name")
    return {
        "name": name,
        "type": first_match([r"상품명\s+([^\n]+)", r"상 품 명\s+([^\n]+)"], text) or first_value_by_alias(text, "product.type"),
        "plan": first_match([r"상품형태\s+([^\n]+)", r"계약사항\s+([^\n]+)"], text) or first_value_by_alias(text, "product.plan"),
        "underwriting_type": first_match([r"고지유형\s+([^\n]+)", r"건강고지\s*유형구분\s+([^\n]+)"], text)
        or first_value_by_alias(text, "product.underwriting_type"),
        "refund_type": first_match([r"(해약환급금[^\n]{0,60})"], text) or first_value_by_alias(text, "product.refund_type"),
    }


def extract_proposal(text):
    premium = first_match(
        [
            r"합계보험료\s*[:：]?\s*([0-9,만천백십]+원)",
            r"보\s*험\s*료\s*[:：]?\s*([0-9,]+원)",
            r"보험료\s+([0-9,]+원)",
            r"적\s*용\s*\(\s*초\s*회\s*\)\s*보\s*험\s*료\s*[:：]?\s*([0-9,]+원)",
            r"할인후초회보험료\s+([0-9,]+원)",
        ],
        text,
    )
    premium = premium or first_value_by_alias(text, "proposal.total_monthly_premium_krw")
    return {
        "proposal_number": first_match(
            [
                r"설\s*계\s*번\s*호\s*[:：]\s*([A-Z0-9\-]+)",
                r"설계번호\s+([A-Z0-9\-]+)",
                r"청약번호\s*[:：]?\s*([A-Z0-9\-]+)",
                r"가입설계번호\s+([0-9]+)",
                r"발\s*행\s*번\s*호\s*[:：]\s*([A-Z0-9]+)",
            ],
            text,
        )
        or first_value_by_alias(text, "proposal.proposal_number"),
        "issued_at": first_match(
            [
                r"발행일시\s+([0-9\-. :]+)",
                r"청약서 발행일시\s*[:：]\s*([0-9. :]+)",
                r"발\s*행\s*일\s*[:：]\s*([0-9\-]+)",
                r"설계일시\s+([0-9. APMapm:]+)",
            ],
            text,
        )
        or first_value_by_alias(text, "proposal.issued_at"),
        "payment_cycle": first_match([r"납입주기\s+([^\s]+)", r"납입형태\s+([^\s]+)"], text)
        or first_value_by_alias(text, "proposal.payment_cycle"),
        "total_monthly_premium_krw": parse_money(premium),
        "total_premium_text": premium,
    }


def extract_parties(text):
    policyholder = first_match(
        [r"계\s*약\s*자\s*명\s*[:：]\s*([^\n]+)", r"계약자\s*[:：]?\s*([가-힣*O○A-Za-z0-9]+)", r"계 약 자\s*[:：]\s*([^\n]+)"],
        text,
    ) or first_value_by_alias(text, "parties.policyholder")
    insured = first_match(
        [r"피\s*보\s*험\s*자\s*명\s*[:：]\s*([^\n]+)", r"피보험자\s*[:：]?\s*([가-힣*O○A-Za-z0-9]+)", r"피 보 험 자\s*[:：]\s*([^\n]+)"],
        text,
    ) or first_value_by_alias(text, "parties.insured")
    gender_age = first_match([r"\(([남여]자?)\s*/?\s*([0-9]+)세", r"\(([0-9]+)세\s*,\s*([남여]자?)\)"], text)
    age = first_match([r"보험나이[^\d]{0,20}([0-9]+)세", r"\(([남여]자?)\s*/?\s*([0-9]+)세"], text)
    return {
        "policyholder": policyholder,
        "insured": insured,
        "gender_age_raw": gender_age,
        "insurance_age": int(age) if age and age.isdigit() else None,
        "age_change_date": first_match(
            [r"보험나이(?:변경일자|변경일)?\s*[:：]?\s*([^\n\)]+)", r"상령일\s*([0-9\-]+)", r"상령일\s+([0-9.월 일]+)"],
            text,
        )
        or first_value_by_alias(text, "parties.age_change_date"),
        "job": first_match([r"직업\s+([^\n]+?)\s+운전형태", r"\([0-9]+세\|[남여]\|[0-9]급\|([^\)]+)\)"], text)
        or first_value_by_alias(text, "parties.job"),
    }


def extract_advisor(text):
    return {
        "name": first_match([r"보험모집자\s+([가-힣]+)", r"담당설계사\s+([가-힣]+)", r"컨설턴트\s*[:：]\s*([가-힣]+)", r"설계사명[^\n\(]*\(([가-힣]+)\)"], text)
        or first_value_by_alias(text, "advisor.name"),
        "phone": first_match([r"(010[-.) ]?\d{4}[-.) ]?\d{4})", r"Mobile\s*\(?010\)?[- ]?\d{4}[- ]?\d{4}"], text)
        or first_value_by_alias(text, "advisor.phone"),
        "office_phone": first_match([r"Tel\s+\(?([0-9]{2,3}\)?[- ]?[0-9]{3,4}[- ]?[0-9]{4})", r"전화번호\s*[:：]\s*([0-9\-]+)"], text)
        or first_value_by_alias(text, "advisor.office_phone"),
        "branch": first_match([r"소\s*속\s*[:：]?\s*([^\n]+)", r"지점명\s+([^\n]+)", r"판매지점\s+([^\n]+)"], text)
        or first_value_by_alias(text, "advisor.branch"),
        "advisor_id": first_match([r"고유번호\s*[:：]\s*([0-9]+)", r"설계사명\s+[가-힣]+\(([0-9]+)\)"], text)
        or first_value_by_alias(text, "advisor.advisor_id"),
    }


def split_period(period_text):
    if not period_text:
        return None, None
    cleaned = compact(period_text)
    if "/" in cleaned:
        left, right = [part.strip() for part in cleaned.split("/", 1)]
        return left, right
    if "납" in cleaned and "만기" in cleaned:
        match = re.search(r"(.+?납)\s*(.+)", cleaned)
        if match:
            return compact(match.group(1)), compact(match.group(2))
    return None, cleaned


def row_text(row):
    return " ".join(compact(cell or "") for cell in row if compact(cell or ""))


def table_has_known_coverage_header(table):
    for row in table[:5]:
        joined = row_text(row)
        if ("가입금액" in joined and "보험료" in joined) and any(token in joined for token in ["가입담보", "담보", "보장명", "담 보 명"]):
            return True
    return False


def parse_sequence_name(value):
    value = compact((value or "").replace("\n", " "))
    match = re.match(r"^(\d+)\.?\s*(.+)$", value)
    if match:
        return int(match.group(1)), compact(match.group(2))
    return None, value


def build_coverage_item(sequence, name, amount, premium, period, page, raw_line, category=None):
    if not name or len(name) < 2:
        return None
    if any(stop in name for stop in ["합계", "소계", "보험료 안내", "가입담보 요약표", "담보가입현황"]):
        return None
    payment_period, insurance_period = split_period(period)
    return {
        "sequence": sequence,
        "category": category,
        "name": compact(name),
        "coverage_amount": compact(amount),
        "monthly_premium_krw": parse_money(str(premium) + "원") if premium else None,
        "payment_period": payment_period,
        "insurance_period": insurance_period,
        "period_text": compact(period),
        "source_page": page,
        "raw_line": compact(raw_line),
    }


def extract_coverages_from_tables(raw_tables):
    items = []
    for page_table in raw_tables:
        page = page_table["page"]
        for table in page_table["tables"]:
            header_index = None
            header = None
            for index, row in enumerate(table[:5]):
                if table_has_known_coverage_header([row]):
                    header_index = index
                    header = [compact(cell or "") for cell in row]
                    break
            if header_index is None:
                continue
            normalized_header = [cell.replace(" ", "") for cell in header]
            name_indices = [i for i, cell in enumerate(normalized_header) if cell in {"가입담보", "담보가입현황", "담보명", "담보"} or "보장명" in cell]
            amount_indices = [i for i, cell in enumerate(normalized_header) if "가입금액" in cell]
            premium_indices = [i for i, cell in enumerate(normalized_header) if "보험료" in cell]
            period_indices = [i for i, cell in enumerate(normalized_header) if any(token in cell for token in ["납기", "만기", "납입및만기", "납입기간/보험기간"])]
            name_index = name_indices[0] if name_indices else None
            amount_index = amount_indices[0] if amount_indices else None
            premium_index = premium_indices[0] if premium_indices else None
            period_index = period_indices[0] if period_indices else None
            for row in table[header_index + 1 :]:
                cells = [compact((cell or "").replace("\n", " ")) for cell in row]
                if not row_text(cells):
                    continue
                if "합계" in row_text(cells):
                    continue
                sequence = None
                name = cells[name_index] if name_index is not None and name_index < len(cells) else ""
                if not name:
                    for i, cell in enumerate(cells):
                        if re.match(r"^\d+\.?$", cell) and i + 1 < len(cells):
                            sequence = int(cell.rstrip("."))
                            name = cells[i + 1]
                            break
                    if not name:
                        text_cells = [cell for cell in cells if cell and not re.fullmatch(r"[0-9,.]+원?", cell)]
                        name = text_cells[0] if text_cells else ""
                parsed_sequence, parsed_name = parse_sequence_name(name)
                sequence = sequence or parsed_sequence
                name = parsed_name
                amount = cells[amount_index] if amount_index is not None and amount_index < len(cells) else ""
                premium = cells[premium_index] if premium_index is not None and premium_index < len(cells) else ""
                period = cells[period_index] if period_index is not None and period_index < len(cells) else ""
                if not amount:
                    amount_candidates = [cell for cell in cells if re.search(r"\d", cell) and any(unit in cell for unit in ["원", "만원", "천만원", "백만원"])]
                    amount = amount_candidates[0] if amount_candidates else ""
                if not period:
                    period_candidates = [cell for cell in cells if any(token in cell for token in ["납", "만기", "갱신", "종신"])]
                    period = period_candidates[-1] if period_candidates else ""
                item = build_coverage_item(sequence, name, amount, premium, period, page, row_text(cells))
                if item:
                    items.append(item)
    return items


def extract_coverages(page_texts, raw_tables):
    items = []
    items.extend(extract_coverages_from_tables(raw_tables))
    coverage_line = re.compile(
        r"^(?:(\d+)[\.\s])?\s*(?:\[[^\]]+\])?(.{4,140}?(?:담보|특약|보험금|진단비|수술비|치료비|입원일당|사망|후유장해|자금))\s+([0-9,]+(?:만|천|백)?원)\s+([0-9,]+)\s*(?:[0-9.]+)?\s+(.{2,40}(?:만기|종신|갱신|년|세).*)$"
    )
    hanwha_line = re.compile(
        r"^(.{4,150}(?:특약|주계약|보험금|진단보장|수술특약|통원특약|치료특약)[^\n]*?)\s+([0-9,]+(?:만|천|백)?원)\s+(.{2,30}/.{2,30})\s+([0-9,만천백십]+원)$"
    )
    for page in page_texts:
        for raw in page["text"].splitlines():
            line = compact(raw)
            if not line or "가입금액" in line or "보험료" in line and len(line) < 20:
                continue
            match = coverage_line.match(line)
            if match:
                item = build_coverage_item(
                    int(match.group(1)) if match.group(1) else None,
                    match.group(2),
                    match.group(3),
                    match.group(4),
                    match.group(5),
                    page["page"],
                    line,
                )
                if item:
                    items.append(item)
                continue
            match = hanwha_line.match(line)
            if match:
                item = build_coverage_item(
                    None,
                    match.group(1),
                    match.group(2),
                    match.group(4),
                    match.group(3),
                    page["page"],
                    line,
                )
                if item:
                    items.append(item)
    deduped = []
    seen = set()
    for item in items:
        key = (item["name"], item["coverage_amount"], item["monthly_premium_krw"], item["period_text"])
        if key not in seen:
            seen.add(key)
            deduped.append(item)
    return deduped


def extract_refunds(page_texts):
    refunds = []
    pattern = re.compile(r"^([0-9]+년|[0-9]+개월)\s+([0-9]+세)\s+([0-9,]+)\s+([0-9,]+)\s+([0-9.]+)$")
    for page in page_texts:
        for raw in page["text"].splitlines():
            line = compact(raw)
            match = pattern.match(line)
            if match:
                refunds.append(
                    {
                        "elapsed": match.group(1),
                        "age": int(match.group(2).replace("세", "")),
                        "paid_premium_krw": int(match.group(3).replace(",", "")),
                        "refund_krw": int(match.group(4).replace(",", "")),
                        "refund_rate_percent": float(match.group(5)),
                        "source_page": page["page"],
                    }
                )
    return refunds


def extract_analysis(page_texts, document_type):
    if document_type != "보장분석서":
        return None
    contracts = []
    pattern = re.compile(r"^(\d+)\s+([가-힣A-Za-z]+)\s+([0-9\-]{10})\s+(월납|연납|일시납|0년)?\s*([0-9]+년|0년)?\s*([0-9]+세|종신)?\s+(.+?)([0-9,]+원|보험료미제공)?$")
    for page in page_texts:
        for raw in page["text"].splitlines():
            line = compact(raw)
            match = pattern.match(line)
            if match:
                contracts.append(
                    {
                        "sequence": int(match.group(1)),
                        "insurer": match.group(2),
                        "contract_date": match.group(3),
                        "payment_cycle": match.group(4),
                        "payment_period": match.group(5),
                        "insurance_period": match.group(6),
                        "product_name": compact(match.group(7)),
                        "premium_text": match.group(8),
                        "monthly_premium_krw": parse_money(match.group(8)),
                        "source_page": page["page"],
                        "raw_line": line,
                    }
                )
    return {"contracts": contracts, "summary_text": page_texts[0]["text"][:1000] if page_texts else ""}


def extract_notices(text):
    notices = []
    notice_needles = [
        "상품설명서 전체를 제공받고 설명",
        "해약환급금",
        "갱신시",
        "보험료가 인상",
        "만기보험금",
        "청약을 철회",
        "계약 전 알릴의무",
    ]
    for line in text.splitlines():
        cleaned = compact(line)
        if any(needle in cleaned for needle in notice_needles) and len(cleaned) > 20:
            notices.append(cleaned)
    return notices[:20]


def nested_get(data, path):
    current = data
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def missing_standard_fields(result):
    missing = []
    for label, path in IMPORTANT_FIELD_PATHS:
        value = nested_get(result, path)
        if value is None or value == "" or value == []:
            missing.append(label)
    if result["document"]["document_type"] != "보장분석서" and not result["coverages"]:
        missing.append("coverages")
    if result["document"]["document_type"] == "보장분석서":
        contracts = (result.get("analysis") or {}).get("contracts") or []
        if not contracts:
            missing.append("analysis.contracts")
    return missing


def candidate_key_values(page_texts):
    candidates = []
    label_pattern = re.compile(r"^([가-힣A-Za-z0-9·ㆍ/() _-]{2,30})\s*[:：]\s*(.{1,120})$")
    seen = set()
    for page in page_texts:
        for raw in page["text"].splitlines():
            line = compact(raw)
            match = label_pattern.match(line)
            if not match:
                continue
            label = compact(match.group(1))
            value = compact(match.group(2))
            suggested_field = field_for_label(label)
            if suggested_field:
                continue
            key = (label, value[:40])
            if key in seen:
                continue
            seen.add(key)
            label_tokens = set(re.findall(r"[가-힣A-Za-z0-9]+", label))
            suggested_field = None
            for field_path, aliases in FIELD_ALIASES.items():
                alias_tokens = set()
                for alias in aliases:
                    alias_tokens.update(re.findall(r"[가-힣A-Za-z0-9]+", alias))
                if label_tokens and alias_tokens and label_tokens & alias_tokens:
                    suggested_field = field_path
                    break
            candidates.append(
                {
                    "kind": "unmapped_key_value",
                    "label": label,
                    "value_sample": value[:120],
                    "suggested_standard_field": suggested_field,
                    "source_page": page["page"],
                    "suggested_action": "새 표준 필드로 둘지, FIELD_ALIASES의 기존 표준 필드 alias로 흡수할지 검토",
                }
            )
    return candidates[:50]


def unparsed_insurance_tables(raw_tables):
    unparsed = []
    insurance_tokens = ["가입금액", "보험료", "담보", "보장", "특약", "해약환급금", "환급률", "계약", "납입", "만기"]
    for page_table in raw_tables:
        for table_index, table in enumerate(page_table["tables"], start=1):
            sample_rows = [row_text(row) for row in table[:4] if row_text(row)]
            joined = " ".join(sample_rows)
            if not any(token in joined for token in insurance_tokens):
                continue
            is_known_coverage = table_has_known_coverage_header(table)
            is_refund = "해약환급금" in joined or ("환급률" in joined and "납입보험료" in joined)
            is_analysis = "전체 계약리스트" in joined or "계약리스트" in joined
            if is_known_coverage or is_refund or is_analysis:
                continue
            unparsed.append(
                {
                    "page": page_table["page"],
                    "table_index": table_index,
                    "header_sample": sample_rows[0] if sample_rows else "",
                    "row_sample": sample_rows[1:4],
                    "reason": "보험 관련 표로 보이나 현재 표준 파서가 담보/환급/보장분석 표로 분류하지 못함",
                    "suggested_action": "표 헤더와 열 의미를 확인해 standard_schema.json 또는 파서 매핑 보완",
                }
            )
    return unparsed[:100]


def coverage_quality_warnings(result, page_texts):
    all_text = "\n".join(page["text"] for page in page_texts)
    warnings = []
    if result["document"]["document_type"] != "보장분석서" and "가입" in all_text and "담보" in all_text and len(result["coverages"]) < 3:
        warnings.append(
            {
                "kind": "low_coverage_parse_count",
                "message": "문서에 가입담보 관련 텍스트가 있으나 표준 coverages 추출 수가 3개 미만입니다.",
                "coverage_count": len(result["coverages"]),
                "suggested_action": "raw.tables에서 해당 보험사의 담보 표 헤더를 확인해 파서 매핑을 추가",
            }
        )
    if not result["insurer"]["name"]:
        warnings.append(
            {
                "kind": "unknown_insurer",
                "message": "보험사명을 표준 보험사 목록으로 식별하지 못했습니다.",
                "suggested_action": "detect_insurer() 후보 목록 또는 insurer alias 테이블 보완",
            }
        )
    return warnings


def build_schema_gap_log(result, page_texts, raw_tables):
    candidates = candidate_key_values(page_texts)
    unparsed_tables = unparsed_insurance_tables(raw_tables)
    warnings = coverage_quality_warnings(result, page_texts)
    return {
        "source_path": result["document"]["source_path"],
        "file_name": result["document"]["file_name"],
        "insurer": result["insurer"]["name"],
        "document_type": result["document"]["document_type"],
        "missing_standard_fields": missing_standard_fields(result),
        "potential_schema_extensions": candidates,
        "unparsed_tables": unparsed_tables,
        "warnings": warnings + result["extraction"]["warnings"],
    }


def convert_pdf(path):
    source = Path(path)
    page_texts = []
    raw_tables = []
    warnings = []
    with pdfplumber.open(str(source)) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
            page_texts.append({"page": index, "text": text})
            try:
                tables = page.extract_tables() or []
            except Exception as exc:
                warnings.append(f"page {index} table extraction failed: {exc}")
                tables = []
            if tables:
                raw_tables.append({"page": index, "tables": tables})
        all_text = "\n".join(item["text"] for item in page_texts)
        doc_type = detect_document_type(all_text)
        result = {
            "schema_version": STANDARD_SCHEMA["schema_version"],
            "document": {
                "source_path": str(source),
                "file_name": source.name,
                "document_type": doc_type,
                "page_count": len(pdf.pages),
                "file_size_bytes": source.stat().st_size,
                "extracted_at": datetime.now().isoformat(timespec="seconds"),
            },
            "insurer": {
                "name": detect_insurer(all_text),
                "raw_mentions": sorted(set(re.findall(r"(한화생명|한화손해보험|현대해상|흥국화재|삼성화재|KB손보|KB손해보험|라이나)", all_text))),
            },
            "product": extract_product(all_text),
            "proposal": extract_proposal(all_text),
            "parties": extract_parties(all_text),
            "advisor": extract_advisor(all_text),
            "premium_summary": {
                "total_monthly_premium_krw": extract_proposal(all_text)["total_monthly_premium_krw"],
                "total_premium_text": extract_proposal(all_text)["total_premium_text"],
                "discounts": re.findall(r"(할인[^\n]{0,40})", all_text)[:10],
            },
            "coverages": extract_coverages(page_texts, raw_tables),
            "refund_schedule": extract_refunds(page_texts),
            "analysis": extract_analysis(page_texts, doc_type),
            "notices": extract_notices(all_text),
            "raw": {
                "pages": page_texts,
                "tables": raw_tables,
            },
            "extraction": {
                "tool": "pdfplumber",
                "warnings": warnings,
                "confidence": {
                    "document": "high",
                    "proposal": "medium",
                    "coverages": "medium",
                    "raw_text": "high",
                    "raw_tables": "medium",
                },
            },
        }
        schema_gap = build_schema_gap_log(result, page_texts, raw_tables)
        result["extraction"]["schema_gap_summary"] = {
            "missing_standard_field_count": len(schema_gap["missing_standard_fields"]),
            "potential_schema_extension_count": len(schema_gap["potential_schema_extensions"]),
            "unparsed_table_count": len(schema_gap["unparsed_tables"]),
            "warning_count": len(schema_gap["warnings"]),
        }
        # 표준 포맷에 없는 라벨/표 등 전체 gap 상세도 함께 반환하여
        # Node 측에서 로그로 영속화(추후 처리)할 수 있게 한다.
        result["extraction"]["schema_gap"] = schema_gap
    return result


def safe_stem(name):
    return re.sub(r'[<>:"/\\\\|?*]+', "_", Path(name).stem).strip()


def main():
    output_dir = Path("insurance_json_output")
    output_dir.mkdir(exist_ok=True)
    (output_dir / "standard_schema.json").write_text(
        json.dumps({**STANDARD_SCHEMA, "field_aliases": FIELD_ALIASES}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    index = []
    schema_gap_logs = []
    for source_path in SOURCE_FILES:
        source = Path(source_path)
        if not source.exists():
            missing_item = {"source_path": source_path, "status": "missing"}
            index.append(missing_item)
            schema_gap_logs.append(
                {
                    "source_path": source_path,
                    "file_name": Path(source_path).name,
                    "insurer": None,
                    "document_type": None,
                    "missing_standard_fields": ["document.source_path"],
                    "potential_schema_extensions": [],
                    "unparsed_tables": [],
                    "warnings": [{"kind": "missing_source_file", "message": "원본 PDF 파일을 찾을 수 없습니다."}],
                }
            )
            continue
        converted = convert_pdf(source)
        output_path = output_dir / f"{safe_stem(source.name)}.json"
        output_path.write_text(json.dumps(converted, ensure_ascii=False, indent=2), encoding="utf-8")
        schema_gap_logs.append(
            {
                "source_path": converted["document"]["source_path"],
                "file_name": converted["document"]["file_name"],
                "insurer": converted["insurer"]["name"],
                "document_type": converted["document"]["document_type"],
                **{
                    key: converted_gap_value
                    for key, converted_gap_value in build_schema_gap_log(
                        converted,
                        converted["raw"]["pages"],
                        converted["raw"]["tables"],
                    ).items()
                    if key
                    not in {
                        "source_path",
                        "file_name",
                        "insurer",
                        "document_type",
                    }
                },
            }
        )
        index.append(
            {
                "source_path": source_path,
                "output_file": str(output_path),
                "status": "converted",
                "insurer": converted["insurer"]["name"],
                "document_type": converted["document"]["document_type"],
                "page_count": converted["document"]["page_count"],
                "coverage_count": len(converted["coverages"]),
                "refund_row_count": len(converted["refund_schedule"]),
            }
        )
    (output_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    schema_gap_logs = [
        item
        for item in schema_gap_logs
        if item["missing_standard_fields"] or item["potential_schema_extensions"] or item["unparsed_tables"] or item["warnings"]
    ]
    (output_dir / "schema_gap_log.json").write_text(
        json.dumps(schema_gap_logs, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "schema_gap_log.jsonl").write_text(
        "\n".join(json.dumps(item, ensure_ascii=False) for item in schema_gap_logs),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output_dir": str(output_dir.resolve()),
                "files": index,
                "schema_gap_log": str((output_dir / "schema_gap_log.json").resolve()),
                "schema_gap_count": len(schema_gap_logs),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
