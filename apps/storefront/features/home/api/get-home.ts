import type { HomeData } from '@flashlab/contracts';
export async function getHome(): Promise<HomeData> {
  const response = await fetch(`${process.env.API_URL ?? 'http://127.0.0.1:4000'}/api/home`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Home API unavailable');
  return response.json() as Promise<HomeData>;
}
