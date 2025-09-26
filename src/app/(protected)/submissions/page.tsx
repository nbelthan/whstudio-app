/**
 * Submissions Page
 * View submission history and status
 */

import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { SubmissionHistory } from '@/components/submissions';

export default async function SubmissionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">My Submissions</h1>
          <p className="text-white/70">
            Track your task submissions and their review status
          </p>
        </div>

        <SubmissionHistory showFilters={true} />
      </div>
    </div>
  );
}