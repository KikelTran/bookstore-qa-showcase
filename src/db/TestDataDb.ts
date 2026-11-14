import Database from 'better-sqlite3';
import { ReferenceBook } from '../data';

export interface LedgerUser {
  userName: string;
  password: string;
  userId: string;
}

/**
 * Local SQLite database with two jobs:
 * 1. `reference_books` - expected catalog data, seeded from JSON. Tests compare API and UI against it.
 * 2. `created_users` - a ledger of every user the suite creates. Fixture teardown marks rows deleted;
 *    anything left (crash, killed run) is an orphan that `yarn cleanup` removes.
 *
 * In a real project (1) is usually the app's own DB (read-only queries) and (2) a seed/cleanup service.
 * SQLite keeps the demo self-contained. All SQL is parameterised.
 */
export class TestDataDb {
  private readonly db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    // Parallel workers share one file: WAL + busy timeout avoid "database is locked".
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.migrate();
  }

  seedReferenceBooks(books: ReferenceBook[]): void {
    const insert = this.db.prepare(
      'INSERT OR REPLACE INTO reference_books (isbn, title, author, pages) VALUES (@isbn, @title, @author, @pages)',
    );
    this.db.transaction((rows: ReferenceBook[]) => rows.forEach((row) => insert.run(row)))(books);
  }

  getReferenceBook(isbn: string): ReferenceBook | undefined {
    return this.db
      .prepare('SELECT isbn, title, author, pages FROM reference_books WHERE isbn = ?')
      .get(isbn) as ReferenceBook | undefined;
  }

  recordUser(user: LedgerUser): void {
    this.db
      .prepare(
        'INSERT INTO created_users (user_name, password, user_id) VALUES (@userName, @password, @userId)',
      )
      .run(user);
  }

  markDeleted(userName: string): void {
    this.db
      .prepare("UPDATE created_users SET deleted_at = datetime('now') WHERE user_name = ?")
      .run(userName);
  }

  listOrphans(prefix: string): LedgerUser[] {
    return this.db
      .prepare(
        `SELECT user_name AS userName, password, user_id AS userId
         FROM created_users WHERE deleted_at IS NULL AND user_name LIKE ? || '%'`,
      )
      .all(prefix) as LedgerUser[];
  }

  close(): void {
    this.db.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reference_books (
        isbn TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, pages INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS created_users (
        user_name TEXT PRIMARY KEY, password TEXT NOT NULL, user_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT
      );
    `);
  }
}
