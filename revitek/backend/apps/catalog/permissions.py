from rest_framework import permissions

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    La solicitud está autenticada como un usuario, o es una solicitud de solo lectura.
    """
    def has_permission(self, request, view):
        return (
            request.method in permissions.SAFE_METHODS or
            (request.user and request.user.is_staff)
        )
