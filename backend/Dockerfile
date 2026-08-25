# Python 3.11
FROM python:3.11-slim

# Prevent Python from creating .pyc files and buffer logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Application directory
WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libtesseract-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency file first for Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy application
COPY . .

# Application port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health-check')" || exit 1

# Start FastAPI/Uvicorn
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
