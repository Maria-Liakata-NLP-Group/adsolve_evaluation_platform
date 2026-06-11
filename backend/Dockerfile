FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so this layer is cached on code-only changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY api/ ./api/

EXPOSE 8005

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8005"]
