import { QueryInterface, DataTypes } from 'sequelize';

export async function up({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.createTable('tickets', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
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
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    book_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'books',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
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
    },
    priority: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'Medium',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'Open',
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
  });

  // Indexes for common queries and filters
  await queryInterface.addIndex('tickets', ['author_user_id'], {
    name: 'idx_tickets_author_user_id',
  });
  await queryInterface.addIndex('tickets', ['assigned_to'], {
    name: 'idx_tickets_assigned_to',
  });
  await queryInterface.addIndex('tickets', ['status'], {
    name: 'idx_tickets_status',
  });
  await queryInterface.addIndex('tickets', ['priority'], {
    name: 'idx_tickets_priority',
  });
  await queryInterface.addIndex('tickets', ['created_at'], {
    name: 'idx_tickets_created_at',
  });

  // CHECK constraints based on requirements
  await queryInterface.sequelize.query(`
    ALTER TABLE tickets
    ADD CONSTRAINT check_tickets_status
    CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed'));
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets
    ADD CONSTRAINT check_tickets_priority
    CHECK (priority IN ('Critical', 'High', 'Medium', 'Low'));
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets
    ADD CONSTRAINT check_tickets_category
    CHECK (category IN (
      'Royalty & Payments',
      'ISBN & Metadata Issues',
      'Printing & Quality',
      'Distribution & Availability',
      'Book Status & Production Updates',
      'General Inquiry'
    ));
  `);

  await queryInterface.sequelize.query(`
    ALTER TABLE tickets
    ADD CONSTRAINT check_tickets_ai_classification_status
    CHECK (ai_classification_status IN ('pending', 'success', 'failed', 'manual_override'));
  `);
}

export async function down({ context: queryInterface }: { context: QueryInterface }): Promise<void> {
  await queryInterface.dropTable('tickets');
}

