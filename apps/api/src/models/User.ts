import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
  Sequelize,
} from 'sequelize';
import type { UserRole } from '@bookleaf/shared';
import type { Book } from './Book';
import type { Ticket } from './Ticket';
import type { TicketMessage } from './TicketMessage';
import type { TicketInternalNote } from './TicketInternalNote';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare author_id: string | null;
  declare role: UserRole;
  declare name: string;
  declare email: string;
  declare password_hash: string;
  declare phone: string | null;
  declare city: string | null;
  declare joined_date: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associated models
  declare books?: NonAttribute<Book[]>;
  declare raisedTickets?: NonAttribute<Ticket[]>;
  declare assignedTickets?: NonAttribute<Ticket[]>;
  declare sentMessages?: NonAttribute<TicketMessage[]>;
  declare internalNotes?: NonAttribute<TicketInternalNote[]>;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
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
        validate: {
          isIn: [['author', 'admin']],
        },
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
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
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return User;
}

