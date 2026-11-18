#!/usr/bin/env bash
# Build step for Render / Railway / any buildpack-style host.
# Run from the backend/ directory.
set -o errexit
# Invoke as: bash build.sh

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input
