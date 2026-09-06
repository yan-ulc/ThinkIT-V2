from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, QuizViewSet

router = DefaultRouter()
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]

