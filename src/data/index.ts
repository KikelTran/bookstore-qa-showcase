import referenceBooks from './reference-books.json';
import loginNegative from './login-negative.json';
import passwordRules from './password-rules.json';
import searchCases from './search-cases.json';

/** Typed re-export, so specs never import raw JSON paths. */
export interface ReferenceBook {
  isbn: string;
  title: string;
  author: string;
  pages: number;
}

export const data = {
  referenceBooks: referenceBooks as ReferenceBook[],
  loginNegative,
  passwordRules,
  searchCases,
} as const;
