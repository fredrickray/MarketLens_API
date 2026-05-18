import { Module } from '@nestjs/common';
import { NewsIntegrationModule } from '../../integrations/news/news.module';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [NewsIntegrationModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
