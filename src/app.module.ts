import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardsModule } from './cards/infrastructure/http/cards.module';

@Module({
  imports: [CardsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
