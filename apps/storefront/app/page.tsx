import { getHome } from '@/features/home/api/get-home';
import { HomePage } from '@/features/home/components/home-page';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const data = await getHome();
  return <HomePage data={data} />;
}
