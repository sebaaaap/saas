"""add document_type and comment

Revision ID: 7ee96eb47c1d
Revises: b6141b3e5b45
Create Date: 2026-03-15 10:00:00.354393

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ee96eb47c1d'
down_revision: Union[str, Sequence[str], None] = 'b6141b3e5b45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Agregar columnas de tipo de documento y comentario en tickets (POS)
    op.add_column('tickets', sa.Column('document_type', sa.String(), nullable=True))
    op.add_column('tickets', sa.Column('comment', sa.Text(), nullable=True))

    # Agregar columna service_info a quotes si no existe (para BDD nuevas)
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='quotes' AND column_name='service_info'"
    ))
    if not result.fetchone():
        op.add_column('quotes', sa.Column('service_info', sa.JSON(), nullable=True))

    # Agregar columna service_info a vehicles si no existe
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='vehicles' AND column_name='service_info'"
    ))
    if not result.fetchone():
        op.add_column('vehicles', sa.Column('service_info', sa.JSON(), nullable=True))

    # Agregar columna service_info a work_orders si no existe
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='work_orders' AND column_name='service_info'"
    ))
    if not result.fetchone():
        op.add_column('work_orders', sa.Column('service_info', sa.JSON(), nullable=True))

    # Asegurar is_paid en work_order_items
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='work_order_items' AND column_name='is_paid'"
    ))
    if not result.fetchone():
        op.add_column('work_order_items', sa.Column('is_paid', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tickets', 'comment')
    op.drop_column('tickets', 'document_type')
