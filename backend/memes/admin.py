from django.contrib import admin

from .models import Article, Comment, Image


class ImageInline(admin.TabularInline):
    model = Image
    extra = 1


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "author", "created_at")
    search_fields = ("title", "content")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [ImageInline]


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ("__str__", "article", "created_at")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("display_name", "article", "author", "created_at")
    list_filter = ("created_at",)
    search_fields = ("text", "author_name", "author__username")
    raw_id_fields = ("article", "author")
