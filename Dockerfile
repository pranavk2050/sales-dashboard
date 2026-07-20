# --- Stage 1: build the frontend static assets ---
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: runtime image (Python backend + Litestream) ---
FROM litestream/litestream:0.3.13 AS litestream

FROM python:3.11-slim AS runtime
COPY --from=litestream /usr/local/bin/litestream /usr/local/bin/litestream

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/litestream.yml ./litestream.yml
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

COPY --from=frontend-build /frontend/dist ./static

ENV DASHBOARD_DB_PATH=/app/dashboard.db

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
