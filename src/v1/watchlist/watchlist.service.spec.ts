import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Watchlist } from './schemas/watchlist.schema';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  let service: WatchlistService;

  const mockDoc = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    symbols: ['AAPL'],
    save: jest.fn().mockResolvedValue(undefined),
  };

  const model = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc),
    }),
    create: jest.fn(),
    deleteOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchlistService,
        { provide: getModelToken(Watchlist.name), useValue: model },
      ],
    }).compile();

    service = module.get(WatchlistService);
  });

  it('lists symbols for authenticated user', async () => {
    const result = await service.list({
      user: { _id: mockDoc.userId } as never,
    });
    expect(result.data.symbols).toContain('AAPL');
  });
});
