/**
 * Dashboard Page
 * Main dashboard view for authenticated users
 */

import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DashboardStats, EarningsChart, RecentActivity } from '@/components/dashboard';
import { PaymentHistory } from '@/components/payments';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {session.user.username || 'User'}!
          </h1>
          <p className="text-white/70">
            Here's your WorldHuman Studio activity overview
          </p>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats />

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <EarningsChart />
          <RecentActivity limit={8} />
        </div>

        {/* Payment History */}
        <PaymentHistory limit={10} showFilters={false} />
      </div>
    </div>
  );
}