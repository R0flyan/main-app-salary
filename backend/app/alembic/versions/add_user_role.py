from alembic import op
import sqlalchemy as sa

def upgrade():
    # Добавляем поле role с типом ENUM
    op.add_column('users', sa.Column('role', sa.Enum('guest', 'user', 'admin', name='userrole'), 
                                     server_default='user', nullable=False))

def downgrade():
    op.drop_column('users', 'role')
    op.execute('DROP TYPE userrole')