"""Drop persona_conversation and persona_message tables

Revision ID: 2ad7adf94450
Revises: 279564dc8d56
Create Date: 2025-10-21 16:44:11.688328

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '2ad7adf94450'
down_revision: Union[str, Sequence[str], None] = '279564dc8d56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Only drop our manual tables, not LangGraph's checkpoint tables
    op.drop_table('persona_messages')
    op.drop_table('persona_conversations')


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate our manual tables
    op.create_table('persona_conversations',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('experiment_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('persona_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('user_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['experiment_id'], ['experiments.id'], name='persona_conversations_experiment_id_fkey'),
    sa.ForeignKeyConstraint(['persona_id'], ['personas.id'], name='persona_conversations_persona_id_fkey'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='persona_conversations_user_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='persona_conversations_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('persona_messages',
    sa.Column('id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('conversation_id', sa.UUID(), autoincrement=False, nullable=False),
    sa.Column('role', sa.VARCHAR(length=20), autoincrement=False, nullable=False),
    sa.Column('content', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['persona_conversations.id'], name='persona_messages_conversation_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='persona_messages_pkey')
    )