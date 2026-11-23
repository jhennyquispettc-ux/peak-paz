FROM python:3.12-slim AS base
WORKDIR /service
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
EXPOSE 3030

FROM base AS test
COPY requirements-dev.txt pyproject.toml ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY tests ./tests
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3030"]

FROM base AS runtime
RUN useradd --system --no-create-home verification
USER verification
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3030"]
