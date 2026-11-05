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
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  AI_CLASSIFICATION_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type AIClassificationStatus,
} from '@bookleaf/shared';
import type { User } from './User';
import type { Book } from './Book';
import type { TicketMessage } from './TicketMessage';
import type { TicketInternalNote } from './TicketInternalNote';

export class Ticket extends Model<InferAttributes<Ticket>, InferCreationAttributes<Ticket>> {
  declare id: CreationOptional<number>;
  declare ticket_number: string;
  declare author_user_id: ForeignKey<User['id']>;
  declare book_id: ForeignKey<Book['id']> | null;
  declare assigned_to: ForeignKey<User['id']> | null;
  declare subject: string;
  declare description: string;
  declare category: CreationOptional<TicketCategory>;
  declare priority: CreationOptional<TicketPriority>;
  declare status: CreationOptional<TicketStatus>;
  declare ai_suggested_category: string | null;
  declare ai_suggested_priority: string | null;
  declare ai_classification_status: CreationOptional<AIClassificationStatus>;
  declare ai_suggested_reply: string | null;
  declare ai_reply_edited_draft: string | null;
  declare ai_draft_generated_at: Date | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;

  // Associated models
  declare author?: NonAttribute<User>;
  declare assignedAdmin?: NonAttribute<User | null>;
  declare book?: NonAttribute<Book | null>;
  declare messages?: NonAttribute<TicketMessage[]>;
  declare internalNotes?: NonAttribute<TicketInternalNote[]>;
}

export function initTicketModel(sequelize: Sequelize): typeof Ticket {
  Ticket.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ticket_number: {
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
      book_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'books',
          key: 'id',
        },
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      subject: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'General Inquiry',
        validate: {
          isIn: [TICKET_CATEGORIES as unknown as string[]],
        },
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Medium',
        validate: {
          isIn: [TICKET_PRIORITIES as unknown as string[]],
        },
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Open',
        validate: {
          isIn: [TICKET_STATUSES as unknown as string[]],
        },
      },
      ai_suggested_category: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      ai_suggested_priority: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      ai_classification_status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [AI_CLASSIFICATION_STATUSES as unknown as string[]],
        },
      },
      ai_suggested_reply: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_reply_edited_draft: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      ai_draft_generated_at: {
        type: DataTypes.DATE,
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
      tableName: 'tickets',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Ticket;
}

