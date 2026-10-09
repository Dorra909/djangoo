from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    detail = response.data.get("detail")
    if detail is not None:
        response.data = {"detail": str(detail), "errors": {}}
    else:
        response.data = {"detail": "Validation failed.", "errors": response.data}
    return response
