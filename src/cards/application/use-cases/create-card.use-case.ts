import { Inject, Injectable } from '@nestjs/common';
import { CreateCardDto } from '../dto/create-card.dto';
import { Card } from '@cards/domain/entities/card';
import { randomUUID } from 'crypto';
import {
  CARDS_REPOSITORY,
  type CardsRepository,
} from '@cards/domain/repositories/cards.repository';

@Injectable()
export class CreateCardUseCase {
  constructor(
    @Inject(CARDS_REPOSITORY)
    private readonly cardRepository: CardsRepository,
  ) {}

  execute(createCardDto: CreateCardDto): Card {
    const uuid = randomUUID();
    const cardToCreate = new Card({
      id: uuid,
      ...createCardDto,
      createdAt: new Date(),
      createdBy: 'System',
    });

    return this.cardRepository.create(cardToCreate);
  }
}
