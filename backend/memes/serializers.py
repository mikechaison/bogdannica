from __future__ import annotations

from typing import Any

from rest_framework import serializers

from .models import Article, Comment, Image


class ImageSerializer(serializers.ModelSerializer):
    resolved_url = serializers.SerializerMethodField()
    article_slug = serializers.SlugField(source="article.slug", read_only=True)
    article_title = serializers.CharField(source="article.title", read_only=True)

    class Meta:
        model = Image
        fields = (
            "id", "article", "article_slug", "article_title", "file", "url",
            "description", "resolved_url", "created_at",
        )
        read_only_fields = ("id", "created_at", "resolved_url", "article_slug", "article_title")

    def get_resolved_url(self, obj: Image) -> str:
        url = obj.resolved_url
        request = self.context.get("request")
        if request is not None and url.startswith("/"):
            return request.build_absolute_uri(url)
        return url

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        file = attrs.get("file", getattr(self.instance, "file", None))
        url = attrs.get("url", getattr(self.instance, "url", ""))
        if not file and not url:
            raise serializers.ValidationError("Provide either an uploaded file or an external URL.")
        return attrs


class ArticleListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Article
        fields = ("id", "title", "slug", "image", "tags", "author", "author_id", "created_at", "updated_at")
        read_only_fields = fields


class ArticleSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    author_id = serializers.IntegerField(read_only=True)
    images = ImageSerializer(many=True, read_only=True)
    # allow_blank lets multipart clients send tags="" to clear the list; blanks are dropped in validate_tags.
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50, allow_blank=True), required=False, default=list
    )

    class Meta:
        model = Article
        fields = (
            "id", "title", "slug", "content", "image", "tags",
            "author", "author_id", "images", "created_at", "updated_at",
        )
        read_only_fields = ("id", "author", "author_id", "images", "created_at", "updated_at")
        extra_kwargs = {"slug": {"required": False}}

    def validate_tags(self, value: list[str]) -> list[str]:
        cleaned = [t.strip() for t in value if t and t.strip()]
        return list(dict.fromkeys(cleaned))


class CommentSerializer(serializers.ModelSerializer):
    """A comment with its replies nested recursively (each level oldest first)."""

    author_id = serializers.IntegerField(read_only=True)
    display_name = serializers.CharField(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=Comment.objects.all(), required=False, allow_null=True, default=None
    )
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = (
            "id", "article", "parent", "text", "author_name", "author_id",
            "display_name", "created_at", "replies",
        )
        read_only_fields = ("id", "author_id", "display_name", "created_at", "replies")

    def get_replies(self, obj: Comment) -> list[dict[str, Any]]:
        # The list view pre-groups every comment of the article by parent id so a whole tree
        # costs one query; elsewhere (create/detail) fall back to the related manager.
        children_map: dict[int, list[Comment]] | None = self.context.get("children_by_parent")
        if children_map is not None:
            children = children_map.get(obj.pk, [])
        else:
            children = list(obj.replies.select_related("author").order_by("created_at", "id"))
        if not children:
            return []
        return CommentSerializer(children, many=True, context=self.context).data

    def validate_text(self, value: str) -> str:
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Коментар не може бути порожнім.")
        return value

    def validate_author_name(self, value: str) -> str:
        return value.strip()

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        parent: Comment | None = attrs.get("parent")
        if parent is not None:
            article = attrs.get("article", getattr(self.instance, "article", None))
            if article is not None and parent.article_id != article.id:
                raise serializers.ValidationError({"parent": "Відповідь має належати тій самій статті."})
        return attrs

    def create(self, validated_data: dict[str, Any]) -> Comment:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is not None and user.is_authenticated:
            # Signed-in users always comment under their own account name.
            validated_data["author"] = user
            validated_data["author_name"] = user.get_username()
        else:
            validated_data["author"] = None
        return super().create(validated_data)
