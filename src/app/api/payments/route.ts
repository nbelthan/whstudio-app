/**
 * Payments API endpoint
 * Handles payment history, status queries, and MiniKit payment initiation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/session';
import { queries } from '@/lib/db';

interface CreatePaymentRequest {
  task_id?: string;
  submission_id?: string;
  amount: number;
  currency?: 'WLD' | 'ETH' | 'USDC';
  payment_type: 'task_reward' | 'escrow_deposit' | 'escrow_release' | 'refund';
  recipient_id?: string;
  description?: string;
}

/**
 * Get payment history for authenticated user
 */
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
      const type = searchParams.get('type'); // 'sent' | 'received' | 'all'
      const status = searchParams.get('status');
      const payment_type = searchParams.get('payment_type');

      // Build query based on filters
      let whereConditions = [];
      let queryParams = [user.id];
      let paramIndex = 2;

      // Base condition - user is either payer or recipient
      if (type === 'sent') {
        whereConditions.push(`p.payer_id = $1`);
      } else if (type === 'received') {
        whereConditions.push(`p.recipient_id = $1`);
      } else {
        whereConditions.push(`(p.payer_id = $1 OR p.recipient_id = $1)`);
      }

      // Add status filter
      if (status) {
        whereConditions.push(`p.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      // Add payment type filter
      if (payment_type) {
        whereConditions.push(`p.payment_type = $${paramIndex}`);
        queryParams.push(payment_type);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const { db } = await import('@/lib/db');

      const query = `
        SELECT
          p.*,
          t.title as task_title,
          payer.username as payer_username,
          recipient.username as recipient_username
        FROM payments p
        LEFT JOIN tasks t ON p.task_id = t.id
        LEFT JOIN users payer ON p.payer_id = payer.id
        LEFT JOIN users recipient ON p.recipient_id = recipient.id
        WHERE ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const payments = await db(query, queryParams);

      const formattedPayments = payments.map((payment: any) => ({
        id: payment.id,
        task_id: payment.task_id,
        task_title: payment.task_title,
        submission_id: payment.submission_id,
        amount: payment.amount,
        currency: payment.currency,
        payment_type: payment.payment_type,
        status: payment.status,
        transaction_hash: payment.transaction_hash,
        blockchain_network: payment.blockchain_network,
        gas_fee: payment.gas_fee,
        platform_fee: payment.platform_fee,
        net_amount: payment.net_amount,
        external_payment_id: payment.external_payment_id,
        failure_reason: payment.failure_reason,
        processed_at: payment.processed_at,
        expires_at: payment.expires_at,
        created_at: payment.created_at,
        payer_username: payment.payer_username,
        recipient_username: payment.recipient_username,
        is_payer: payment.payer_id === user.id,
        is_recipient: payment.recipient_id === user.id
      }));

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payments p
        LEFT JOIN tasks t ON p.task_id = t.id
        LEFT JOIN users payer ON p.payer_id = payer.id
        LEFT JOIN users recipient ON p.recipient_id = recipient.id
        WHERE ${whereClause}
      `;

      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const countResult = await db(countQuery, countParams);
      const total = parseInt(countResult[0]?.total || '0');

      return NextResponse.json({
        success: true,
        payments: formattedPayments,
        pagination: {
          limit,
          offset,
          count: formattedPayments.length,
          total,
          has_more: offset + formattedPayments.length < total
        }
      });

    } catch (error) {
      console.error('Payment history error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payment history' },
        { status: 500 }
      );
    }
  });
}

/**
 * Create new payment for MiniKit processing
 */
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const paymentData: CreatePaymentRequest = await req.json();

      // Validate required fields
      if (!paymentData.amount || paymentData.amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid payment amount' },
          { status: 400 }
        );
      }

      // Minimum transfer validation ($0.1)
      if (paymentData.amount < 0.1) {
        return NextResponse.json(
          { error: 'Minimum transfer amount is $0.1' },
          { status: 400 }
        );
      }

      if (!paymentData.payment_type) {
        return NextResponse.json(
          { error: 'Payment type is required' },
          { status: 400 }
        );
      }

      // Check daily transaction limit (300 transactions per user per day)
      const { db } = await import('@/lib/db');
      const dailyLimitQuery = `
        SELECT COUNT(*) as daily_count
        FROM payments
        WHERE payer_id = $1
        AND created_at >= CURRENT_DATE
        AND status IN ('pending', 'processing', 'completed')
      `;

      const dailyResult = await db(dailyLimitQuery, [user.id]);
      const dailyCount = parseInt(dailyResult[0]?.daily_count || '0');

      if (dailyCount >= 300) {
        return NextResponse.json(
          { error: 'Daily transaction limit (300) exceeded' },
          { status: 429 }
        );
      }

      // Generate unique external payment ID for MiniKit
      const externalPaymentId = `wh_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

      // Validate based on payment type
      let recipientId = paymentData.recipient_id;

      if (paymentData.payment_type === 'task_reward') {
        if (!paymentData.task_id || !paymentData.submission_id) {
          return NextResponse.json(
            { error: 'Task ID and Submission ID required for task rewards' },
            { status: 400 }
          );
        }

        // Verify task creator is making the payment
        const tasks = await queries.tasks.findById(paymentData.task_id);
        if (tasks.length === 0 || tasks[0].creator_id !== user.id) {
          return NextResponse.json(
            { error: 'Unauthorized: Only task creator can initiate reward payments' },
            { status: 403 }
          );
        }

        // Get submission details for recipient
        const submissionQuery = `
          SELECT s.user_id, s.status, u.wallet_address
          FROM submissions s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = $1 AND s.task_id = $2
        `;
        const submissions = await db(submissionQuery, [paymentData.submission_id, paymentData.task_id]);

        if (submissions.length === 0) {
          return NextResponse.json(
            { error: 'Submission not found' },
            { status: 404 }
          );
        }

        const submission = submissions[0];
        if (submission.status !== 'approved') {
          return NextResponse.json(
            { error: 'Can only pay for approved submissions' },
            { status: 400 }
          );
        }

        recipientId = submission.user_id;
      }

      if (paymentData.payment_type === 'escrow_deposit') {
        if (!paymentData.task_id) {
          return NextResponse.json(
            { error: 'Task ID required for escrow deposits' },
            { status: 400 }
          );
        }
      }

      // Create payment record in database
      const newPayment = {
        task_id: paymentData.task_id || null,
        submission_id: paymentData.submission_id || null,
        payer_id: user.id,
        recipient_id: recipientId || null,
        amount: paymentData.amount,
        currency: paymentData.currency || 'WLD',
        payment_type: paymentData.payment_type,
        status: 'pending' as const,
        blockchain_network: 'world-chain',
        external_payment_id: externalPaymentId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      const createdPayments = await queries.payments.create(newPayment);

      if (createdPayments.length === 0) {
        throw new Error('Failed to create payment record');
      }

      const payment = createdPayments[0];

      // Return payment details for MiniKit integration
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          external_payment_id: externalPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          payment_type: payment.payment_type,
          status: payment.status,
          expires_at: payment.expires_at,
          recipient_id: payment.recipient_id,
          description: paymentData.description || `Payment for ${payment.payment_type}`,
          // MiniKit specific fields
          reference: externalPaymentId,
          blockchain_network: 'world-chain'
        }
      });

    } catch (error) {
      console.error('Payment creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create payment' },
        { status: 500 }
      );
    }
  });
}