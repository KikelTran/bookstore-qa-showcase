import { test } from '../../src/fixtures';
import { data } from '../../src/data';

test.describe('Book search', { tag: '@ui' }, () => {
  for (const { case: name, term, expectedTitles } of data.searchCases) {
    test(`search ${name}: "${term}"`, async ({ bookStorePage }) => {
      await bookStorePage.open();

      await bookStorePage.search(term);

      await bookStorePage.expectTitles(expectedTitles);
    });
  }
});
