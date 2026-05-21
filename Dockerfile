# Stage 1: build the React frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Python backend + built frontend
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
