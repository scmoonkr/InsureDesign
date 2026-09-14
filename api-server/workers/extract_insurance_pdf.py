"""보험 PDF -> 표준 JSON 워커.

Node API 서버가 `spawn(PYTHON, [extract_insurance_pdf.py, <pdf_path>])` 형태로 호출한다.
- stdout: 표준 JSON 한 덩어리만 출력 (Node가 JSON.parse)
- stderr: 로그/경고/에러

docs/convert_pdf_json.md 의 "Python worker 역할" 규칙을 따른다.
"""

import json
import sys
from pathlib import Path

# 같은 폴더의 변환 로직을 import (레포 내부 경로)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from insurance_pdf_to_standard_json import convert_pdf  # noqa: E402


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: extract_insurance_pdf.py <pdf_path>")

    pdf_path = Path(sys.argv[1])
    if not pdf_path.exists():
        raise FileNotFoundError(str(pdf_path))

    result = convert_pdf(pdf_path)
    # Windows 기본 stdout 인코딩(cp949)에 상관없이 항상 UTF-8 바이트로 출력.
    # (Node 스포너가 stdout을 utf8로 읽으므로 필수 — sys.stdout.write는 로케일 인코딩을 써서 깨짐)
    payload = json.dumps(result, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()


if __name__ == "__main__":
    main()
