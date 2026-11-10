import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/users.enums.js';
import { InsufficientRoleException } from '../exceptions/auth.exceptions.js';
import { RolesGuard } from './roles.guard.js';

function contextFor(role?: UserRole): ExecutionContext {
  const user = role ? { id: 'user-id', email: 'a@b.bo', role } : undefined;
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the request through when the route requires no role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(contextFor(UserRole.TOURIST))).toBe(true);
  });

  it('lets the request through when the user has a required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(contextFor(UserRole.ADMIN))).toBe(true);
  });

  it('blocks a user whose role is not listed', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contextFor(UserRole.TOURIST))).toThrow(
      InsufficientRoleException,
    );
  });

  it('blocks a request without an authenticated user', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(contextFor())).toThrow(
      InsufficientRoleException,
    );
  });
});
