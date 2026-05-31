FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:5000 --workers ${WEB_CONCURRENCY:-2} --threads ${WEB_THREADS:-4} --timeout ${WEB_TIMEOUT:-60} app:app"]
