export const API_ENDPOINTS = {
  posts: 'api/posts',
  agents: 'api/agents',
  user: 'api/users',
  reviews: 'api/reviews',
  blogs: 'api/blogs',
} as const

export const SALESFORCE_BASE_URL = process.env.SALESFORCE_BASE_URL;
export const SALESFORCE_API_VERSION = process.env.SALESFORCE_API_VERSION;
export const BASE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;