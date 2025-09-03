from rest_framework.views import exception_handler as drf_exception_handler

def exception_handler(exc, context):
    resp = drf_exception_handler(exc, context)
    if resp is None:
        return resp
    if isinstance(resp.data, list):
        resp.data = {"detail": resp.data}
    elif isinstance(resp.data, dict) and "detail" not in resp.data:
        resp.data = {"detail": resp.data}
    return resp