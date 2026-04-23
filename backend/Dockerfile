FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

RUN chmod +x start.sh
# Convert CRLF to LF in case of Windows line endings
RUN sed -i 's/\r//' start.sh

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "start.sh"]
