import { test } from '../../src/fixtures';
import { data } from '../../src/data';

test.describe('Login', { tag: '@ui' }, () => {
  test('valid user lands on profile', { tag: '@smoke' }, async ({ testUser, loginPage, profilePage }) => {
    await loginPage.open();

    await loginPage.login(testUser);

    await profilePage.expectSignedInAs(testUser.userName);
  });

  for (const row of data.loginNegative) {
    test(`shows error for ${row.case}`, async ({ testUser, loginPage }) => {
      // JSON placeholders keep the data file static while the user is created fresh per run.
      const userName = row.userName.replace('{{existingUser}}', testUser.userName);
      await loginPage.open();

      await loginPage.login({ userName, password: row.password });

      await loginPage.expectError(row.error);
    });
  }
});
