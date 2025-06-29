"""add name to watchlist_item

Revision ID: b2d5e8f9c1a7
Revises: a43be1db52e4
Create Date: 2025-06-28 23:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2d5e8f9c1a7'
down_revision: Union[str, None] = 'a43be1db52e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add name column to watchlist_item table."""
    # Add the name column to the existing watchlist_item table
    op.add_column('watchlist_item', sa.Column('name', sa.String(), nullable=False, server_default=''))
    
    # Update existing records to use symbol as default name
    op.execute("UPDATE watchlist_item SET name = symbol WHERE name = ''")
    
    # Remove the server default now that existing records are updated
    op.alter_column('watchlist_item', 'name', server_default=None)


def downgrade() -> None:
    """Remove name column from watchlist_item table."""
    op.drop_column('watchlist_item', 'name') 