import { env } from './config/env';
import { data } from './data';
import { TestDataDb } from './db/TestDataDb';

/** Runs once before all workers: load JSON reference data into the DB the tests read from. */
export default function globalSetup(): void {
  const db = new TestDataDb(env.dbPath);
  db.seedReferenceBooks(data.referenceBooks);
  db.close();
}
