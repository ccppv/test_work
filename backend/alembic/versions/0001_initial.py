"""initial

Revision ID: 0001
Revises:
Create Date: 2026-05-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "metric_entries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("month", sa.String(20), nullable=False),
        sa.Column("month_order", sa.SmallInteger(), nullable=False),
        sa.Column("revenue", sa.Numeric(15, 2), nullable=False),
        sa.Column("new_clients", sa.Integer(), nullable=False),
        sa.Column("ltv", sa.Numeric(10, 2), nullable=False),
        sa.Column("churn", sa.Numeric(5, 2), nullable=False),
        sa.Column("margin", sa.Numeric(5, 2), nullable=False),
        sa.Column("cac", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_metric_entries_month_order", "metric_entries", ["month_order"])

    op.create_table(
        "insight_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False),
        sa.Column("model_name", sa.String(50), nullable=False),
        sa.Column("period_start", sa.SmallInteger(), nullable=False),
        sa.Column("period_end", sa.SmallInteger(), nullable=False),
        sa.Column("months_count", sa.SmallInteger(), nullable=False),
        sa.Column("response_text", sa.Text(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_insight_logs_provider", "insight_logs", ["provider"])
    op.create_index("ix_insight_logs_created_at", "insight_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_insight_logs_created_at", "insight_logs")
    op.drop_index("ix_insight_logs_provider", "insight_logs")
    op.drop_table("insight_logs")
    op.drop_index("ix_metric_entries_month_order", "metric_entries")
    op.drop_table("metric_entries")
