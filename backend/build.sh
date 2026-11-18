#!/usr/bin/env bash
# Build step for Render / Railway / any buildpack-style host.
# Run from the backend/ directory. Invoke as: bash build.sh
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Optional: create the first admin account on hosts without a shell.
# Set DJANGO_SUPERUSER_USERNAME, DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD
# in the environment; the step is skipped once that user exists. Remove the
# variables afterwards so the password does not linger in the dashboard.
if [[ -n "${DJANGO_SUPERUSER_USERNAME:-}" && -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]]; then
  python manage.py createsuperuser --no-input || echo "Superuser already exists, skipping."
fi
