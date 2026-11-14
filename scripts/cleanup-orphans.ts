import { request } from '@playwright/test';
import { BookStoreClient } from '../src/api/BookStoreClient';
import { env } from '../src/config/env';
import { TestDataDb } from '../src/db/TestDataDb';

/** Deletes users left behind by crashed or killed runs. Only touches ledger rows with our prefix. */
async function main(): Promise<void> {
  const db = new TestDataDb(env.dbPath);
  const context = await request.newContext({ baseURL: env.baseUrl });
  const api = new BookStoreClient(context);
  const orphans = db.listOrphans(env.dataPrefix);
  console.log(`Found ${orphans.length} orphan user(s)`);

  for (const user of orphans) {
    try {
      const { token } = await api.generateToken(user);
      await api.deleteUser(user.userId, token!);
      db.markDeleted(user.userName);
      console.log(`deleted ${user.userName}`);
    } catch (error) {
      // Keep going: one bad row must not block the rest. The row stays for the next run.
      console.error(`failed ${user.userName}: ${(error as Error).message.split('\n')[0]}`);
    }
  }

  await context.dispose();
  db.close();
}

main();
