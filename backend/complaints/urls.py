from rest_framework.routers import DefaultRouter

from complaints.views import ComplaintViewSet


router = DefaultRouter()
router.register("", ComplaintViewSet, basename="complaint")

urlpatterns = router.urls
