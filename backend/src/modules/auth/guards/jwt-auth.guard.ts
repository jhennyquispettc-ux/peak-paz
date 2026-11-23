import { DataSource } from 'typeorm';
import { GuideProfile } from '../../guides/entities/guide-profile.entity.js';
import { REQUIRED_GUIDE_DOCUMENTS } from '../../guides/guides.enums.js';
import { missingDocumentTypes } from '../../../common/verification/verification-documents.js';
import { ALLOW_UNVERIFIED_EMAIL } from '../decorators/allow-unverified-email.decorator.js';
import { REQUIRES_CURRENT_DOCUMENTS } from '../decorators/requires-current-documents.decorator.js';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserRole, UserStatus } from '../../users/users.enums.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  InvalidTokenException,
  UserSuspendedException,
} from '../exceptions/auth.exceptions.js';
import { AuthenticatedUser, JwtPayload } from '../types/authenticated-user.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly db: DataSource,
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly users: UsersRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);
    if (!token) throw new InvalidTokenException();

    const payload = await this.verify(token);
    const user = await this.users.findById(payload.sub);
    if (!user) throw new InvalidTokenException();
    if (user.status === UserStatus.SUSPENDED) {
      throw new UserSuspendedException();
    }

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      ALLOW_UNVERIFIED_EMAIL,
      [context.getHandler(), context.getClass()],
    );
    if (
      !allowUnverified &&
      [UserRole.TOURIST, UserRole.GUIDE].includes(user.role) &&
      !user.emailVerifiedAt
    ) {
      throw new ForbiddenException({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Confirma tu correo antes de continuar.',
      });
    }

    if (!allowUnverified && user.role === UserRole.GUIDE) {
      const guide = await this.db
        .getRepository(GuideProfile)
        .findOne({
          where: { userId: user.id },
          relations: { documents: true },
        });
      const isApproved = guide?.verificationStatus === 'APPROVED';
      if (!guide || (!isApproved && !guide.firstApprovedAt)) {
        throw new ForbiddenException({
          error: 'PROVIDER_NOT_APPROVED',
          message:
            'Completa la revisión de tus documentos antes de ofrecer servicios.',
        });
      }
      const requiresCurrentDocuments =
        this.reflector.getAllAndOverride<boolean>(REQUIRES_CURRENT_DOCUMENTS, [
          context.getHandler(),
          context.getClass(),
        ]);
      if (requiresCurrentDocuments && !isApproved) {
        throw new ForbiddenException({
          error: 'DOCUMENTS_IN_REVIEW',
          message:
            'Espera la revisión de tus documentos para aceptar solicitudes.',
        });
      }
      if (
        requiresCurrentDocuments &&
        missingDocumentTypes(REQUIRED_GUIDE_DOCUMENTS, guide.documents).length
      ) {
        throw new ForbiddenException({
          error: 'DOCUMENTS_EXPIRED',
          message: 'Renueva tus documentos para aceptar nuevas solicitudes.',
        });
      }
    }

    request.user = { id: user.id, email: user.email, role: user.role };
    return true;
  }

  private extractToken(request: Request): string | null {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' && token ? token : null;
  }

  private async verify(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new InvalidTokenException();
    }
  }
}
