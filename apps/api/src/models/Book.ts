import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey,
  NonAttribute,
  Sequelize,
} from 'sequelize';
import type { User } from './User';
import type { Ticket } from './Ticket';

export class Book extends Model<InferAttributes<Book>, InferCreationAttributes<Book>> {
  declare id: CreationOptional<number>;
  declare book_id: string;
  declare author_user_id: ForeignKey<User['id']>;
  declare title: string;
  declare isbn: string;
  declare genre: string;
  declare publication_date: string | null;
  declare status: string;
  declare mrp: number | null;
  declare author_royalty_per_copy: number | null;
  declare total_copies_sold: CreationOptional<number>;
  declare total_royalty_earned: CreationOptional<number>;
  declare royalty_paid: CreationOptional<number>;
  declare royalty_pending: CreationOptional<number>;
  declare last_royalty_payout_date: string | null;
  declare print_partner: string | null;
  declare available_on: CreationOptional<string[]>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associated models
  declare author?: NonAttribute<User>;
  declare tickets?: NonAttribute<Ticket[]>;
}

export function initBookModel(sequelize: Sequelize): typeof Book {
  Book.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
    },
    {
      sequelize,
      tableName: 'books',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Book;
}

