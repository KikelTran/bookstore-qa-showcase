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

## Setup

**Prerequisites**

| Tool    | Version           | Check           |
| ------- | ----------------- | --------------- |
| Node.js | 20.x (CI uses 20) | `node -v`       |
| npm     | 10.x              | `npm -v`        |
| Git     | any               | `git --version` |

No database server is needed: SQLite is a file created on the first run. No account is needed: tests create their own demoqa users.

**Install**

```bash
git clone https://github.com/KikelTran/bookstore-qa-showcase.git
cd bookstore-qa-showcase
npm ci                              # exact versions from package-lock.json
npx playwright install chromium     # browser for the functional + e2e suites
```

**Configuration (optional)**

Defaults work as-is. To change them, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable           | Default              | Meaning                                                                                                          |
| ------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`         | `https://demoqa.com` | Site and API under test                                                                                          |
| `TEST_DATA_PREFIX` | `qashow`             | Prefix for every user the suite creates. Lowercase letters/digits, 3–12 chars. Cleanup only touches this prefix. |
| `DB_PATH`          | `./test-data.db`     | SQLite file (reference data + created-users ledger)                                                              |
| `CI`               | unset                | Set by GitHub Actions. Turns on 2 workers, 1 retry, traces for every test, `forbidOnly`                          |

## Run the tests

```bash
npm test                     # all 3 suites in one parallel run (19 tests, ~40 s)
npm run test:api             # API suite only, no browser starts (11 tests)
npm run test:functional      # Functional UI suite (7 tests)
npm run test:e2e             # End-to-end suite (1 test)
npm run test:smoke           # @smoke subset across all suites (4 tests)
```

Any Playwright CLI option can be added after `--`, or used with `npx playwright test`:

```bash
npx playwright test -g "duplicate user"             # one test by name
npx playwright test tests/functional/login.spec.ts  # one file
npx playwright test --grep @smoke --project=api     # tag + suite
npx playwright test --headed --project=e2e          # watch the browser
npx playwright test --ui                            # interactive UI mode: pick, run, time-travel
npx playwright test --debug -g "removes a book"     # step through with the inspector
npx playwright test --repeat-each=3                 # flakiness check
npx playwright test --workers=1                     # run one test at a time
```

| Option                             | Meaning                                                  |
| ---------------------------------- | -------------------------------------------------------- |
| `--project=<api\|functional\|e2e>` | Run one suite                                            |
| `--grep <text\|@tag>` / `-g`       | Filter by test title or tag                              |
| `--headed`                         | Show the browser (UI suites)                             |
| `--ui`                             | Playwright UI mode                                       |
| `--debug`                          | Pause on each step with the Playwright Inspector         |
| `--repeat-each=N`                  | Run every test N times                                   |
| `--workers=N`                      | Number of parallel workers (default: half the CPU cores) |

**What a run does, step by step**

1. `global-setup.ts` loads `src/data/reference-books.json` into the SQLite `reference_books` table.
2. Each worker opens one SQLite connection (WAL mode, safe for parallel writes).
3. For a test that needs a user, the `testUser` fixture creates one through the API, writes it to the `created_users` ledger, and gets a token. `signedInUser` also sets the session cookies in the browser.
4. The test runs: API calls and/or page-object actions, then assertions.
5. Teardown gets a fresh token, deletes the user, and marks the ledger row as deleted. This happens even when the test fails.
6. Reporters write `playwright-report/` (HTML) and `test-results/junit.xml`.

## Reports

| Where             | How to open                                               | Contents                                                                   |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| Local HTML report | `npm run report`                                          | Every test with steps and duration. Failed tests: trace, screenshot, video |
| Local JUnit       | `test-results/junit.xml`                                  | Machine-readable results for CI tools                                      |
| CI live report    | https://kikeltran.github.io/bookstore-qa-showcase/report/ | Latest run on `main`, **trace for every test**                             |
| CI artifact       | Actions → run → Artifacts → `playwright-report`           | Same report + `junit.xml`, kept 7 days                                     |

**Open a trace:** in the HTML report, open a test and click the **Trace** section. The Trace Viewer shows each action with a DOM snapshot, network calls (including the API setup calls), console output and the source line. A trace file can also be opened directly: `npx playwright show-trace <path/to/trace.zip>`.

## CI (GitHub Actions)

`.github/workflows/tests.yml` runs on every push to `main`, on pull requests and on manual dispatch:

| Job            | Steps                                                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality`      | `npm ci` → `npm run typecheck` → `npm run format:check`                                                                                       |
| `test`         | install Chromium → `npx playwright test` (2 workers, 1 retry, prefix `qaci`, traces on) → `npm run cleanup` (always) → upload report artifact |
| `deploy-pages` | Push to `main` only: publish `docs/` + the HTML report to GitHub Pages (also when tests fail, so failures are visible)                        |

## Cleanup and quality gates

```bash
npm run cleanup        # delete users left behind by a killed run (reads the SQLite ledger)
npm run typecheck      # tsc --noEmit, strict mode
npm run format:check   # prettier --check
npm run format         # prettier --write
```

Every test passed with `--repeat-each=3` and left 0 orphan users.

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

## Files

| File / folder                      | Purpose                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| `playwright.config.ts`             | Projects (`api`, `functional`, `e2e`), parallel workers, retries, reporters, traces         |
| `src/config/env.ts`                | Reads and validates env vars in one place                                                   |
| `src/api/BookStoreClient.ts`       | Typed API client: setup helpers (throw on unexpected status) + `raw*` methods for API tests |
| `src/api/endpoints.ts`, `types.ts` | API paths and response types                                                                |
| `src/pages/`                       | Page objects: `BasePage`, `LoginPage`, `ProfilePage`, `BookStorePage`                       |
| `src/fixtures/index.ts`            | `test.extend`: `api`, `db`, `testUser`, `signedInUser`, page objects, ad blocking           |
| `src/data/*.json`                  | Test data: reference books, negative logins, password rules, search cases                   |
| `src/db/TestDataDb.ts`             | SQLite: `reference_books` + `created_users` ledger                                          |
| `src/global-setup.ts`              | Seeds JSON into the DB once per run                                                         |
| `src/utils/test-data.ts`           | Unique user names and strong passwords                                                      |
| `tests/api/`                       | API suite                                                                                   |
| `tests/functional/`                | Functional UI suite (data-driven from JSON)                                                 |
| `tests/e2e/`                       | End-to-end suite: API arrange → UI act → UI + API assert                                    |
| `scripts/cleanup-orphans.ts`       | Ledger-driven cleanup of leftover users                                                     |
| `docs/showcase.html`               | Walkthrough page: architecture, coding style, test matrix, trade-offs                       |
| `docs/DESIGN-NOTES.md`             | Design decisions, strengths, trade-offs                                                     |
| `.github/workflows/tests.yml`      | CI pipeline + GitHub Pages deploy                                                           |
| `.env.example`                     | Config template (copy to `.env`, gitignored)                                                |
| `test-data.db`                     | SQLite file created at run time (gitignored)                                                |

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

## Troubleshooting

| Issue                                                      | Fix                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Executable doesn't exist ... chromium`                    | `npx playwright install chromium` (on Linux CI: `--with-deps`)                                                                  |
| `Cannot find module 'better-sqlite3'` / native build error | Use Node 20, delete `node_modules`, then `npm ci`                                                                               |
| `TEST_DATA_PREFIX must match /^[a-z0-9]{3,12}$/`           | Use 3–12 lowercase letters or digits in `.env`                                                                                  |
| `create user: expected 201, got 5xx`                       | demoqa is down or rate-limiting; check https://demoqa.com/books, then run again                                                 |
| `delete user: expected 204, got 401` in teardown           | Token was replaced (e.g. by a UI login). The fixture already asks for a fresh token; if it still happens, run `npm run cleanup` |
| `database is locked`                                       | Another run is using `test-data.db`; wait for it, or delete the file (it is rebuilt on the next run)                            |
| Functional/e2e tests time out on page load                 | Network or third-party scripts slow; ads are already blocked by the `context` fixture. Run again with `--workers=2`             |
| Users left on demoqa after a killed run                    | `npm run cleanup`                                                                                                               |
| Report shows no trace for a passing test locally           | Expected: locally traces are kept for failures only. Add `--trace on` to record all                                             |
