import { test, expect } from '../../src/fixtures';
import { data } from '../../src/data';

/**
 * Hybrid flow: API for setup and for the final check, UI only for the behaviour under test.
 * Arrange by API (fast, no flaky UI steps) -> Act in UI -> Assert in UI and in the backend.
 */
test.describe('Book collection', { tag: ['@e2e', '@smoke'] }, () => {
  test('user removes a book from the profile', async ({ api, signedInUser, profilePage }) => {
    const [keep, remove] = data.referenceBooks;
    await api.addBooks(signedInUser.userId, signedInUser.token, [keep.isbn, remove.isbn]);
    await profilePage.open();
    await profilePage.expectBookTitles([keep.title, remove.title]);

    await profilePage.deleteBook(remove.isbn);

    await profilePage.expectBookTitles([keep.title]);
    // UI can lie (stale render, optimistic update). The API is the source of truth.
    await expect
      .poll(async () => (await api.getUser(signedInUser.userId, signedInUser.token)).books.map((b) => b.isbn))
      .toEqual([keep.isbn]);
  });
});
