/**
 * Payments list API endpoint
 * Handles payment history and status queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/session';
import { queries } from '@/lib/db/client';

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

      const { db } = await import('@/lib/db/client');

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

      return NextResponse.json({
        success: true,
        payments: formattedPayments,
        pagination: {
          limit,
          offset,
          count: formattedPayments.length,
          has_more: formattedPayments.length === limit
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