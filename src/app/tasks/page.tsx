'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SafeAreaView } from '@worldcoin/mini-apps-ui-kit-react';
import { Clock, Sparkles, ArrowUpRight, Filter } from 'lucide-react';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import BottomTabs from '@/components/Navigation/BottomTabs';
import { cn, formatDuration, formatCurrency } from '@/lib/utils';
import { Task } from '@/types';

const heroCopy = 'Select a verified task queue and earn instantly when quality checks pass.';

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/tasks?limit=20&offset=0');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks as Task[]);
        } else {
          throw new Error('No tasks available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <SafeAreaView className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] pb-32">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        <header className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--color-text-secondary)]">
              Tasks
            </p>
            <Badge variant="ghost" size="sm" leftIcon={<Filter className="h-3 w-3" />}>
              Filter
            </Badge>
          </div>
          <h1 className="text-3xl font-semibold">Earn with real humans</h1>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{heroCopy}</p>
        </header>

        {error && (
          <Card variant="default" padding="lg" className="border-[color-mix(in srgb,var(--color-error) 35%,transparent)] bg-[color-mix(in srgb,var(--color-error) 12%,transparent)]">
            <p className="text-sm font-semibold text-[var(--color-error)] mb-2">Could not load tasks</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{error}</p>
          </Card>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Available queues</h2>
            <Badge variant="primary" size="sm" leftIcon={<Sparkles className="h-3 w-3" />}>
              {tasks.length} open
            </Badge>
          </div>

          <div className="space-y-3">
            {(loading ? Array.from({ length: 4 }) : tasks).map((task, index) => (
              <Card
                key={task ? task.id : index}
                variant="default"
                padding="lg"
                hover
                clickable={!!task}
                onClick={() => task && router.push(`/tasks/${task.id}`)}
                className="space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {task ? task.title : 'Loading task…'}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {task ? task.description : 'Preparing verified queue'}
                    </p>
                  </div>
                  <Badge variant="ghost" size="sm">
                    {task ? task.task_type.replace(/_/g, ' ') : 'Pending'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
                    <Clock className="h-4 w-4" />
                    {task ? formatDuration(task.estimated_time_minutes || 5) : '—'}
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-success)]">
                    {task ? formatCurrency(task.reward_amount || 0.25, task.reward_currency) : '—'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[color-mix(in srgb,var(--color-divider-low) 60%,transparent)]">
                  <Link
                    href={task ? `/tasks/${task.id}` : '#'}
                    className={cn(
                      'inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em]',
                      'text-[var(--color-accent-blue)]'
                    )}
                  >
                    View details
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <Badge variant="primary" size="sm">
                    {task ? `${task.accuracy_requirement ?? 98}% consensus` : '—'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
      <BottomTabs />
    </SafeAreaView>
  );
}
