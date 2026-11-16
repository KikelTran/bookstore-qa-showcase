# Book Store QA Showcase

[![tests](https://github.com/KikelTran/bookstore-qa-showcase/actions/workflows/tests.yml/badge.svg)](https://github.com/KikelTran/bookstore-qa-showcase/actions/workflows/tests.yml)

**Latest test report (from CI):** https://kikeltran.github.io/bookstore-qa-showcase/report/

Playwright + TypeScript test automation framework for the [demoqa Book Store](https://demoqa.com/books): a small web app with a login, a book catalog and a per-user book collection, plus a public REST API for the same data.
It shows how I structure a suite that mixes UI, API and data setup, and why.

### Highlights

- **3 suites, 19 tests:** API (11), Functional UI (7), End-to-end (1), plus a `@smoke` subset across all three.
- **Parallel by default:** `fullyParallel: true`. 19 tests in about 40 s locally, 50 s in CI.
- **Independent tests:** each test creates its own user through the API and deletes it afterwards, pass or fail. No shared accounts, no ordering, no serial mode.
- **Page Object Model through fixtures:** private locators, user-level actions, `expectX` assertions. No selectors in specs.
- **Hybrid E2E:** arrange by API, act in the UI, assert in both the UI and the backend.
- **Data layer:** JSON test data and a SQLite DB (expected values + a ledger of created users, used by a cleanup script).
- **Proven stable:** `--repeat-each=3` gives 57/57 green with 0 leftover users. Typecheck and format gates run in CI.
- **Live results:** every push to `main` runs CI and publishes the HTML report to GitHub Pages.

| Layer    | What                                                                       | Where                                        |
| -------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| **UI**   | Page Object Model, injected through Playwright fixtures                    | `src/pages`, `tests/functional`, `tests/e2e` |
| **API**  | Typed client over `APIRequestContext`, positive + negative contract checks | `src/api`, `tests/api`                       |
| **Data** | JSON test data + SQLite DB (reference data and a cleanup ledger)           | `src/data`, `src/db`                         |

Design reasons, strengths and trade-offs: **[docs/DESIGN-NOTES.md](docs/DESIGN-NOTES.md)**.
Walkthrough page: **https://kikeltran.github.io/bookstore-qa-showcase/docs/showcase.html** (or open `docs/showcase.html` locally) (architecture, coding style, test matrix, strengths, trade-offs).

## Run

```bash
npm ci
npx playwright install chromium
cp .env.example .env        # optional, defaults work

npm test                    # all 3 suites in parallel
npm run test:api            # API suite (no browser starts)
npm run test:functional     # Functional UI suite
npm run test:e2e            # End-to-end suite
npm run test:smoke          # @smoke subset across suites
npm run report              # open the HTML report
npm run cleanup             # delete users left behind by a killed run
```

Quality gates: `npm run typecheck` and `npm run format:check`. Every test passed with `--repeat-each=3` and left 0 orphan users.

## Test strategy

| Suite         | Playwright project | Folder             | Tag           | Tests | Browser  | What it covers                                                                      |
| ------------- | ------------------ | ------------------ | ------------- | ----- | -------- | ----------------------------------------------------------------------------------- |
| API           | `api`              | `tests/api`        | `@api`        | 11    | none     | Status codes, response bodies, validation rules, auth, catalog vs DB reference data |
| Functional UI | `functional`       | `tests/functional` | `@functional` | 7     | Chromium | One page or feature at a time: login (happy + negative), book search (data-driven)  |
| End-to-end    | `e2e`              | `tests/e2e`        | `@e2e`        | 1     | Chromium | A full user journey across pages, checked in the UI and through the API             |
| Smoke         | all                | —                  | `@smoke`      | 4     | mixed    | Fast PR gate: one critical check per area                                           |

**Parallel execution.** `fullyParallel: true` runs every test at the same time, including tests inside one file. Workers are half the CPU cores locally and 2 in CI. Suites are Playwright projects, so `npm test` runs all three in one parallel run.

**Independent, not sequential.** No test depends on another test's data or order:

- users come from the `testUser` fixture, a new unique user per test (`qashow<time><random>`)
- teardown deletes the user even when the test fails; a DB ledger catches killed runs
- no `test.describe.serial`, no shared accounts, no `beforeAll` state

Any single test can run alone (`npx playwright test -g "duplicate user"`), and the whole suite passes with `--repeat-each=3`.

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
  functional/            functional UI tests (data-driven from JSON)
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
