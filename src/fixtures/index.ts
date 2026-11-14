import { test as base, expect } from '@playwright/test';
import { BookStoreClient } from '../api/BookStoreClient';
import { SessionUser } from '../api/types';
import { env } from '../config/env';
import { TestDataDb } from '../db/TestDataDb';
import { BookStorePage } from '../pages/BookStorePage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { newCredentials } from '../utils/test-data';

/** Ads and trackers on demoqa slow pages and cover buttons. Not under test, so block them. */
const THIRD_PARTY = /googlesyndication|doubleclick|googletagmanager|googletagservices|adplus|amazon-adsystem/;

type TestFixtures = {
  api: BookStoreClient;
  testUser: SessionUser;
  signedInUser: SessionUser;
  loginPage: LoginPage;
  profilePage: ProfilePage;
  bookStorePage: BookStorePage;
};

type WorkerFixtures = {
  db: TestDataDb;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  db: [
    async ({}, use) => {
      const db = new TestDataDb(env.dbPath);
      await use(db);
      db.close();
    },
    { scope: 'worker' },
  ],

  api: async ({ request }, use) => {
    await use(new BookStoreClient(request));
  },

  /** A fresh user per test, created by API (fast) and always deleted in teardown, pass or fail. */
  testUser: async ({ api, db }, use) => {
    const credentials = newCredentials();
    const created = await api.createUser(credentials);
    db.recordUser({ ...credentials, userId: created.userID });
    const { token, expires } = await api.generateToken(credentials);

    await use({ ...credentials, userId: created.userID, token: token!, expires: expires! });

    // A UI login issues a new token and kills the old one, so never reuse it in teardown.
    const fresh = await api.generateToken(credentials);
    await api.deleteUser(created.userID, fresh.token!);
    db.markDeleted(credentials.userName);
  },

  /** Same user, already signed in: the app reads its session from cookies, so we set them and skip the login UI. */
  signedInUser: async ({ testUser, context }, use) => {
    const session = {
      userID: testUser.userId,
      userName: testUser.userName,
      token: testUser.token,
      expires: testUser.expires,
    };
    await context.addCookies(
      Object.entries(session).map(([name, value]) => ({ name, value, url: env.baseUrl })),
    );
    await use(testUser);
  },

  // Override the built-in context (not an auto fixture) so API-only tests never start a browser.
  context: async ({ context }, use) => {
    await context.route(THIRD_PARTY, (route) => route.abort());
    await use(context);
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  profilePage: async ({ page }, use) => use(new ProfilePage(page)),
  bookStorePage: async ({ page }, use) => use(new BookStorePage(page)),
});

export { expect };
