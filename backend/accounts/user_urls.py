from rest_framework.routers import DefaultRouter

from accounts.views import AdminUserViewSet


router = DefaultRouter()
router.register("", AdminUserViewSet, basename="user")

urlpatterns = router.urls
