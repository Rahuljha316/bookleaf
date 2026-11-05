import { QueryInterface, DataTypes } from 'sequelize';

export async function up({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.createTable('books', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    book_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    author_user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    isbn: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    genre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    publication_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    mrp: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    author_royalty_per_copy: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    total_copies_sold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    total_royalty_earned: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    royalty_paid: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    royalty_pending: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    last_royalty_payout_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    print_partner: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    available_on: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('books', ['author_user_id'], {
    name: 'idx_books_author_user_id',
  });
}

export async function down({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.dropTable('books');
}

