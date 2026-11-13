import { Logger } from '@nestjs/common';
import {
  PaymentNotCompletedException,
  PaymentProviderException,
} from '../exceptions/payments.exceptions.js';
import {
  CapturedOrder,
  CreatedOrder,
  CreateOrderInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from './payment-provider.js';

const TIMEOUT_MS = 15_000;
const TOKEN_MARGIN_MS = 60_000;
const UNPROCESSABLE = 422;

export interface PayPalSettings {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  returnUrl: string;
  cancelUrl: string;
}

interface PayPalLink {
  rel: string;
  href: string;
}

interface PayPalOrder {
  id: string;
  links?: PayPalLink[];
  purchase_units?: {
    payments?: {
      captures?: {
        id: string;
        status: string;
        seller_receivable_breakdown?: { paypal_fee?: { value: string } };
      }[];
    };
  }[];
}

export class PayPalPaymentProvider extends PaymentProvider {
  readonly name = 'PAYPAL';
  private readonly logger = new Logger(PayPalPaymentProvider.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly settings: PayPalSettings) {
    super();
    if (!settings.clientId || !settings.clientSecret) {
      throw new Error(
        'PAYMENT_DRIVER=paypal needs PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
  }

  async createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const order = await this.call<PayPalOrder>(
      'POST',
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.reference,
            description: input.description,
            amount: {
              currency_code: input.currency,
              value: input.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Peak Paz',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              return_url: this.settings.returnUrl,
              cancel_url: this.settings.cancelUrl,
            },
          },
        },
      },
      input.requestId,
    );
    const approve = order.links?.find(
      (link) => link.rel === 'payer-action' || link.rel === 'approve',
    );
    if (!approve) throw new PaymentProviderException();
    return { orderId: order.id, approveUrl: approve.href };
  }

  async captureOrder(
    orderId: string,
    requestId: string,
  ): Promise<CapturedOrder> {
    const order = await this.call<PayPalOrder>(
      'POST',
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {},
      `capture-${requestId}`,
    );
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status === 'DECLINED') {
      throw new PaymentNotCompletedException();
    }
    const fee = capture.seller_receivable_breakdown?.paypal_fee?.value;
    return { captureId: capture.id, fee: fee ? Number(fee) : null };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const refund = await this.call<{ id: string; status: string }>(
      'POST',
      `/v2/payments/captures/${encodeURIComponent(input.captureId)}/refund`,
      {
        amount: {
          currency_code: input.currency,
          value: input.amount.toFixed(2),
        },
      },
      `refund-${input.requestId}`,
    );
    return { refundId: refund.id, completed: refund.status === 'COMPLETED' };
  }

  private async call<T>(
    method: string,
    path: string,
    body: unknown,
    requestId: string,
  ): Promise<T> {
    const token = await this.accessToken();
    let response: Response;
    try {
      response = await fetch(`${this.settings.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': requestId,
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`PayPal ${path} failed: ${(error as Error).message}`);
      throw new PaymentProviderException();
    }

    if (response.status === UNPROCESSABLE) {
      throw new PaymentNotCompletedException();
    }
    if (!response.ok) {
      this.logger.warn(`PayPal ${path} answered HTTP ${response.status}`);
      throw new PaymentProviderException();
    }
    return (await response.json()) as T;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }
    const credentials = Buffer.from(
      `${this.settings.clientId}:${this.settings.clientSecret}`,
    ).toString('base64');

    let response: Response;
    try {
      response = await fetch(`${this.settings.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`PayPal token failed: ${(error as Error).message}`);
      throw new PaymentProviderException();
    }
    if (!response.ok) {
      this.logger.warn(`PayPal token answered HTTP ${response.status}`);
      throw new PaymentProviderException();
    }

    const body = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000 - TOKEN_MARGIN_MS,
    };
    return body.access_token;
  }
}
