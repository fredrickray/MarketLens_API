import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: { role: UserRole.USER },
      }),
    }),
  } as unknown as ExecutionContext;

  it('allows when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows matching role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === ROLES_KEY ? [UserRole.USER] : undefined,
      );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies non-matching role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockImplementation((key: string) =>
        key === ROLES_KEY ? [UserRole.ADMIN] : undefined,
      );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
