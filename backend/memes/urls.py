from rest_framework.routers import DefaultRouter

from .views import ArticleViewSet, CommentViewSet, ImageViewSet

app_name = "memes"

router = DefaultRouter()
router.register("articles", ArticleViewSet, basename="article")
router.register("images", ImageViewSet, basename="image")
router.register("comments", CommentViewSet, basename="comment")

urlpatterns = router.urls
