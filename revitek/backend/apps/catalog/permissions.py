from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    The request is authenticated as a user, or is a read-only request.
    """
    def has_permission(self, request, view):
        return (
            request.method in permissions.SAFE_METHODS or
            (request.user and request.user.is_staff)
        )
