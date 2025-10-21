"""remove_persona_conversation_tables

Revision ID: 59860e833eb7
Revises: e59d1ac7d912
Create Date: 2025-10-21 11:56:02.047218

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '59860e833eb7'
down_revision: Union[str, Sequence[str], None] = 'e59d1ac7d912'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop persona_messages table first (due to foreign key constraint)
    op.drop_table('persona_messages')
    
    # Drop persona_conversations table
    op.drop_table('persona_conversations')


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate persona_conversations table
    op.create_table('persona_conversations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('experiment_id', sa.UUID(), nullable=False),
        sa.Column('persona_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], ),
        sa.ForeignKeyConstraint(['persona_id'], ['personas.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Recreate persona_messages table
    op.create_table('persona_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['conversation_id'], ['persona_conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
