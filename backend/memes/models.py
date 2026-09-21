from __future__ import annotations

import uuid
from pathlib import Path

from django.conf import settings
from django.db import models
from django.utils.text import slugify

from .transliterate import transliterate


def article_image_upload_to(instance: "Article", filename: str) -> str:
    """Store article cover images under media/articles/<slug>/<uuid>.<ext>."""
    ext = Path(filename).suffix.lower()
    return f"articles/{instance.slug or 'unsaved'}/{uuid.uuid4().hex}{ext}"


def gallery_image_upload_to(instance: "Image", filename: str) -> str:
    """Store gallery images under media/images/<article_id>/<uuid>.<ext>."""
    ext = Path(filename).suffix.lower()
    return f"images/{instance.article_id}/{uuid.uuid4().hex}{ext}"


class Article(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    content = models.TextField()
    image = models.ImageField(upload_to=article_image_upload_to, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="articles",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args: object, **kwargs: object) -> None:
        if not self.slug:
            self.slug = self._unique_slug()
        super().save(*args, **kwargs)

    def _unique_slug(self) -> str:
        # Cyrillic titles are transliterated first; plain slugify would drop every letter.
        base = slugify(transliterate(self.title))[:200] or "article"
        slug = base
        counter = 2
        while Article.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug


class Image(models.Model):
    """An image attached to an article: either an uploaded file or an external URL."""

    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="images")
    file = models.ImageField(upload_to=gallery_image_upload_to, blank=True, null=True)
    url = models.URLField(max_length=500, blank=True)
    description = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self) -> str:
        return self.description or self.resolved_url or f"Image #{self.pk}"

    @property
    def resolved_url(self) -> str:
        """The URL to display: the uploaded file's URL wins over the external URL."""
        if self.file:
            return self.file.url
        return self.url


class Comment(models.Model):
    """A comment under an article. Anonymous visitors may sign with any name; users are linked."""

    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="comments")
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
        help_text="Comment this one replies to; null for a top-level comment. Nesting is unlimited.",
    )
    text = models.TextField(max_length=5000)
    author_name = models.CharField(max_length=100, blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="comments",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.display_name}: {self.text[:40]}"

    @property
    def display_name(self) -> str:
        if self.author_id and self.author:
            return self.author.get_username()
        return self.author_name or "Анонім"
