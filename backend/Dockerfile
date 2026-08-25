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

# Application port (Render default is 10000 or dynamically set via $PORT)
EXPOSE 7860

# Start FastAPI/Uvicorn — binds to $PORT dynamically if set (Render/Cloud), defaults to 7860
CMD ["sh", "-c", "python -m uvicorn app:app --host 0.0.0.0 --port ${PORT:-7860}"]
