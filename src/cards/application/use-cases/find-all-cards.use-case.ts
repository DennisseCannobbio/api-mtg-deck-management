import { Card } from '@cards/domain/entities/card';
import {
  CARDS_REPOSITORY,
  type CardsRepository,
} from '@cards/domain/repositories/cards.repository';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class FindAllCardsUseCase {
  constructor(
    @Inject(CARDS_REPOSITORY)
    private readonly cardRepository: CardsRepository,
  ) {}

  execute(): Card[] {
    return this.cardRepository.findAll();
  }
}
