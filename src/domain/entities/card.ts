import { CardColor } from '@enums/card-color.enum';
import { CardRarity } from '@enums/card-rarity.enum';
import { CardSuperType } from '@enums/card-super-type.enum';
import { CardType } from '@enums/card-type.enum';
import { UUID } from 'crypto';

export class Card {
  readonly id!: UUID;
  readonly name!: string;
  readonly color!: CardColor[];
  readonly manaValue!: number;
  readonly type!: CardType[];
  readonly superType!: CardSuperType;
  readonly rarity!: CardRarity;
  readonly setCode!: string;
  readonly rules!: string;
  readonly power?: string;
  readonly toughness?: string;
  readonly createdAt!: Date;
  readonly createdBy!: string;
  readonly updatedAt?: Date;
  readonly updatedBy?: string;

  constructor(params: {
    id: UUID;
    name: string;
    color: CardColor[];
    manaValue: number;
    type: CardType[];
    superType: CardSuperType;
    rarity: CardRarity;
    setCode: string;
    rules: string;
    power?: string;
    toughness?: string;
    createdAt: Date;
    createdBy: string;
    updatedAt?: Date;
    updatedBy?: string;
  }) {
    //! Aca dejamos Guard Clauses que se lanzan si se viola una invariante
    // * Invariante => regla que SIEMPRE se cumple durante toda la vida del objeto, desde que nace.
    // * Por ejemplo, que no tenga mana negativo la carta, o que exista un color o colorless.

    if (params.manaValue < 0)
      throw new Error('No puede existir una carta con mana negativo');

    if (params.color.length === 0)
      throw new Error('Debes ingresar un color para una carta o colorless');

    if (
      params.color.length > 1 &&
      params.color.some((c) => c === CardColor.Colorless)
    )
      throw new Error(
        'No puede existir una carta Colorless y con color a la vez.',
      );

    Object.assign(this, params);
  }

  public isMulticolor(): boolean {
    return this.color.length > 1;
  }

  public isCreature(): boolean {
    return this.type.includes(CardType.Creature);
  }

  public isLegendary(): boolean {
    return this.superType === CardSuperType.Legendary;
  }
}
