import dotenv from 'dotenv';

dotenv.config();

export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  
  // Database Configuration
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Email Configuration
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  EMAIL_FROM: string;
  
  // Redis Configuration
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  
  // File Upload Configuration
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: number;
  
  // Security Configuration
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // External APIs
  SARB_API_URL: string;
  ECB_API_URL: string;
  
  // Logging Configuration
  LOG_LEVEL: string;
  LOG_FILE: string;
}

const config: EnvironmentConfig = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  API_VERSION: process.env.API_VERSION || 'v1',
  
  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432'),
  DB_NAME: process.env.DB_NAME || 'nitroerp',
  DB_USER: process.env.DB_USER || 'nitroerp_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'password',
  DB_SSL: process.env.DB_SSL === 'true',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_make_it_long_and_random',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Email Configuration
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@nitroerp.com',
  
  // Redis Configuration
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // File Upload Configuration
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  
  // Security Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // External APIs
  SARB_API_URL: process.env.SARB_API_URL || 'https://www.resbank.co.za/api/exchangerates',
  ECB_API_URL: process.env.ECB_API_URL || 'https://api.exchangerate.host/latest',
  
  // Logging Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE || './logs/application.log',
};

export default config;

// Validation function to ensure all required environment variables are set
export function validateEnvironment(): void {
  const requiredVars = [
    'JWT_SECRET',
    'DB_PASSWORD',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Helper function to check if we're in production
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

// Helper function to check if we're in development
export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

// Helper function to check if we're in test environment
export function isTest(): boolean {
  return config.NODE_ENV === 'test';
} 