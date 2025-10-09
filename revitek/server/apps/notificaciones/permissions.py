from rest_framework.permissions import BasePermission

class IsAdminToken(BasePermission):
    """
    Allows access only to users authenticated as admin via OAuth2.0 token.
    """
    def has_permission(self, request, view):
        # Example: check for admin role in token (customize for your OAuth2 provider)
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        # If using OAuth2, check for 'admin' scope/role in token
        if hasattr(user, 'is_admin') and user.is_admin:
            return True
        # Or check for 'admin' in user.groups or user.role
        return False
