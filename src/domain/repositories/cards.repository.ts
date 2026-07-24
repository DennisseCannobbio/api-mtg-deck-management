import { Card } from '@domain/entities/card';
import { UUID } from 'crypto';

export interface CardsRepository {
  findAll(): Card[];
  findById(id: UUID): Card | undefined;
  create(card: Card): Card;
  update(card: Card): Card;
}

export const CARDS_REPOSITORY = Symbol('CARDS_REPOSITORY');
