export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  ALLOWED_EMAILS: string;
  BASE_PATH: string;
}

export interface JwtPayload {
  email: string;
  exp?: number;
}
