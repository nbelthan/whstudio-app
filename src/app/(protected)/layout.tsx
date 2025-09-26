import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { BottomTabs } from '@/components/navigation/BottomTabs';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <main className="flex-1 w-full pb-[calc(env(safe-area-inset-bottom)+96px)]">
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
