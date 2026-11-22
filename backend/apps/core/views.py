import os
import time
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
import redis

class HealthCheckView(APIView):
    """
    Production health check endpoint verifying database, cache/broker,
    and system status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_data = {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {}
        }
        all_ok = True

        # Database Check
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health_data["services"]["database"] = {
                "status": "up",
                "vendor": connection.vendor
            }
        except Exception as e:
            all_ok = False
            health_data["services"]["database"] = {
                "status": "down",
                "error": str(e)
            }

        # Redis Check
        redis_url = os.getenv('REDIS_URL')
        if redis_url:
            try:
                r = redis.from_url(redis_url, socket_timeout=2)
                r.ping()
                health_data["services"]["redis"] = {"status": "up"}
            except Exception as e:
                health_data["services"]["redis"] = {
                    "status": "warning",
                    "error": str(e)
                }
        else:
            health_data["services"]["redis"] = {
                "status": "optional",
                "mode": "in-process/eager"
            }

        health_data["status"] = "healthy" if all_ok else "degraded"
        status_code = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_data, status=status_code)
