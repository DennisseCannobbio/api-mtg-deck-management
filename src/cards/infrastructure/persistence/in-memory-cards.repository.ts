import { Card } from '@cards/domain/entities/card';
import { CardsRepository } from '@cards/domain/repositories/cards.repository';
import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';

@Injectable()
export class InMemoryCardsRepository implements CardsRepository {
  private readonly cards: Card[] = [];

  findAll(): Card[] {
    return [...this.cards];
  }

  findById(id: UUID): Card | undefined {
    return this.cards.find((c) => c.id === id);
  }

  create(card: Card): Card {
    this.cards.push(card);
    return card;
  }

  update(card: Card): Card {
    const index = this.cards.findIndex((c) => c.id === card.id);
    if (index === -1) throw new Error(`No existe la carta con id: ${card.id}`);
    this.cards[index] = card;
    return card;
  }
}
