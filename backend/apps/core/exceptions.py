import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Standardize all API error responses to:
    {
        "success": False,
        "error": {
            "message": str,
            "status_code": int,
            "details": dict/list/str
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_details = response.data
        if isinstance(error_details, dict):
            # Extract first human-readable message if present
            if 'detail' in error_details:
                message = str(error_details['detail'])
            elif 'non_field_errors' in error_details:
                message = error_details['non_field_errors'][0]
            else:
                message = "Validation or processing error."
        elif isinstance(error_details, list):
            message = str(error_details[0])
        else:
            message = str(error_details)

        response.data = {
            "success": False,
            "error": {
                "message": message,
                "status_code": response.status_code,
                "details": error_details
            }
        }
    else:
        logger.exception("Unhandled server exception: %s", exc)
        response = Response(
            {
                "success": False,
                "error": {
                    "message": "Internal server error occurred.",
                    "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                    "details": str(exc)
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
