import { getSupabaseClient } from '../client';

export interface CreatePaymentIntentParams {
  saleId?: string;
  amount: number;
  currency?: string;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
}

export interface ConfirmPaymentParams {
  paymentIntentId: string;
  paymentMethodId?: string;
}

export interface PaymentResult {
  success: boolean;
  status: string;
  paymentIntentId?: string;
  error?: string;
}

export const stripePaymentService = {
  /**
   * Check if Stripe is configured for the company
   */
  async isConfigured(companyId: string): Promise<boolean> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (!data?.settings) return false;

    const settings = data.settings as Record<string, unknown>;
    const integrations = settings.integrations as Record<string, { enabled?: boolean; api_key?: string }> | undefined;

    return !!(integrations?.stripe?.enabled && integrations?.stripe?.api_key);
  },

  /**
   * Create a payment intent via Edge Function
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: params,
    });

    if (error) {
      throw new Error(error.message || 'Failed to create payment intent');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      amount: data.amount,
      currency: data.currency,
    };
  },

  /**
   * Create a payment intent for checkout (simplified version without sale ID)
   */
  async createCheckoutPaymentIntent(
    companyId: string,
    storeId: string,
    amount: number,
    customerId?: string,
    description?: string
  ): Promise<PaymentIntentResult> {
    const supabase = getSupabaseClient();

    // Call Edge Function with minimal params
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount,
        customerId,
        description: description || 'Beauty Salon Payment',
        metadata: {
          company_id: companyId,
          store_id: storeId,
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to create payment intent');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      amount: data.amount,
      currency: data.currency,
    };
  },

  /**
   * Record a successful card payment
   */
  async recordCardPayment(
    saleId: string,
    paymentIntentId: string,
    amount: number
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // Update sale payment record
    const { error } = await supabase
      .from('sale_payments')
      .update({
        stripe_payment_intent_id: paymentIntentId,
        status: 'completed',
      })
      .eq('sale_id', saleId)
      .eq('payment_method', 'card');

    if (error) {
      console.error('Failed to update payment record:', error);
    }
  },

  /**
   * Handle Stripe webhook events (called from Edge Function)
   */
  async handleWebhookEvent(event: {
    type: string;
    data: { object: Record<string, unknown> };
  }): Promise<{ received: boolean }> {
    const supabase = getSupabaseClient();

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const saleId = paymentIntent.metadata?.sale_id as string | undefined;

        if (saleId) {
          await supabase
            .from('sale_payments')
            .update({
              status: 'completed',
              paid_at: new Date().toISOString(),
            })
            .eq('sale_id', saleId)
            .eq('stripe_payment_intent_id', paymentIntent.id);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const saleId = paymentIntent.metadata?.sale_id as string | undefined;

        if (saleId) {
          await supabase
            .from('sale_payments')
            .update({
              status: 'failed',
              error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
            })
            .eq('sale_id', saleId)
            .eq('stripe_payment_intent_id', paymentIntent.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          // Get the sale payment
          const { data: payment } = await supabase
            .from('sale_payments')
            .select('sale_id, amount')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .single();

          if (payment) {
            // Update payment status
            await supabase
              .from('sale_payments')
              .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
              })
              .eq('stripe_payment_intent_id', paymentIntentId);

            // Update sale if fully refunded
            const refundedAmount = (charge.amount_refunded as number) || 0;
            if (refundedAmount >= payment.amount) {
              await supabase
                .from('sales')
                .update({
                  status: 'refunded',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', payment.sale_id);
            }
          }
        }
        break;
      }
    }

    return { received: true };
  },

  /**
   * Initiate a refund for a payment
   */
  async initiateRefund(
    saleId: string,
    amount?: number,
    reason?: string
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    const supabase = getSupabaseClient();

    // Get the payment intent ID
    const { data: payment, error: fetchError } = await supabase
      .from('sale_payments')
      .select('stripe_payment_intent_id, amount')
      .eq('sale_id', saleId)
      .eq('payment_method', 'card')
      .single();

    if (fetchError || !payment?.stripe_payment_intent_id) {
      return {
        success: false,
        error: 'Card payment not found for this sale',
      };
    }

    // Call refund Edge Function
    const { data, error } = await supabase.functions.invoke('stripe-refund', {
      body: {
        paymentIntentId: payment.stripe_payment_intent_id,
        amount: amount || payment.amount,
        reason: reason || 'requested_by_customer',
        saleId,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      refundId: data.refundId,
    };
  },

  /**
   * Get Stripe publishable key for client-side usage
   */
  async getPublishableKey(companyId: string): Promise<string | null> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('companies')
      .select('settings')
      .eq('id', companyId)
      .single();

    if (!data?.settings) return null;

    const settings = data.settings as Record<string, unknown>;
    const integrations = settings.integrations as Record<string, { publishable_key?: string }> | undefined;

    return integrations?.stripe?.publishable_key || null;
  },

  /**
   * Calculate and return payment fees
   */
  calculateFees(amount: number): {
    processingFee: number;
    netAmount: number;
    feePercentage: number;
  } {
    // Stripe Japan typically charges 3.6% for card payments
    const feePercentage = 3.6;
    const processingFee = Math.ceil(amount * (feePercentage / 100));
    const netAmount = amount - processingFee;

    return {
      processingFee,
      netAmount,
      feePercentage,
    };
  },
};
