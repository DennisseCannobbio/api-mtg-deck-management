import { Card } from '@cards/domain/entities/card';
import {
  CARDS_REPOSITORY,
  type CardsRepository,
} from '@cards/domain/repositories/cards.repository';
import { Inject, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';

@Injectable()
export class FindCardByIdUseCase {
  constructor(
    @Inject(CARDS_REPOSITORY)
    private readonly cardsRepository: CardsRepository,
  ) {}

  execute(id: UUID): Card | undefined {
    return this.cardsRepository.findById(id);
  }
}
