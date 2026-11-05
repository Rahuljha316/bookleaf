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

export class TicketInternalNote extends Model<
  InferAttributes<TicketInternalNote>,
  InferCreationAttributes<TicketInternalNote>
> {
  declare id: CreationOptional<number>;
  declare ticket_id: ForeignKey<Ticket['id']>;
  declare admin_id: ForeignKey<User['id']>;
  declare note: string;
  declare created_at: CreationOptional<Date>;

  // Associated models
  declare ticket?: NonAttribute<Ticket>;
  declare admin?: NonAttribute<User>;
}

export function initTicketInternalNoteModel(sequelize: Sequelize): typeof TicketInternalNote {
  TicketInternalNote.init(
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
      admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'ticket_internal_notes',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: false, // Immutable records: no updated_at
    }
  );

  return TicketInternalNote;
}

