export const Endpoint = {
  USER: '/Account/v1/User',
  USER_BY_ID: (userId: string) => `/Account/v1/User/${userId}`,
  GENERATE_TOKEN: '/Account/v1/GenerateToken',
  AUTHORIZED: '/Account/v1/Authorized',
  BOOKS: '/BookStore/v1/Books',
  BOOK: '/BookStore/v1/Book',
} as const;
