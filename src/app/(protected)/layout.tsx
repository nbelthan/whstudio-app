import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AppNavigation } from '@/components/layout';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If the user is not authenticated, redirect to the login page
  if (!session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppNavigation />
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <AppNavigation />
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}
