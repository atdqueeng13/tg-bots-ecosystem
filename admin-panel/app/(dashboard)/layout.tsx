import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // If no session cookie, redirect to /login
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex bg-background text-on-background">
      <Sidebar />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
}
