# Design Notes

Why the suite is built this way, what it does well, and what it gives up.

## 1. Goals

1. **Fast and stable.** UI only for what the user does. Everything else (setup, checks) through the API.
2. **Independent tests.** Each test makes its own data, so tests run in parallel and in any order.
3. **No leftovers.** Every created user is deleted, even when a test fails or the run is killed.
4. **Readable specs.** A spec reads as Arrange / Act / Assert in business words. No selectors in specs.

## 2. Architecture

```
            spec (tests/*)
               │  uses fixtures only
               ▼
  fixtures/index.ts ──► pages/*   (UI: locators + actions + expectX)
       │          └──► api/BookStoreClient (typed HTTP)
       │          └──► db/TestDataDb (SQLite)
       ▼
  config/env.ts  ◄── .env / CI env vars
  data/*.json    ──► global-setup seeds DB once
```

| Decision                                                                                                                            | Reason                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page objects via `test.extend` fixtures**, not `new LoginPage(page)` in specs, not singletons                                     | Each test gets its own instance, so parallel workers are safe. Specs only ask for what they need.                                                  |
| **Locators are `private readonly` fields; public methods are actions or `expectX` assertions**                                      | One place to fix a selector. Specs cannot reach into the DOM.                                                                                      |
| **Locator order: test id → role/label/placeholder → stable id → XPath (never used here)**                                           | Role locators match what the user sees and survive CSS changes. demoqa has no `data-testid`, so ids like `#delete-record-<isbn>` are the fallback. |
| **API client with two kinds of methods**: `createUser()` (throws on unexpected status) and `rawCreateUser()` (returns the response) | Setup code wants "it worked or stop". API tests want to assert on status and body themselves.                                                      |
| **`testUser` fixture: create by API, delete in teardown**                                                                           | API setup takes about 300 ms. The same through the UI takes 5–10 s and can fail for reasons that are not the test's.                               |
| **`signedInUser` injects session cookies**                                                                                          | Skips the login UI in every test except the login tests. Login is tested once, in `login.spec.ts`.                                                 |
| **JSON for test data, typed through `src/data/index.ts`**                                                                           | Non-coders can add cases. Specs never import raw JSON paths.                                                                                       |
| **SQLite `reference_books`**                                                                                                        | Expected values live in a DB, the way a real suite checks API results against the app DB.                                                          |
| **SQLite `created_users` ledger + `npm run cleanup`**                                                                               | Fixture teardown does not run if the process is killed. The ledger remembers, and cleanup runs in CI with `if: always()`.                          |
| **Unique, prefixed names (`qashow<time><random>`), prefix validated**                                                               | No collisions between workers. Cleanup can only touch data that matches our prefix.                                                                |
| **Third-party ads blocked in a `context` override**                                                                                 | demoqa ads slow pages and cover buttons. Not under test. Overriding `context` (not an auto fixture) means API tests never start a browser.         |
| **Hybrid e2e: API arrange → UI act → UI + API assert**                                                                              | The UI can show a stale or optimistic state. The API confirms the change really persisted.                                                         |
| **`expect.poll` and web-first assertions, zero `waitForTimeout`**                                                                   | Waits for a condition, not for a fixed time.                                                                                                       |

## 3. Strengths

- **Speed:** 19 tests (API + UI + e2e) run in about 40 s locally, in parallel.
- **Stability:** 57/57 green with `--repeat-each=3`, 0 orphan users after the run.
- **Isolation:** no test depends on another test or on shared accounts.
- **Debuggability:** API errors include the status, URL and body. Trace, screenshot and video are kept on failure.
- **Real API quirks are covered:** wrong password returns **200** with `status: "Failed"`. A status-only check would pass. The test asserts on the body.
- **Quality gates in CI:** typecheck and format run before tests. The HTML report is uploaded on every run.

## 4. Weaknesses and trade-offs

| Trade-off                                      | What I gave up                                                                                        | Why it is acceptable here / what I'd do at scale                                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cookie injection instead of UI login**       | Tests that use `signedInUser` do not cover the login flow. Coupled to how the app stores its session. | Login has its own tests. At scale: `storageState` per role, created once in a setup project.                                                               |
| **Assertions inside page objects (`expectX`)** | Some say page objects should not assert.                                                              | Keeps specs short and the selector in one file. Raw values are still available when a spec needs custom logic.                                             |
| **A new user per test**                        | More API calls; depends on the sign-up endpoint being healthy.                                        | Isolation is worth more. If the endpoint is slow, move to worker-scoped users.                                                                             |
| **SQLite instead of the app DB**               | Not a real backend DB check.                                                                          | The site is public, I have no DB access. The `TestDataDb` class is the seam: swap SQLite for a read-only Postgres client, same methods, parameterised SQL. |
| **Password stored in the ledger**              | Plain text in a local file.                                                                           | Throwaway users on a practice site, file is git-ignored. Real project: cleanup through an internal service or admin token, no passwords stored.            |
| **No schema validation library (zod)**         | Response shape is checked with `toEqual` / `toMatchObject` only.                                      | Enough for 6 endpoints. Next step: zod schemas per response, or Pact for contract tests between teams.                                                     |
| **Third-party site under test**                | Outages and changes at demoqa can fail the run.                                                       | CI keeps 1 retry + trace, so a flaky run still has evidence. Real project: own environment, seeded data.                                                   |
| **One browser (Chromium)**                     | No Firefox / WebKit coverage.                                                                         | Keeps the demo fast. Adding a project in `playwright.config.ts` is 1 line.                                                                                 |
| **No custom reporter / Allure**                | Built-in HTML + GitHub reporters only.                                                                | Built-in report has traces. Allure or a traceability matrix makes sense when results feed a test management tool.                                          |

## 5. Lessons this suite learned while being built

- **Teardown must not trust state the test may have changed.** First run: the UI login issued a new token and killed the one the fixture saved, so teardown got 401 and the user stayed. Fix: teardown asks for a fresh token. The ledger + cleanup script removed the 3 users that leaked before the fix. This is the reason the ledger exists.
- **Record before you assert.** In the create-user test, the user is written to the ledger before any `expect`, so a failed assertion still leaves a cleanup trail.
- **Auto fixtures start a browser.** A first version blocked ads in an `auto` fixture that used `context`, which opened a browser for API tests too.

## 6. Where these choices come from

Patterns taken from real projects I worked on (legacy web app with ExtJS UI, mobile apps, API and contract suites):

| Real-world pain                                               | What this demo does about it                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------- |
| UI-only data setup was slow and flaky                         | API setup in fixtures                                             |
| Shared accounts and fixed data forced suites into serial mode | Fresh, prefixed data per test                                     |
| Killed runs left rows in shared envs                          | Ledger + cleanup by prefix, run in CI `always()`                  |
| Hard waits (`waitForTimeout`) hid timing bugs and slowed runs | Web-first assertions and `expect.poll` only                       |
| Singleton page objects / global context broke parallel runs   | Page objects as fixtures                                          |
| SQL built by string concatenation                             | Parameterised SQL only                                            |
| Selectors bound to generated ids/classes                      | Role and placeholder locators first, test ids requested from devs |

## 7. Next steps if this grew

1. `storageState` per role in a `setup` project.
2. zod schemas for every API response; Pact for consumer contracts.
3. Read-only DB checks against the real app DB.
4. Tag-based CI split: `@smoke` on every PR, full suite nightly.
5. Firefox / WebKit projects and a visual check on key pages.
