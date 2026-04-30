interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export async function handleApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ApiErrorResponse;
    throw new Error(
      errorData.message || `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
