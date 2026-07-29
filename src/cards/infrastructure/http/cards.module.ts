import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CARDS_REPOSITORY } from '@cards/domain/repositories/cards.repository';
import { InMemoryCardsRepository } from '@cards/infrastructure/persistence/in-memory-cards.repository';
import { CreateCardUseCase } from '@cards/application/use-cases/create-card.use-case';
import { FindAllCardsUseCase } from '@cards/application/use-cases/find-all-cards.use-case';
import { FindCardByIdUseCase } from '@cards/application/use-cases/find-card-by-id.use-case';
import { UpdateCardUseCase } from '@cards/application/use-cases/update-card.use-case';

@Module({
  controllers: [CardsController],
  providers: [
    {
      provide: CARDS_REPOSITORY,
      useClass: InMemoryCardsRepository,
    },
    CreateCardUseCase,
    FindAllCardsUseCase,
    FindCardByIdUseCase,
    UpdateCardUseCase,
  ],
})
export class CardsModule {}
