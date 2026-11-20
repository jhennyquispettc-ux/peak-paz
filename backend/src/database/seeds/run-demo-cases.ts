import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module.js';
import { addDays } from '../../common/time/la-paz-time.js';
import { todayInLaPaz } from '../../common/verification/verification-documents.js';
import { AppConfig } from '../../config/app.config.js';
import { Agency } from '../../modules/agencies/entities/agency.entity.js';
import { PasswordService } from '../../modules/auth/services/password.service.js';
import { BookingStatus } from '../../modules/bookings/bookings.enums.js';
import { Booking } from '../../modules/bookings/entities/booking.entity.js';
import { BookingRequestsService } from '../../modules/bookings/services/booking-requests.service.js';
import { GuideBookingsService } from '../../modules/bookings/services/guide-bookings.service.js';
import { ReschedulesService } from '../../modules/bookings/services/reschedules.service.js';
import { AgencyDeparturesService } from '../../modules/group-departures/services/agency-departures.service.js';
import { DeparturesService } from '../../modules/group-departures/services/departures.service.js';
import { GuideProfile } from '../../modules/guides/entities/guide-profile.entity.js';
import { GuideRoute } from '../../modules/guides/entities/guide-route.entity.js';
import { VerificationStatus } from '../../common/enums/verification-status.enum.js';
import { GuideDocumentType } from '../../modules/guides/guides.enums.js';
import { GuideAvailabilityService } from '../../modules/guides/services/guide-availability.service.js';
import { GuideProfilesService } from '../../modules/guides/services/guide-profiles.service.js';
import { BookingCancellationService } from '../../modules/payments/services/booking-cancellation.service.js';
import { BookingCompletionService } from '../../modules/payments/services/booking-completion.service.js';
import { BookingPaymentsService } from '../../modules/payments/services/booking-payments.service.js';
import { ComplaintsService } from '../../modules/payments/services/complaints.service.js';
import { ReviewsService } from '../../modules/reviews/services/reviews.service.js';
import { Route } from '../../modules/routes/entities/route.entity.js';
import { CancellationReviewsService } from '../../modules/strikes/services/cancellation-reviews.service.js';
import { CancellationDecision } from '../../modules/strikes/strikes.enums.js';
import { User } from '../../modules/users/entities/user.entity.js';
import {
  Language,
  UserRole,
  UserStatus,
} from '../../modules/users/users.enums.js';
import { seedDemoRoutes } from './demo-routes.seed.js';

const DOMAIN = 'demo.peakpaz.local';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'PeakPazDemo2026!';
const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const HOUR = 60 * 60_000;
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

interface Person {
  id: string;
  email: string;
}

const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['error', 'warn'],
});

try {
  const config = app.get(AppConfig);
  if (config.isProduction || !LOCAL_HOSTS.includes(config.db.host)) {
    throw new Error(
      'Los casos de demostración solo se crean en una base de datos local.',
    );
  }
  const db = app.get(DataSource);
  const users = db.getRepository(User);
  if (await users.exists({ where: { email: `rosa.mamani@${DOMAIN}` } })) {
    console.log('Los casos de demostración ya existen. No se creó nada nuevo.');
  } else {
    await createCases(db);
  }
} finally {
  await app.close();
}

async function createCases(db: DataSource): Promise<void> {
  const passwords = app.get(PasswordService);
  const requests = app.get(BookingRequestsService);
  const guideBookings = app.get(GuideBookingsService);
  const payments = app.get(BookingPaymentsService);
  const cancellations = app.get(BookingCancellationService);
  const completion = app.get(BookingCompletionService);
  const reviews = app.get(ReviewsService);
  const complaints = app.get(ComplaintsService);
  const reschedules = app.get(ReschedulesService);
  const cancellationReviews = app.get(CancellationReviewsService);
  const profiles = app.get(GuideProfilesService);
  const availability = app.get(GuideAvailabilityService);
  const agencyDepartures = app.get(AgencyDeparturesService);
  const departures = app.get(DeparturesService);
  const today = todayInLaPaz();

  await seedDemoRoutes(db);
  const routes = db.getRepository(Route);
  const valley = await routes.findOneByOrFail({
    slug: 'valle-de-las-animas-medio-dia',
  });
  const tooth = await routes.findOneByOrFail({ slug: 'muela-del-diablo' });
  const admin = await db
    .getRepository(User)
    .findOneByOrFail({ role: UserRole.ADMIN });

  const passwordHash = await passwords.hash(PASSWORD);
  const person = async (
    local: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    language = Language.ES,
    country: string | null = 'BO',
  ): Promise<Person> => {
    const users = db.getRepository(User);
    const user = await users.save(
      users.create({
        email: `${local}@${DOMAIN}`,
        passwordHash,
        firstName,
        lastName,
        phone: '+591 70000000',
        country,
        language,
        role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      }),
    );
    return { id: user.id, email: user.email };
  };

  const guide = async (
    local: string,
    firstName: string,
    lastName: string,
    nationalId: string,
  ): Promise<Person & { profileId: string }> => {
    const user = await person(local, firstName, lastName, UserRole.GUIDE);
    const repository = db.getRepository(GuideProfile);
    const profile = await repository.save(
      repository.create({
        userId: user.id,
        nationalId,
        bioEs: `${firstName} guía rutas de La Paz desde hace varios años.`,
        languages: ['es', 'en'],
        yearsExperience: 6,
      }),
    );
    for (const type of Object.values(GuideDocumentType)) {
      await profiles.uploadDocument(
        user.id,
        { type, expiresAt: addDays(today, 365) },
        {
          originalname: `${type.toLowerCase()}.pdf`,
          mimetype: 'application/pdf',
          size: PDF.length,
          buffer: PDF,
        },
      );
    }
    await repository.update(
      { id: profile.id },
      {
        verificationStatus: VerificationStatus.APPROVED,
        verifiedById: admin.id,
        verifiedAt: new Date(),
      },
    );
    for (const route of [valley, tooth]) {
      await db.getRepository(GuideRoute).save({
        guideProfileId: profile.id,
        routeId: route.id,
        status: VerificationStatus.APPROVED,
      });
    }
    await availability.setSlots(
      user.id,
      [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        timeFrom: '05:00',
        timeTo: '11:00',
      })),
    );
    return { ...user, profileId: profile.id };
  };

  const rosa = await guide('rosa.mamani', 'Rosa', 'Mamani', '6543210');
  const carlos = await guide('carlos.quispe', 'Carlos', 'Quispe', '7654321');
  const lucia = await person(
    'lucia.torres',
    'Lucía',
    'Torres',
    UserRole.TOURIST,
  );
  const emma = await person(
    'emma.weber',
    'Emma',
    'Weber',
    UserRole.TOURIST,
    Language.EN,
    'DE',
  );
  const agencyUser = await person(
    'andes.trek',
    'Marco',
    'Choque',
    UserRole.AGENCY,
  );
  await db.getRepository(Agency).save(
    db.getRepository(Agency).create({
      userId: agencyUser.id,
      legalName: 'Andes Trek Demo S.R.L.',
      taxId: '9000000017',
      operatorLicense: 'RNT-LP-DEMO',
      association: 'ASOGUIA La Paz',
      address: 'Calle Sagárnaga 300, La Paz',
      verificationStatus: VerificationStatus.APPROVED,
      verifiedById: admin.id,
      verifiedAt: new Date(),
    }),
  );

  const book = async (
    tourist: Person,
    guideOf: Person & { profileId: string },
    route: Route,
    daysAhead: number,
    paid: boolean,
  ): Promise<string> => {
    const created = await requests.create(tourist.id, {
      routeId: route.id,
      guideProfileId: guideOf.profileId,
      tourDate: addDays(today, daysAhead),
      startTime: route.startTimeFrom.slice(0, 5),
      peopleCount: 2,
    });
    if (!paid) return created.id;
    await guideBookings.accept(guideOf.id, created.id);
    const started = await payments.start(tourist.id, created.id, '127.0.0.1');
    await payments.capture(tourist.id, created.id, started.id);
    return created.id;
  };

  const finishTour = async (
    bookingId: string,
    touristConfirmed: boolean,
  ): Promise<void> => {
    const ended = new Date(Date.now() - 26 * HOUR);
    await db.getRepository(Booking).update(
      { id: bookingId },
      {
        tourDate: addDays(today, -2),
        endsAt: ended,
        status: BookingStatus.IN_PROGRESS,
        reconfirmedAt: new Date(ended.getTime() - 48 * HOUR),
        guideStartedAt: new Date(ended.getTime() - 4 * HOUR),
        guideStartLatitude: -16.528,
        guideStartLongitude: -68.04,
        guideStartDistanceM: 60,
        touristStartedAt: touristConfirmed
          ? new Date(ended.getTime() - 4 * HOUR)
          : null,
      },
    );
  };

  console.log('Creando reservas de demostración...');
  await book(lucia, rosa, valley, 10, false);

  const rescheduled = await book(emma, rosa, tooth, 12, true);
  await reschedules.propose(rosa.id, rescheduled, {
    newDate: addDays(today, 14),
    reason: 'Pronóstico de lluvia fuerte para la fecha original',
  });

  const reviewed = await book(lucia, rosa, valley, 20, true);
  const complained = await book(emma, rosa, tooth, 22, true);
  const disputed = await book(lucia, rosa, tooth, 24, true);
  await finishTour(reviewed, true);
  await finishTour(complained, true);
  await finishTour(disputed, false);
  await completion.completeFinished(new Date());
  await reviews.create(lucia.id, reviewed, {
    rating: 5,
    comment:
      'Rosa conoce cada tramo del Valle de las Ánimas y nos cuidó mucho con la altura.',
  });
  await complaints.open(
    emma.id,
    complained,
    'The guide left the group alone on the way down and we arrived after dark.',
  );

  const cancelledByRosa = await book(lucia, rosa, valley, 26, true);
  await cancellations.cancelByGuide(
    rosa.id,
    cancelledByRosa,
    'Tengo fiebre alta y el médico me indicó reposo',
    false,
  );

  for (const daysAhead of [16, 18]) {
    const bookingId = await book(emma, carlos, valley, daysAhead, true);
    const result = await cancellations.cancelByGuide(
      carlos.id,
      bookingId,
      'Me salió otro trabajo para esa fecha',
      false,
    );
    await cancellationReviews.resolve(admin.id, result.reviewId!, {
      decision: CancellationDecision.STRIKE,
      resolution: 'Cancelación sin causa justificada.',
    });
  }

  const departure = await agencyDepartures.create(agencyUser.id, {
    routeId: valley.id,
    departureDate: addDays(today, 15),
    meetingTime: valley.startTimeFrom.slice(0, 5),
    meetingPoint: 'Plaza San Francisco',
    pricePerPerson: 150,
    maxPeople: 8,
    guideName: 'Juan Mamani',
  });
  for (const tourist of [lucia, emma]) {
    const joined = await departures.join(tourist.id, departure.id, 2);
    const started = await payments.start(tourist.id, joined.id, '127.0.0.1');
    await payments.capture(tourist.id, joined.id, started.id);
  }

  console.log('');
  console.log('Casos de demostración listos. Cuentas creadas:');
  console.log(
    `  Guía con reseña, reclamo, disputa y cambio de fecha: ${rosa.email}`,
  );
  console.log(`  Guía oculto con 2 strikes: ${carlos.email}`);
  console.log(`  Turista en español: ${lucia.email}`);
  console.log(`  Turista en inglés: ${emma.email}`);
  console.log(`  Agencia con salida grupal: ${agencyUser.email}`);
  console.log(
    '  Contraseña: el valor de DEMO_PASSWORD o, si no está definido, la contraseña de demostración del script.',
  );
  console.log(
    '  Administrador: el de SEED_ADMIN_EMAIL, con disputa, reclamo y cancelación pendientes.',
  );
}
