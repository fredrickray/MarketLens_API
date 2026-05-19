import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextService } from '../../core/context/request-context.service';
import { SecurityAuditEvent } from '../../core/enums/security-audit-event.enum';
import { SecurityAuditRepository } from './security-audit.repository';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;
  const create = jest.fn().mockResolvedValue({});

  beforeEach(async () => {
    create.mockClear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        {
          provide: SecurityAuditRepository,
          useValue: { create },
        },
        {
          provide: RequestContextService,
          useValue: { getRequestId: jest.fn().mockReturnValue('req-123') },
        },
      ],
    }).compile();

    service = module.get(SecurityAuditService);
  });

  it('persists audit events with request metadata', async () => {
    await service.log({
      event: SecurityAuditEvent.LOGIN_FAILURE,
      email: 'user@example.com',
      req: {
        requestId: 'req-abc',
        headers: { 'user-agent': 'jest' },
        ip: '127.0.0.1',
      } as never,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: SecurityAuditEvent.LOGIN_FAILURE,
        email: 'user@example.com',
        requestId: 'req-abc',
        userAgent: 'jest',
      }),
    );
  });
});
