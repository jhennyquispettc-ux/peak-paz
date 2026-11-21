import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import { bookingNotice } from '../../notifications/booking-notice.js';
import { NotificationType } from '../../notifications/notifications.enums.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { bookingEndsAt, bookingStartsAt } from '../booking-schedule.js';
import { BookingStatus, TourHelpStatus } from '../bookings.enums.js';
import {
  AdminTourHelpDto,
  AdminTourHelpPageDto,
  TourHelpDto,
  TourHelpQueryDto,
} from '../dto/tour-help.dto.js';
import {
  BookingNotFoundException,
  InvalidBookingStatusException,
  TourHelpAlreadyAttendedException,
  TourHelpAlreadyOpenException,
  TourHelpNotFoundException,
  TourHelpWindowClosedException,
} from '../exceptions/bookings.exceptions.js';
import { BookingsRepository } from '../repositories/bookings.repository.js';
import { TourHelpRepository } from '../repositories/tour-help.repository.js';
import { canAskForHelp } from '../tour-checks.js';

const RUNNING = new Set([BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]);

@Injectable()
export class TourHelpService {
  constructor(
    private readonly requests: TourHelpRepository,
    private readonly bookings: BookingsRepository,
    private readonly notices: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async ask(
    touristId: string,
    bookingId: string,
    description: string,
  ): Promise<TourHelpDto> {
    const id = await this.dataSource.transaction(async (manager) => {
      await this.bookings.findForUpdate(bookingId, manager);
      const booking = await this.bookings.findDetailById(bookingId, manager);
      if (!booking || booking.touristId !== touristId) {
        throw new BookingNotFoundException();
      }
      if (!RUNNING.has(booking.status)) {
        throw new InvalidBookingStatusException(booking.status);
      }
      if (
        !canAskForHelp(
          new Date(),
          bookingStartsAt(booking),
          bookingEndsAt(booking),
        )
      ) {
        throw new TourHelpWindowClosedException();
      }
      if (await this.requests.hasOpen(booking.id, manager)) {
        throw new TourHelpAlreadyOpenException();
      }
      const help = await this.requests.create(
        { bookingId: booking.id, description },
        manager,
      );
      await this.notices.notifyAdmins(manager, NotificationType.CASE_OPENED, {
        kind: 'HELP_CASE',
        code: booking.code,
        section: 'ayuda',
      });
      return help.id;
    });
    const help = await this.requests.findById(id);
    return TourHelpDto.fromEntity(help!);
  }

  async listForTourist(
    touristId: string,
    bookingId: string,
  ): Promise<TourHelpDto[]> {
    const booking = await this.bookings.findDetailById(bookingId);
    if (!booking || booking.touristId !== touristId) {
      throw new BookingNotFoundException();
    }
    const requests = await this.requests.findByBooking(bookingId);
    return requests.map((help) => TourHelpDto.fromEntity(help));
  }

  async list(query: TourHelpQueryDto): Promise<AdminTourHelpPageDto> {
    const [requests, total] = await this.requests.findPage({
      skip: query.skip,
      take: query.limit,
      status: query.status,
    });
    return {
      data: requests.map((help) => AdminTourHelpDto.fromHelp(help)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
    };
  }

  async attend(
    adminId: string,
    id: string,
    note: string,
  ): Promise<AdminTourHelpDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.requests.lockById(id, manager);
      const help = await this.requests.findById(id, manager);
      if (!help) throw new TourHelpNotFoundException();
      if (help.status !== TourHelpStatus.OPEN) {
        throw new TourHelpAlreadyAttendedException();
      }
      help.status = TourHelpStatus.ATTENDED;
      help.adminNote = note;
      help.attendedById = adminId;
      help.attendedAt = new Date();
      await this.requests.save(help, manager);
      await this.notices.notify(
        manager,
        help.booking.touristId,
        NotificationType.HELP_ATTENDED,
        bookingNotice(help.booking, { note }),
      );
    });
    const help = await this.requests.findById(id);
    return AdminTourHelpDto.fromHelp(help!);
  }
}
