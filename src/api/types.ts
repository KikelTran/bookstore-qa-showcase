export interface Credentials {
  userName: string;
  password: string;
}

export interface Book {
  isbn: string;
  title: string;
  subTitle: string;
  author: string;
  publish_date: string;
  publisher: string;
  pages: number;
  description: string;
  website: string;
}

export interface CreatedUser {
  userID: string;
  username: string;
  books: Book[];
}

export interface UserProfile {
  userId: string;
  username: string;
  books: Book[];
}

export interface TokenResponse {
  token: string | null;
  expires: string | null;
  status: 'Success' | 'Failed';
  result: string;
}

export interface ApiError {
  code: string;
  message: string;
}

/** A user that exists on the server, with a valid token. Produced by the testUser fixture. */
export interface SessionUser extends Credentials {
  userId: string;
  token: string;
  expires: string;
}
