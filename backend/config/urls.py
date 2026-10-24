from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def health(_request):
    return JsonResponse({"status":"ok","service":"MAGNUSSIG SIG Inventory API"})

urlpatterns = [path("admin/", admin.site.urls), path("api/", include("inventario.urls")), path("accounts/", include("django.contrib.auth.urls")), path("health/", health)] + static(settings.STATIC_URL, document_root=settings.BASE_DIR / "static")
