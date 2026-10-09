from django.urls import path

from progress.views import MyProgressView


urlpatterns = [
    path("mine/", MyProgressView.as_view(), name="my-progress"),
]
