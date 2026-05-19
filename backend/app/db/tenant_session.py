"""
TenantSession: A thin wrapper around SQLAlchemy Session that enforces
multi-tenant isolation by automatically injecting company_id filters
on every query and auto-stamping new objects on insert.

Usage in endpoints:
    def my_endpoint(
        db: TenantSession = Depends(get_tenant_session),
        current_user: User = Depends(get_current_user)
    ):
        # This will ONLY return records for current_user's company:
        products = db.tenant_query(Product).all()
        
        # This will AUTO-set company_id on the new object:
        new_product = Product(name="test")
        db.tenant_add(new_product)
        db.commit()
"""

from uuid import UUID
from typing import Optional, Type, TypeVar
from sqlalchemy.orm import Session
from app.models.base import TenantModel

T = TypeVar("T", bound=TenantModel)


class TenantSession:
    """
    Wraps a SQLAlchemy Session and enforces company_id isolation.
    All reads are filtered, all writes are stamped with company_id.
    """

    def __init__(self, db: Session, company_id: Optional[UUID]):
        self._db = db
        self.company_id = company_id

    # ─── Passthrough for standard Session methods ───────────────────────────

    def commit(self):
        return self._db.commit()

    def rollback(self):
        return self._db.rollback()

    def close(self):
        return self._db.close()

    def refresh(self, instance):
        return self._db.refresh(instance)

    def flush(self):
        return self._db.flush()

    def begin_nested(self):
        return self._db.begin_nested()

    def add_all(self, instances):
        return self._db.add_all(instances)

    def delete(self, instance):
        return self._db.delete(instance)

    def execute(self, *args, **kwargs):
        return self._db.execute(*args, **kwargs)

    def scalar(self, *args, **kwargs):
        return self._db.scalar(*args, **kwargs)

    # ─── Raw access (for queries that don't need tenant filter) ─────────────

    def query(self, *args, **kwargs):
        """Raw query — NO tenant filter. Use only for auth/superadmin queries."""
        return self._db.query(*args, **kwargs)

    # ─── Tenant-aware methods ────────────────────────────────────────────────

    def tenant_query(self, model):
        """
        Returns a query filtered by the current tenant's company_id.
        Use this instead of db.query() for all business data.
        """
        q = self._db.query(model)
        
        # Get the actual model class (handles both Product and Product.id)
        model_class = model if isinstance(model, type) else getattr(model, "class_", None)
        
        if self.company_id is not None and model_class and issubclass(model_class, TenantModel):
            q = q.filter(model_class.company_id == self.company_id)
        return q

    def tenant_add(self, instance: TenantModel):
        """
        Adds a new TenantModel instance to the session,
        automatically stamping it with the current company_id.
        """
        if self.company_id is not None and isinstance(instance, TenantModel):
            if not getattr(instance, "company_id", None):
                instance.company_id = self.company_id
        self._db.add(instance)

    def add(self, instance):
        """Alias for tenant_add — use when replacing db.add() calls."""
        if isinstance(instance, TenantModel):
            return self.tenant_add(instance)
        return self._db.add(instance)
