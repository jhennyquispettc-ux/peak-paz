import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity.js';
import { Refund } from '../entities/refund.entity.js';
import { PaymentStatus } from '../payments.enums.js';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Refund) private readonly refunds: Repository<Refund>,
  ) {}

  private paymentRepo(manager?: EntityManager): Repository<Payment> {
    return manager?.getRepository(Payment) ?? this.payments;
  }

  createPayment(data: Partial<Payment>): Payment {
    return this.payments.create(data);
  }

  savePayment(payment: Payment, manager?: EntityManager): Promise<Payment> {
    return this.paymentRepo(manager).save(payment);
  }

  findPayment(
    id: string,
    bookingId: string,
    manager?: EntityManager,
  ): Promise<Payment | null> {
    return this.paymentRepo(manager).findOne({ where: { id, bookingId } });
  }

  findByBooking(bookingId: string): Promise<Payment[]> {
    return this.payments.find({
      where: { bookingId },
      order: { createdAt: 'DESC' },
    });
  }

  findCaptured(
    bookingId: string,
    manager: EntityManager,
  ): Promise<Payment | null> {
    return this.paymentRepo(manager).findOne({
      where: { bookingId, status: PaymentStatus.CAPTURED },
    });
  }

  async voidPending(bookingId: string, manager?: EntityManager): Promise<void> {
    await this.paymentRepo(manager).update(
      { bookingId, status: PaymentStatus.PENDING },
      { status: PaymentStatus.VOIDED },
    );
  }

  saveRefund(data: Partial<Refund>, manager: EntityManager): Promise<Refund> {
    const repository = manager.getRepository(Refund);
    return repository.save(repository.create(data));
  }
}
