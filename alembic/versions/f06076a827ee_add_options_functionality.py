"""add_options_functionality

Revision ID: f06076a827ee
Revises: 5c7a8b9e4d3f
Create Date: 2025-06-27 11:47:29.499111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f06076a827ee'
down_revision: Union[str, None] = '5c7a8b9e4d3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transaction', sa.Column('is_option', sa.Boolean(), nullable=True))
    op.add_column('transaction', sa.Column('option_type', sa.String(length=4), nullable=True))
    op.add_column('transaction', sa.Column('strike_price', sa.Float(), nullable=True))
    op.add_column('transaction', sa.Column('expiration_date', sa.Date(), nullable=True))
    op.add_column('transaction', sa.Column('underlying_symbol', sa.String(length=21), nullable=True))
    op.execute('UPDATE "transaction" SET is_option = false')
    op.alter_column('transaction', 'is_option', nullable=False)

    op.alter_column('transaction', 'transaction_type',
               existing_type=postgresql.ENUM('BUY', 'SELL', name='transaction_type'),
               type_=sa.String(length=50),
               existing_nullable=False)
    
    op.alter_column('transaction', 'symbol',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.String(length=21),
               existing_nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transaction', 'underlying_symbol')
    op.drop_column('transaction', 'expiration_date')
    op.drop_column('transaction', 'strike_price')
    op.drop_column('transaction', 'option_type')
    op.drop_column('transaction', 'is_option')

    op.alter_column('transaction', 'transaction_type',
               existing_type=sa.String(length=50),
               type_=postgresql.ENUM('BUY', 'SELL', 'OPTION_BUY', 'OPTION_SELL', name='transaction_type'),
               existing_nullable=False)

    op.alter_column('transaction', 'symbol',
               existing_type=sa.String(length=21),
               type_=sa.VARCHAR(length=10),
               existing_nullable=False)
