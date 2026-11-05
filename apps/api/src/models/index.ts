import { Sequelize } from 'sequelize';
import { sequelize as defaultSequelize } from '../config/database';
import { User, initUserModel } from './User';
import { Book, initBookModel } from './Book';
import { Ticket, initTicketModel } from './Ticket';
import { TicketMessage, initTicketMessageModel } from './TicketMessage';
import { TicketInternalNote, initTicketInternalNoteModel } from './TicketInternalNote';

export interface DatabaseModels {
  User: typeof User;
  Book: typeof Book;
  Ticket: typeof Ticket;
  TicketMessage: typeof TicketMessage;
  TicketInternalNote: typeof TicketInternalNote;
  sequelize: Sequelize;
}

let initialized = false;

export function initModels(seq: Sequelize = defaultSequelize): DatabaseModels {
  if (initialized && seq === defaultSequelize) {
    return {
      User,
      Book,
      Ticket,
      TicketMessage,
      TicketInternalNote,
      sequelize: seq,
    };
  }

  // 1. Initialize models
  initUserModel(seq);
  initBookModel(seq);
  initTicketModel(seq);
  initTicketMessageModel(seq);
  initTicketInternalNoteModel(seq);

  // 2. Define associations with explicit foreign keys and aliases

  // User <-> Book
  User.hasMany(Book, {
    foreignKey: 'author_user_id',
    as: 'books',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  Book.belongsTo(User, {
    foreignKey: 'author_user_id',
    as: 'author',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User (Author) <-> Ticket
  User.hasMany(Ticket, {
    foreignKey: 'author_user_id',
    as: 'raisedTickets',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  Ticket.belongsTo(User, {
    foreignKey: 'author_user_id',
    as: 'author',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // User (Assigned Admin) <-> Ticket
  User.hasMany(Ticket, {
    foreignKey: 'assigned_to',
    as: 'assignedTickets',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  Ticket.belongsTo(User, {
    foreignKey: 'assigned_to',
    as: 'assignedAdmin',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  // Book <-> Ticket
  Book.hasMany(Ticket, {
    foreignKey: 'book_id',
    as: 'tickets',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });
  Ticket.belongsTo(Book, {
    foreignKey: 'book_id',
    as: 'book',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
  });

  // Ticket <-> TicketMessage
  Ticket.hasMany(TicketMessage, {
    foreignKey: 'ticket_id',
    as: 'messages',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  TicketMessage.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'ticket',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // Ticket <-> TicketInternalNote
  Ticket.hasMany(TicketInternalNote, {
    foreignKey: 'ticket_id',
    as: 'internalNotes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  TicketInternalNote.belongsTo(Ticket, {
    foreignKey: 'ticket_id',
    as: 'ticket',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // TicketMessage <-> User (sender)
  TicketMessage.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'sender',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  User.hasMany(TicketMessage, {
    foreignKey: 'sender_id',
    as: 'sentMessages',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  // TicketInternalNote <-> User (admin)
  TicketInternalNote.belongsTo(User, {
    foreignKey: 'admin_id',
    as: 'admin',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });
  User.hasMany(TicketInternalNote, {
    foreignKey: 'admin_id',
    as: 'internalNotes',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  });

  initialized = true;

  return {
    User,
    Book,
    Ticket,
    TicketMessage,
    TicketInternalNote,
    sequelize: seq,
  };
}

// Automatically initialize with default sequelize instance
initModels(defaultSequelize);

export { User, Book, Ticket, TicketMessage, TicketInternalNote };
export default initModels;

