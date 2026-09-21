from __future__ import annotations

from collections import defaultdict

from django.db.models import QuerySet
from rest_framework import filters, parsers, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from .models import Article, Comment, Image
from .permissions import CommentPermission, IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly
from .throttles import CommentCreateThrottle
from .serializers import ArticleListSerializer, ArticleSerializer, CommentSerializer, ImageSerializer


class ArticleViewSet(viewsets.ModelViewSet):
    """
    /api/articles/           GET (public list), POST (authenticated)
    /api/articles/<slug>/    GET (public), PUT/PATCH/DELETE (author or staff)
    """

    queryset = Article.objects.select_related("author").prefetch_related("images")
    permission_classes = (IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly)
    parser_classes = (parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("title", "content", "tags")
    ordering_fields = ("created_at", "updated_at", "title")
    ordering = ("-created_at",)
    lookup_field = "slug"

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "list":
            return ArticleListSerializer
        return ArticleSerializer

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(author=self.request.user)


class ImageViewSet(viewsets.ModelViewSet):
    """
    /api/images/          GET (public list, filter with ?article=<id>), POST (authenticated)
    /api/images/<id>/     GET (public), PUT/PATCH/DELETE (article author or staff)
    """

    queryset = Image.objects.select_related("article")
    serializer_class = ImageSerializer
    permission_classes = (IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly)
    parser_classes = (parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    search_fields = ("description", "article__title", "article__tags")
    ordering_fields = ("created_at", "id")
    ordering = ("-created_at", "-id")

    def get_queryset(self) -> QuerySet[Image]:
        qs = super().get_queryset()
        article_id = self.request.query_params.get("article")
        if article_id and article_id.isdigit():
            qs = qs.filter(article_id=int(article_id))
        return qs

    def perform_create(self, serializer: BaseSerializer) -> None:
        article: Article = serializer.validated_data["article"]
        self.check_object_permissions(self.request, article)
        serializer.save()


class CommentViewSet(viewsets.ModelViewSet):
    """
    /api/comments/          GET (public list, filter with ?article=<id>), POST (anyone, anonymous allowed)
    /api/comments/<id>/     GET (public), PATCH/DELETE (comment author or staff)
    """

    queryset = Comment.objects.select_related("author")
    serializer_class = CommentSerializer
    permission_classes = (CommentPermission,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")
    throttle_classes = (CommentCreateThrottle,)

    def get_queryset(self) -> QuerySet[Comment]:
        qs = super().get_queryset()
        if self.action == "list":
            # The list is threaded: it paginates top-level comments; replies are nested inside.
            qs = qs.filter(parent__isnull=True)
            article_id = self.request.query_params.get("article")
            if article_id and article_id.isdigit():
                qs = qs.filter(article_id=int(article_id))
        return qs

    def list(self, request: Request, *args: object, **kwargs: object) -> Response:
        roots = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(roots)
        items: list[Comment] = list(page) if page is not None else list(roots)

        # One query for every reply under the listed articles, grouped by parent id;
        # the serializer walks this map recursively instead of querying per level.
        children_by_parent: dict[int, list[Comment]] = defaultdict(list)
        article_ids = {c.article_id for c in items}
        if article_ids:
            replies = (
                Comment.objects.filter(article_id__in=article_ids, parent__isnull=False)
                .select_related("author")
                .order_by("created_at", "id")
            )
            for reply in replies:
                children_by_parent[reply.parent_id].append(reply)

        context = {**self.get_serializer_context(), "children_by_parent": children_by_parent}
        serializer = CommentSerializer(items, many=True, context=context)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)
