import {
  PaymentNotCompletedException,
  PaymentProviderException,
} from '../exceptions/payments.exceptions.js';
import { PayPalPaymentProvider } from './paypal-payment.provider.js';

const settings = {
  baseUrl: 'https://paypal.test',
  clientId: 'client',
  clientSecret: 'secret',
  returnUrl: 'https://peakpaz.test/pagos/confirmar',
  cancelUrl: 'https://peakpaz.test/pagos/cancelado',
};

const tokenResponse = () =>
  Response.json({ access_token: 'token-1', expires_in: 3600 });

describe('PayPalPaymentProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses to start without credentials', () => {
    expect(
      () => new PayPalPaymentProvider({ ...settings, clientSecret: '' }),
    ).toThrow('PAYPAL_CLIENT_SECRET');
  });

  it('creates an order in dollars and returns the approval link', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        Response.json({
          id: 'ORDER-1',
          links: [
            { rel: 'self', href: 'https://paypal.test/self' },
            { rel: 'payer-action', href: 'https://paypal.test/approve' },
          ],
        }),
      );
    const provider = new PayPalPaymentProvider(settings);

    const order = await provider.createOrder({
      reference: 'PP-AAAA2222',
      description: 'Peak Paz PP-AAAA2222',
      amount: 21.55,
      currency: 'USD',
      requestId: 'payment-1',
    });

    expect(order).toEqual({
      orderId: 'ORDER-1',
      approveUrl: 'https://paypal.test/approve',
    });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://paypal.test/v2/checkout/orders');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-1');
    expect(headers['PayPal-Request-Id']).toBe('payment-1');
    const body = JSON.parse(init.body as string) as {
      purchase_units: { amount: { value: string; currency_code: string } }[];
    };
    expect(body.purchase_units[0].amount).toEqual({
      currency_code: 'USD',
      value: '21.55',
    });
  });

  it('captures the order, reads the fee and reuses the token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        Response.json({
          id: 'ORDER-1',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-1',
                    status: 'COMPLETED',
                    seller_receivable_breakdown: {
                      paypal_fee: { value: '1.46' },
                    },
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: 'REFUND-1', status: 'COMPLETED' }),
      );
    const provider = new PayPalPaymentProvider(settings);

    await expect(
      provider.captureOrder('ORDER-1', 'payment-1'),
    ).resolves.toEqual({
      captureId: 'CAPTURE-1',
      fee: 1.46,
    });
    await expect(
      provider.refund({
        captureId: 'CAPTURE-1',
        amount: 21.55,
        currency: 'USD',
        requestId: 'refund-1',
      }),
    ).resolves.toEqual({ refundId: 'REFUND-1', completed: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('reports a declined or unapproved payment', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response('{}', { status: 422 }));
    const provider = new PayPalPaymentProvider(settings);

    await expect(provider.captureOrder('ORDER-1', 'payment-1')).rejects.toThrow(
      PaymentNotCompletedException,
    );
  });

  it('reports the provider as unavailable on other errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('down', { status: 503 }),
    );
    const provider = new PayPalPaymentProvider(settings);

    await expect(provider.captureOrder('ORDER-1', 'payment-1')).rejects.toThrow(
      PaymentProviderException,
    );
  });
});
