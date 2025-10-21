# 파이썬 3.9 버전을 기반으로 시작합니다.
FROM python:3.9-slim

WORKDIR /app

# requirements.txt 먼저 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# [수정됨 v8.0 기준] 앱 코드와 templates, static 폴더를 명시적으로 복사
COPY main.py .
COPY templates ./templates
COPY static ./static
# --- 수정 완료 ---

# ↓↓↓↓↓↓↓↓↓↓↓↓↓↓ 이 두 줄을 추가하세요! ↓↓↓↓↓↓↓↓↓↓↓↓↓↓
COPY templates/growth.html ./templates/growth.html
COPY static/growth.js ./static/growth.js
# ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

# Gunicorn 실행 (로깅 강화 유지)
CMD exec gunicorn --bind :8080 --workers 1 --threads 8 --timeout 0 --log-level=debug --access-logfile=- --error-logfile=- main:app