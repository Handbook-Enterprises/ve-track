export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface Pagination {
  page: number;
  limit: number;
}
