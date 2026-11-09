# Scam Shield Backend Dockerfile
# Production-grade multi-stage container with Tesseract OCR (Hindi + English)

FROM python:3.12-slim

# Set environment flags for safe Python execution
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install Tesseract OCR, language data packages (Hindi + English), and curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-hin \
    tesseract-ocr-eng \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root system user and group for security
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -s /bin/false -m appuser

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code and data files
COPY app/ ./app/
COPY data/ ./data/

# Adjust file ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose internal API port
EXPOSE 8000

# Health check probe against /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
