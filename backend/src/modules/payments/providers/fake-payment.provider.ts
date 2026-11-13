import { randomUUID } from 'node:crypto';
import { round2 } from '../money.js';
import { PaymentNotCompletedException } from '../exceptions/payments.exceptions.js';
import {
  CapturedOrder,
  CreatedOrder,
  CreateOrderInput,
  PaymentProvider,
  RefundInput,
  RefundResult,
} from './payment-provider.js';

const FEE_PERCENT = 5.4;
const FEE_FIXED = 0.3;

export class FakePaymentProvider extends PaymentProvider {
  readonly name = 'FAKE';
  private readonly orders = new Map<string, CreateOrderInput>();

  constructor(private readonly returnUrl: string) {
    super();
  }

  createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
    const orderId = `FAKE-${randomUUID()}`;
    this.orders.set(orderId, input);
    const approveUrl = new URL(this.returnUrl);
    approveUrl.searchParams.set('token', orderId);
    return Promise.resolve({ orderId, approveUrl: approveUrl.toString() });
  }

  captureOrder(orderId: string): Promise<CapturedOrder> {
    const order = this.orders.get(orderId);
    if (!order) return Promise.reject(new PaymentNotCompletedException());
    this.orders.delete(orderId);
    return Promise.resolve({
      captureId: `FAKE-CAPTURE-${randomUUID()}`,
      fee: round2((order.amount * FEE_PERCENT) / 100 + FEE_FIXED),
    });
  }

  refund(input: RefundInput): Promise<RefundResult> {
    return Promise.resolve({
      refundId: `FAKE-REFUND-${input.requestId}`,
      completed: true,
    });
  }
}
