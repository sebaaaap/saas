"""Add product BOM and is_raw_material

Revision ID: 9acf389999c7
Revises: 6fd3bb399ec4
Create Date: 2026-06-08 20:25:35.383677

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9acf389999c7'
down_revision: Union[str, Sequence[str], None] = '6fd3bb399ec4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_raw_material to products
    op.add_column('products', sa.Column('is_raw_material', sa.Boolean(), server_default='false', nullable=False))
    
    # Create product_bom table
    op.create_table('product_bom',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('product_id', sa.UUID(), nullable=False),
        sa.Column('component_id', sa.UUID(), nullable=False),
        sa.Column('qty_per_unit', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('component_uom', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['component_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'component_id', 'company_id', name='uix_product_component_company')
    )
    op.create_index(op.f('ix_product_bom_company_id'), 'product_bom', ['company_id'], unique=False)
    op.create_index(op.f('ix_product_bom_component_id'), 'product_bom', ['component_id'], unique=False)
    op.create_index(op.f('ix_product_bom_id'), 'product_bom', ['id'], unique=False)
    op.create_index(op.f('ix_product_bom_product_id'), 'product_bom', ['product_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop product_bom table and indexes
    op.drop_index(op.f('ix_product_bom_product_id'), table_name='product_bom')
    op.drop_index(op.f('ix_product_bom_id'), table_name='product_bom')
    op.drop_index(op.f('ix_product_bom_component_id'), table_name='product_bom')
    op.drop_index(op.f('ix_product_bom_company_id'), table_name='product_bom')
    op.drop_table('product_bom')
    
    # Drop is_raw_material from products
    op.drop_column('products', 'is_raw_material')
