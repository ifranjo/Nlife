// Shared TypeScript types - placeholder for future use
export interface ServiceConfig {
  name: string;
  port: number;
  enabled: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
