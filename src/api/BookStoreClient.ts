import { APIRequestContext, APIResponse } from '@playwright/test';
import { Endpoint } from './endpoints';
import { Book, CreatedUser, Credentials, TokenResponse, UserProfile } from './types';

/**
 * Thin typed wrapper over Playwright's APIRequestContext.
 *
 * Two kinds of methods:
 * - Happy-path helpers (createUser, getBooks...) parse the body and throw a readable error
 *   on an unexpected status. Used for data setup, where a failure is a setup failure.
 * - `raw*` methods return the APIResponse untouched. Used by API tests that assert on
 *   status codes and error bodies themselves.
 */
export class BookStoreClient {
  constructor(private readonly request: APIRequestContext) {}

  rawCreateUser(credentials: Credentials): Promise<APIResponse> {
    return this.request.post(Endpoint.USER, { data: credentials });
  }

  rawGenerateToken(credentials: Credentials): Promise<APIResponse> {
    return this.request.post(Endpoint.GENERATE_TOKEN, { data: credentials });
  }

  rawGetUser(userId: string, token: string): Promise<APIResponse> {
    return this.request.get(Endpoint.USER_BY_ID(userId), { headers: this.auth(token) });
  }

  rawAddBooks(userId: string, token: string, isbns: string[]): Promise<APIResponse> {
    return this.request.post(Endpoint.BOOKS, {
      headers: this.auth(token),
      data: { userId, collectionOfIsbns: isbns.map((isbn) => ({ isbn })) },
    });
  }

  async createUser(credentials: Credentials): Promise<CreatedUser> {
    return this.parse<CreatedUser>(await this.rawCreateUser(credentials), 201, 'create user');
  }

  async generateToken(credentials: Credentials): Promise<TokenResponse> {
    const body = await this.parse<TokenResponse>(
      await this.rawGenerateToken(credentials),
      200,
      'generate token',
    );
    if (body.status !== 'Success' || !body.token) {
      throw new Error(`generate token: ${body.result}`);
    }
    return body;
  }

  async getBooks(): Promise<Book[]> {
    const body = await this.parse<{ books: Book[] }>(
      await this.request.get(Endpoint.BOOKS),
      200,
      'get books',
    );
    return body.books;
  }

  async getUser(userId: string, token: string): Promise<UserProfile> {
    return this.parse<UserProfile>(await this.rawGetUser(userId, token), 200, 'get user');
  }

  async addBooks(userId: string, token: string, isbns: string[]): Promise<void> {
    await this.parse(await this.rawAddBooks(userId, token, isbns), 201, 'add books');
  }

  async deleteUser(userId: string, token: string): Promise<void> {
    const response = await this.request.delete(Endpoint.USER_BY_ID(userId), { headers: this.auth(token) });
    await this.parse(response, 204, 'delete user');
  }

  private auth(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }

  private async parse<T>(response: APIResponse, expected: number, action: string): Promise<T> {
    if (response.status() !== expected) {
      // Include method, URL and body: the first thing you need when setup fails in CI.
      throw new Error(
        `${action}: expected ${expected}, got ${response.status()} ${response.url()}\n${await response.text()}`,
      );
    }
    return (expected === 204 ? undefined : await response.json()) as T;
  }
}
