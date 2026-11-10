import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserStatus } from '../../users/users.enums.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  InvalidTokenException,
  UserSuspendedException,
} from '../exceptions/auth.exceptions.js';
import { AuthenticatedUser, JwtPayload } from '../types/authenticated-user.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
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
