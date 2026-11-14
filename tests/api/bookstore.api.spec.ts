import { test, expect } from '../../src/fixtures';
import { data } from '../../src/data';
import { newCredentials } from '../../src/utils/test-data';

test.describe('Book Store API', { tag: '@api' }, () => {
  test('catalog matches reference data stored in DB', { tag: '@smoke' }, async ({ api, db }) => {
    const books = await api.getBooks();

    for (const { isbn } of data.referenceBooks) {
      const expected = db.getReferenceBook(isbn);
      const actual = books.find((book) => book.isbn === isbn);
      expect(actual, `book ${isbn} in catalog`).toBeDefined();
      expect(actual).toMatchObject({
        title: expected!.title,
        author: expected!.author,
        pages: expected!.pages,
      });
    }
  });

  test('create user returns 201 and an empty collection', { tag: '@smoke' }, async ({ api, db }) => {
    const credentials = newCredentials();

    const response = await api.rawCreateUser(credentials);
    const body = await response.json();
    // Record before asserting so the user is cleaned up even if an assertion fails.
    db.recordUser({ ...credentials, userId: body.userID });

    expect(response.status()).toBe(201);
    expect(body).toEqual({ userID: expect.any(String), username: credentials.userName, books: [] });

    const { token } = await api.generateToken(credentials);
    await api.deleteUser(body.userID, token!);
    db.markDeleted(credentials.userName);
  });

  test('duplicate user name is rejected with 406', async ({ api, testUser }) => {
    const response = await api.rawCreateUser({ userName: testUser.userName, password: testUser.password });

    expect(response.status()).toBe(406);
    expect(await response.json()).toEqual({ code: '1204', message: 'User exists!' });
  });

  for (const { case: name, password } of data.passwordRules) {
    test(`weak password is rejected: ${name}`, async ({ api }) => {
      const response = await api.rawCreateUser({ ...newCredentials(), password });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ code: '1300' });
    });
  }

  test('wrong password gets no token (200 + status Failed)', async ({ api, testUser }) => {
    // Quirk worth knowing: this API returns 200 on failed auth, so a status-only check would pass.
    const response = await api.rawGenerateToken({ userName: testUser.userName, password: 'Wrong@1234' });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ token: null, status: 'Failed' });
  });

  test('add books without token is 401', async ({ api, testUser }) => {
    const response = await api.rawAddBooks(testUser.userId, '', [data.referenceBooks[0].isbn]);

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({ code: '1200' });
  });

  test('unknown ISBN is rejected with 400', async ({ api, testUser }) => {
    const response = await api.rawAddBooks(testUser.userId, testUser.token, ['0000000000']);

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: '1205' });
  });

  test('added books appear in the user profile', async ({ api, testUser }) => {
    const isbns = data.referenceBooks.slice(0, 2).map((book) => book.isbn);

    await api.addBooks(testUser.userId, testUser.token, isbns);
    const profile = await api.getUser(testUser.userId, testUser.token);

    expect(profile.books.map((book) => book.isbn)).toEqual(isbns);
  });
});
