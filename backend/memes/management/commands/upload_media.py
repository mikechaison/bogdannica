"""
Copy files from the local MEDIA_ROOT into the configured default storage.

Used once when moving from local-disk media to an S3-compatible bucket:
run with the AWS_* variables set so that the default storage is S3Storage.
Files that already exist in the target storage are skipped, so re-running is safe.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.files import File
from django.core.files.storage import storages
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Upload every file under MEDIA_ROOT to the default storage backend (skips existing)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--dry-run", action="store_true", help="List what would be uploaded.")

    def handle(self, *args: Any, **options: Any) -> None:
        dry_run: bool = options["dry_run"]
        root = Path(settings.MEDIA_ROOT)
        if not root.is_dir():
            self.stderr.write(f"MEDIA_ROOT does not exist: {root}")
            return

        storage = storages["default"]
        backend = type(storage).__name__
        if backend == "FileSystemStorage" and Path(storage.location).resolve() == root.resolve():
            self.stderr.write(
                "Default storage is the local MEDIA_ROOT itself; set AWS_STORAGE_BUCKET_NAME "
                "(and the other AWS_* variables) so uploads go to the bucket."
            )
            return

        self.stdout.write(f"Target storage: {backend}")
        uploaded = skipped = 0
        for path in sorted(p for p in root.rglob("*") if p.is_file()):
            name = path.relative_to(root).as_posix()
            if storage.exists(name):
                skipped += 1
                self.stdout.write(f"  skip   {name}")
                continue
            if dry_run:
                self.stdout.write(f"  would  {name}")
                uploaded += 1
                continue
            with path.open("rb") as fh:
                saved = storage.save(name, File(fh))
            if saved != name:
                self.stderr.write(f"  WARNING stored under a different name: {saved}")
            uploaded += 1
            self.stdout.write(f"  upload {name}")

        verb = "would upload" if dry_run else "uploaded"
        self.stdout.write(self.style.SUCCESS(f"Done: {verb} {uploaded}, skipped {skipped}."))
