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

export class TicketMessage extends Model<
  InferAttributes<TicketMessage>,
  InferCreationAttributes<TicketMessage>
> {
  declare id: CreationOptional<number>;
  declare ticket_id: ForeignKey<Ticket['id']>;
  declare sender_id: ForeignKey<User['id']>;
  declare message: string;
  declare is_ai_assisted: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;

  // Associated models
  declare ticket?: NonAttribute<Ticket>;
  declare sender?: NonAttribute<User>;
}

export function initTicketMessageModel(sequelize: Sequelize): typeof TicketMessage {
  TicketMessage.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ticket_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'tickets',
          key: 'id',
        },
      },
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_ai_assisted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'ticket_messages',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false, // Immutable records: no updated_at
    }
  );

  return TicketMessage;
}

