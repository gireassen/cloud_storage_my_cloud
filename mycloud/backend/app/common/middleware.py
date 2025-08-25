class NoStoreForAuth:
    def __init__(self, get_response): self.get_response = get_response
    def __call__(self, request):
        resp = self.get_response(request)
        if request.path.startswith("/api/"):
            resp["Vary"] = (resp.get("Vary", "") + ", Authorization, Cookie").strip(", ")
            if getattr(request, "user", None) and request.user.is_authenticated:
                resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
                resp["Pragma"] = "no-cache"
        return resp
