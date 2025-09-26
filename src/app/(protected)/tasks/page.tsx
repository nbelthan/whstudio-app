/**
 * Tasks Page
 * Browse and filter available tasks
 */

import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { TaskList } from '@/components/tasks';

export default async function TasksPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-8">
        <TaskList showFilters={true} />
      </div>
    </div>
  );
}