#!/bin/sh
exec gunicorn backend.wsgi --bind 0.0.0.0:${PORT:-8000}
