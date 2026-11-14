from backend.auth import auth_bp
from backend.locations import locations_bp
from backend.optimizer import optimizer_bp
from backend.dashboard import dashboard_bp
from backend.reports import reports_bp

__all__ = [
    'auth_bp',
    'locations_bp',
    'optimizer_bp',
    'dashboard_bp',
    'reports_bp'
]
