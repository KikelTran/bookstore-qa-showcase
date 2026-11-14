# Book Store QA Showcase

Playwright + TypeScript test suite for the [demoqa Book Store](https://demoqa.com/books).
It mixes three layers in one framework:

| Layer    | What                                                                       | Where                                |
| -------- | -------------------------------------------------------------------------- | ------------------------------------ |
| **UI**   | Page Object Model, injected through Playwright fixtures                    | `src/pages`, `tests/ui`, `tests/e2e` |
| **API**  | Typed client over `APIRequestContext`, positive + negative contract checks | `src/api`, `tests/api`               |
| **Data** | JSON test data + SQLite DB (reference data and a cleanup ledger)           | `src/data`, `src/db`                 |

Design reasons, strengths and trade-offs: **[docs/DESIGN-NOTES.md](docs/DESIGN-NOTES.md)**.
Walkthrough page: **https://kikeltran.github.io/bookstore-qa-showcase/docs/showcase.html** (or open `docs/showcase.html` locally) (architecture, coding style, test matrix, strengths, trade-offs).

## Run

```bash
npm ci
npx playwright install chromium
cp .env.example .env        # optional, defaults work

npm test                    # all projects
npm run test:api            # API only (no browser starts)
npm run test:smoke          # @smoke tag
npm run report              # open the HTML report
npm run cleanup             # delete users left behind by a killed run
```

Quality gates: `npm run typecheck` and `npm run format:check`. Every test passed with `--repeat-each=3` and left 0 orphan users.

## Layout

```
src/
  config/env.ts          env vars + validation (one place)
  api/                   BookStoreClient, endpoints, types
  pages/                 BasePage, LoginPage, ProfilePage, BookStorePage
  fixtures/index.ts      test.extend: api, db, testUser, signedInUser, page objects
  data/*.json            reference books, negative login, password rules, search cases
  db/TestDataDb.ts       SQLite: reference_books + created_users ledger
  global-setup.ts        seeds JSON into the DB once per run
tests/
  api/                   pure API tests
  ui/                    UI tests (data-driven from JSON)
  e2e/                   hybrid: API arrange -> UI act -> UI + API assert
scripts/cleanup-orphans.ts
```

## How a hybrid test reads

```ts
test('user removes a book from the profile', async ({ api, signedInUser, profilePage }) => {
  await api.addBooks(signedInUser.userId, signedInUser.token, [keep.isbn, remove.isbn]); // arrange: API
  await profilePage.open();

  await profilePage.deleteBook(remove.isbn);                                              // act: UI

  await profilePage.expectBookTitles([keep.title]);                                       // assert: UI
  await expect.poll(() => api.getUser(...).then(u => u.books.map(b => b.isbn)))          // assert: backend
    .toEqual([keep.isbn]);
});
```

`signedInUser` creates a user by API, injects the session cookies, and deletes the user after the test, pass or fail.
