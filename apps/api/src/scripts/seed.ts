import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { sequelize } from '../config/database';
import { User, Book, initModels } from '../models';

interface RawBook {
  book_id: string;
  title: string;
  isbn: string;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

interface RawAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: RawBook[];
}

interface RawDataset {
  authors: RawAuthor[];
}

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

  throw new Error(
    `Sample data JSON file "FULLSTACK-SAMPLEDATA (1) (1) (1).json" not found in search paths:\n${candidates.join('\n')}`
  );
}

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Connecting to database...');
  try {
    await sequelize.authenticate();
    console.log('[Seed] Database connection established successfully.');
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Seed] Connection error:', error.message);
    process.exit(1);
  }

  // Ensure models and associations are initialized
  initModels(sequelize);

  const sampleDataPath = findSampleDataPath();
  console.log(`[Seed] Reading sample dataset from: ${sampleDataPath}`);
  const rawContent = fs.readFileSync(sampleDataPath, 'utf-8');
  const dataset: RawDataset = JSON.parse(rawContent);

  const transaction = await sequelize.transaction();

  try {
    // 1. Seed or update Initial Admin User
    console.log(`[Seed] Processing admin account (${env.ADMIN_EMAIL})...`);
    let adminUser = await User.findOne({
      where: { email: env.ADMIN_EMAIL },
      transaction,
    });

    if (!adminUser) {
      const adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
      adminUser = await User.create(
        {
          author_id: null,
          role: 'admin',
          name: env.ADMIN_NAME,
          email: env.ADMIN_EMAIL,
          password_hash: adminPasswordHash,
          phone: null,
          city: null,
          joined_date: null,
        },
        { transaction }
      );
      console.log(`  ✓ Created default admin user: ${adminUser.email}`);
    } else {
      console.log(`  ✓ Admin user already exists: ${adminUser.email}`);
    }

    // 2. Hash default author password (author123)
    const authorPasswordHash = await bcrypt.hash('author123', 10);

    let authorsCreated = 0;
    let authorsUpdated = 0;
    let booksCreated = 0;
    let booksUpdated = 0;

    // 3. Seed Authors and Books
    for (const rawAuthor of dataset.authors) {
      let authorUser = await User.findOne({
        where: { email: rawAuthor.email },
        transaction,
      });

      if (!authorUser) {
        authorUser = await User.create(
          {
            author_id: rawAuthor.author_id,
            role: 'author',
            name: rawAuthor.name,
            email: rawAuthor.email,
            password_hash: authorPasswordHash,
            phone: rawAuthor.phone,
            city: rawAuthor.city,
            joined_date: rawAuthor.joined_date,
          },
          { transaction }
        );
        authorsCreated++;
      } else {
        await authorUser.update(
          {
            author_id: rawAuthor.author_id,
            role: 'author',
            name: rawAuthor.name,
            phone: rawAuthor.phone,
            city: rawAuthor.city,
            joined_date: rawAuthor.joined_date,
          },
          { transaction }
        );
        authorsUpdated++;
      }

      // Seed each book for this author
      for (const rawBook of rawAuthor.books) {
        let bookRecord = await Book.findOne({
          where: { isbn: rawBook.isbn },
          transaction,
        });

        const bookPayload = {
          book_id: rawBook.book_id,
          author_user_id: authorUser.id,
          title: rawBook.title,
          isbn: rawBook.isbn,
          genre: rawBook.genre,
          publication_date: rawBook.publication_date,
          status: rawBook.status,
          mrp: rawBook.mrp,
          author_royalty_per_copy: rawBook.author_royalty_per_copy,
          total_copies_sold: rawBook.total_copies_sold,
          total_royalty_earned: rawBook.total_royalty_earned,
          royalty_paid: rawBook.royalty_paid,
          royalty_pending: rawBook.royalty_pending,
          last_royalty_payout_date: rawBook.last_royalty_payout_date,
          print_partner: rawBook.print_partner,
          available_on: rawBook.available_on ?? [],
        };

        if (!bookRecord) {
          bookRecord = await Book.create(bookPayload, { transaction });
          booksCreated++;
        } else {
          await bookRecord.update(bookPayload, { transaction });
          booksUpdated++;
        }
      }
    }

    await transaction.commit();

    console.log('[Seed] Seeding completed successfully.');
    console.log(`  - Authors: ${authorsCreated} created, ${authorsUpdated} updated (Total: ${dataset.authors.length})`);
    console.log(`  - Books: ${booksCreated} created, ${booksUpdated} updated (Total: 18)`);

    // Verify final counts
    const totalAdmins = await User.count({ where: { role: 'admin' } });
    const totalAuthors = await User.count({ where: { role: 'author' } });
    const totalBooks = await Book.count();

    console.log('\n[Verification Summary]');
    console.log(`  - Total Admin Users: ${totalAdmins}`);
    console.log(`  - Total Authors: ${totalAuthors} (Expected: 10)`);
    console.log(`  - Total Books: ${totalBooks} (Expected: 18)`);
  } catch (err: unknown) {
    await transaction.rollback();
    const error = err as Error;
    console.error('[Seed] Seeding failed with error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  void seedDatabase();
}

