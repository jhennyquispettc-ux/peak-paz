export interface CreateOrderInput {
  reference: string;
  description: string;
  amount: number;
  currency: string;
  requestId: string;
}

export interface CreatedOrder {
  orderId: string;
  approveUrl: string;
}

export interface CapturedOrder {
  captureId: string;
  fee: number | null;
}

export interface RefundInput {
  captureId: string;
  amount: number;
  currency: string;
  requestId: string;
}

export interface RefundResult {
  refundId: string;
  completed: boolean;
}

export abstract class PaymentProvider {
  abstract readonly name: string;

  abstract createOrder(input: CreateOrderInput): Promise<CreatedOrder>;

  abstract captureOrder(
    orderId: string,
    requestId: string,
  ): Promise<CapturedOrder>;

  abstract refund(input: RefundInput): Promise<RefundResult>;
}
