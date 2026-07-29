import {
  CARDS_REPOSITORY,
  type CardsRepository,
} from '@cards/domain/repositories/cards.repository';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateCardDto } from '../dto/update-card.dto';
import { UUID } from 'crypto';
import { Card } from '@cards/domain/entities/card';

@Injectable()
export class UpdateCardUseCase {
  constructor(
    @Inject(CARDS_REPOSITORY)
    private readonly cardRepository: CardsRepository,
  ) {}

  execute(id: UUID, updateCardDto: UpdateCardDto): Card {
    const existingCard = this.cardRepository.findById(id);

    //! Por ahora throw temporal cuando no existe la carta, luego agregar middleware de manejo de excepciones.
    if (!existingCard) throw new Error(`No existe la carta con id: ${id}`);

    const updatedCard = new Card({
      ...existingCard,
      ...updateCardDto,
      updatedAt: new Date(),
      updatedBy: 'System',
    });

    return this.cardRepository.update(updatedCard);
  }
}
