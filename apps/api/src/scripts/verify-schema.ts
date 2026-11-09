import fs from 'fs';
import path from 'path';
import { User, Book, Ticket, TicketMessage, TicketInternalNote, initModels } from '../models';
import { sequelize } from '../config/database';

function findSampleDataPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'FULLSTACK-SAMPLEDATA (1) (1) (1).json'),
    path.resolve(__dirname, '../../../../FULLSTACK-SAMPLEDATA (1) (1) (1).json'),
    path.resolve(__dirname, '../../../FULLSTACK-SAMPLEDATA (1) (1) (1).json'),
    path.resolve(__dirname, '../../FULLSTACK-SAMPLEDATA (1) (1) (1).json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Sample data file not found in candidates: ${candidates.join(', ')}`);
}

function verifySchema(): void {
  console.log('=== BookLeaf Database Layer Verification ===\n');

  // 1. Verify Model Initialization & Attributes
  initModels(sequelize);

  const models = [
    { name: 'User', model: User, expectedTable: 'users' },
    { name: 'Book', model: Book, expectedTable: 'books' },
    { name: 'Ticket', model: Ticket, expectedTable: 'tickets' },
    { name: 'TicketMessage', model: TicketMessage, expectedTable: 'ticket_messages' },
    { name: 'TicketInternalNote', model: TicketInternalNote, expectedTable: 'ticket_internal_notes' },
  ];

  console.log('1. Checking Models and Tables:');
  for (const m of models) {
    const tableName = m.model.getTableName();
    const isMatch = tableName === m.expectedTable;
    console.log(`  ${isMatch ? '✓' : '✗'} Model ${m.name} -> Table "${tableName}"`);
    if (!isMatch) throw new Error(`Table mismatch for ${m.name}`);
  }

  // 2. Verify Association Aliases
  console.log('\n2. Checking Association Aliases:');
  const associations = [
    { source: 'User', alias: 'books', target: 'Book' },
    { source: 'Book', alias: 'author', target: 'User' },
    { source: 'User', alias: 'raisedTickets', target: 'Ticket' },
    { source: 'User', alias: 'assignedTickets', target: 'Ticket' },
    { source: 'Ticket', alias: 'author', target: 'User' },
    { source: 'Ticket', alias: 'assignedAdmin', target: 'User' },
    { source: 'Book', alias: 'tickets', target: 'Ticket' },
    { source: 'Ticket', alias: 'book', target: 'Book' },
    { source: 'Ticket', alias: 'messages', target: 'TicketMessage' },
    { source: 'TicketMessage', alias: 'ticket', target: 'Ticket' },
    { source: 'Ticket', alias: 'internalNotes', target: 'TicketInternalNote' },
    { source: 'TicketInternalNote', alias: 'ticket', target: 'Ticket' },
    { source: 'TicketMessage', alias: 'sender', target: 'User' },
    { source: 'User', alias: 'sentMessages', target: 'TicketMessage' },
    { source: 'TicketInternalNote', alias: 'admin', target: 'User' },
    { source: 'User', alias: 'internalNotes', target: 'TicketInternalNote' },
  ];

  for (const assoc of associations) {
    const model = (
      assoc.source === 'User' ? User :
      assoc.source === 'Book' ? Book :
      assoc.source === 'Ticket' ? Ticket :
      assoc.source === 'TicketMessage' ? TicketMessage :
      TicketInternalNote
    ) as any;

    const exists = assoc.alias in model.associations;
    const target = exists ? model.associations[assoc.alias].target.name : null;
    const isTargetMatch = target === assoc.target;
    console.log(`  ${exists && isTargetMatch ? '✓' : '✗'} ${assoc.source}.${assoc.alias} -> ${target} (Expected: ${assoc.target})`);
    if (!exists || !isTargetMatch) {
      throw new Error(`Association mismatch for ${assoc.source}.${assoc.alias}`);
    }
  }

  // 3. Verify Sample JSON data integrity
  console.log('\n3. Checking Sample Dataset Integrity:');
  const sampleDataPath = findSampleDataPath();
  const raw = fs.readFileSync(sampleDataPath, 'utf-8');
  const parsed = JSON.parse(raw);

  const authorCount = parsed.authors.length;
  const allBooks = parsed.authors.flatMap((a: any) => a.books);
  const bookCount = allBooks.length;
  const uniqueIsbns = new Set(allBooks.map((b: any) => b.isbn)).size;
  const uniqueBookIds = new Set(allBooks.map((b: any) => b.book_id)).size;
  const uniqueAuthorIds = new Set(parsed.authors.map((a: any) => a.author_id)).size;
  const uniqueEmails = new Set(parsed.authors.map((a: any) => a.email)).size;

  console.log(`  ✓ Authors count: ${authorCount} (Expected: 10)`);
  console.log(`  ✓ Unique Author IDs: ${uniqueAuthorIds}`);
  console.log(`  ✓ Unique Author Emails: ${uniqueEmails}`);
  console.log(`  ✓ Books count: ${bookCount} (Expected: 18)`);
  console.log(`  ✓ Unique Book IDs: ${uniqueBookIds}`);
  console.log(`  ✓ Unique ISBNs: ${uniqueIsbns} (Expected: 18)`);

  if (authorCount !== 10 || bookCount !== 18 || uniqueIsbns !== 18) {
    throw new Error('Dataset validation failed');
  }

  // 4. Verify Migration Files
  console.log('\n4. Checking Migration Files:');
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));
  console.log(`  ✓ Discovered ${migrationFiles.length} migration files:`);
  migrationFiles.forEach(f => console.log(`    - ${f}`));

  if (migrationFiles.length !== 5) {
    throw new Error(`Expected 5 migration files, found ${migrationFiles.length}`);
  }

  console.log('\n=== All Schema & Model Integrity Checks Passed! ===');
}

verifySchema();
