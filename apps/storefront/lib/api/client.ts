export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) throw new Error('Không thể tải dữ liệu. Vui lòng thử lại.');
  return response.json() as Promise<T>;
}
