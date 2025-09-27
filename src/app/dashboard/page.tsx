'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Typography,
  SafeAreaView,
  Button,
  ListItem,
  CircularState,
  Spinner,
} from '@worldcoin/mini-apps-ui-kit-react';
import { Briefcase, Award, Clock, TrendingUp } from 'lucide-react';

interface User {
  id: string;
  world_id: string;
  username?: string;
  verification_level: string;
  wallet_address?: string;
  reputation_score?: number;
  total_earned?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo mode, always use mock data to avoid auth loops
    const checkAuth = async () => {
      try {
        // Always use mock user data for demo
        const mockUser: User = {
          id: '123',
          world_id: 'world_1234567890',
          username: 'Human',
          verification_level: 'device',
          wallet_address: '0x1234567890abcdef',
          reputation_score: 100,
          total_earned: 250,
        };
        setUser(mockUser);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // In demo mode, still show dashboard with mock data
        const mockUser: User = {
          id: '123',
          world_id: 'world_1234567890',
          username: 'Human',
          verification_level: 'device',
          wallet_address: '0x1234567890abcdef',
          reputation_score: 100,
          total_earned: 250,
        };
        setUser(mockUser);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-8 h-8 text-white mb-4 mx-auto" />
          <Typography variant="body2" className="text-white/60">
            Loading dashboard...
          </Typography>
        </div>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView className="min-h-screen bg-black">
      <div className="w-full max-w-md mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-4">
          <Typography variant="h2" className="text-white mb-1">
            Dashboard
          </Typography>
          <Typography variant="body2" className="text-white/60">
            Welcome back, {user.username || 'Human'}
          </Typography>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center mb-2">
              <Award className="w-5 h-5 text-[rgb(25,137,251)] mr-2" />
              <Typography variant="caption" className="text-white/60">
                Reputation
              </Typography>
            </div>
            <Typography variant="h3" className="text-white">
              {user.reputation_score || 0}
            </Typography>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
              <Typography variant="caption" className="text-white/60">
                Total Earned
              </Typography>
            </div>
            <Typography variant="h3" className="text-white">
              ${user.total_earned || 0}
            </Typography>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <Typography variant="h4" className="text-white mb-4">
            Quick Actions
          </Typography>

          <div className="space-y-3">
            <ListItem
              icon={<Briefcase className="w-5 h-5 text-[rgb(25,137,251)]" />}
              title="Browse Tasks"
              subtitle="Find new tasks to complete"
              onClick={() => router.push('/tasks')}
            />

            <ListItem
              icon={<Clock className="w-5 h-5 text-yellow-400" />}
              title="My Submissions"
              subtitle="Track your pending submissions"
              onClick={() => router.push('/submissions')}
            />
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
          <Typography variant="h4" className="text-white mb-4">
            Account Info
          </Typography>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Typography variant="caption" className="text-white/60">
                World ID
              </Typography>
              <Typography variant="caption" className="text-white">
                {user.world_id}
              </Typography>
            </div>

            <div className="flex justify-between">
              <Typography variant="caption" className="text-white/60">
                Verification
              </Typography>
              <Typography variant="caption" className="text-white capitalize">
                {user.verification_level}
              </Typography>
            </div>

            {user.wallet_address && (
              <div className="flex justify-between">
                <Typography variant="caption" className="text-white/60">
                  Wallet
                </Typography>
                <Typography variant="caption" className="text-white">
                  {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
                </Typography>
              </div>
            )}
          </div>
        </div>

        {/* Sign Out */}
        <Button
          variant="secondary"
          size="large"
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.push('/');
            } catch (error) {
              console.error('Logout failed:', error);
            }
          }}
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </SafeAreaView>
  );
}