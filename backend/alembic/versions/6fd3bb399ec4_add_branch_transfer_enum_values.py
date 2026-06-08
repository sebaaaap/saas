"""add_branch_transfer_enum_values

Revision ID: 6fd3bb399ec4
Revises: 5c26c0a6761b
Create Date: 2026-06-08 17:27:51.827881

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fd3bb399ec4'
down_revision: Union[str, Sequence[str], None] = '5c26c0a6761b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        # Add new enum values if they do not exist
        op.execute("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'BRANCH_TRANSFER_OUT'")
        op.execute("ALTER TYPE movementtype ADD VALUE IF NOT EXISTS 'BRANCH_TRANSFER_IN'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
