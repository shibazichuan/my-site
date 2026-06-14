FROM python:3.12-slim
WORKDIR /app
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/
RUN pip install --no-cache-dir poetry
COPY pyproject.toml .
RUN poetry config virtualenvs.create false && poetry install --no-root
COPY . .
RUN mkdir -p /app/data/uploads
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
