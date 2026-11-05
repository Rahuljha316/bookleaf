import { QueryInterface, DataTypes } from 'sequelize';

export async function up({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.createTable('users', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    author_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'author',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    joined_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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

  await queryInterface.sequelize.query(`
    ALTER TABLE users
    ADD CONSTRAINT check_users_role
    CHECK (role IN ('author', 'admin'));
  `);
}

export async function down({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.dropTable('users');
}

