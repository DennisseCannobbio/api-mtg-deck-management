import { Injectable } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { CreateCardDto } from 'src/models/DTO/create-card.dto';
import { Card } from 'src/models/interface/card.interface';

@Injectable()
export class CardsService {
  private readonly cards: Card[] = [];

  findAll(): Card[] {
    return this.cards;
  }

  findOne(id: UUID): Card | undefined {
    // * Cuando no encuentre nada, lanzar excepcion => Para el futuro.
    return this.cards.find((c) => c.id === id);
  }

  create(createCardDto: CreateCardDto): Card {
    const uuid = randomUUID();
    const cardToCreate: Card = {
      id: uuid,
      ...createCardDto,
      createdAt: new Date(),
      createdBy: 'System',
    };

    this.cards.push(cardToCreate);
    return cardToCreate;
  }
}
