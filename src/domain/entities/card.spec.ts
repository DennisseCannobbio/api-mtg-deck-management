import { CardColor } from '@enums/card-color.enum';
import { randomUUID } from 'crypto';
import { CardType } from '@enums/card-type.enum';
import { CardSuperType } from '@enums/card-super-type.enum';
import { CardRarity } from '@enums/card-rarity.enum';
import { Card } from './card';

function makeCardProps(overrides = {}) {
  return {
    id: randomUUID(),
    name: 'Card Test',
    color: [CardColor.White],
    manaValue: 3,
    type: [CardType.Creature],
    superType: CardSuperType.Basic,
    rarity: CardRarity.Common,
    setCode: 'TST',
    rules: 'Test Rules',
    power: '1',
    toughness: '1',
    createdAt: new Date(),
    createdBy: 'Test User',
    ...overrides,
  };
}

describe('Card', () => {
  it('should throw new error when mana value is negative', () => {
    expect(() => {
      new Card(makeCardProps({ manaValue: -5 }));
    }).toThrow('No puede existir una carta con mana negativo');
  });

  it('should throw new error when color is empty', () => {
    expect(() => {
      new Card(makeCardProps({ color: [] }));
    }).toThrow('Debes ingresar un color para una carta o colorless');
  });

  it('should create a valid card without throwing an error', () => {
    expect(() => {
      new Card(makeCardProps());
    }).not.toThrow();
  });

  it('should throw when Colorless is combined with another color', () => {
    expect(() => {
      new Card(
        makeCardProps({ color: [CardColor.White, CardColor.Colorless] }),
      );
    }).toThrow('No puede existir una carta Colorless y con color a la vez.');
  });

  describe('isCreature', () => {
    it('return true for a creature type', () => {
      expect(
        new Card(makeCardProps({ type: [CardType.Creature] })).isCreature(),
      ).toBe(true);
    });

    it('returns false for a non-creature type', () => {
      expect(
        new Card(makeCardProps({ type: [CardType.Instant] })).isCreature(),
      ).toBe(false);
    });
  });

  describe('isMulticolor', () => {
    it('return true when add more than one color', () => {
      expect(
        new Card(
          makeCardProps({ color: [CardColor.White, CardColor.Blue] }),
        ).isMulticolor(),
      ).toBe(true);
    });

    it('return false when add only one color', () => {
      expect(
        new Card(makeCardProps({ color: [CardColor.Red] })).isMulticolor(),
      ).toBe(false);
    });
  });

  describe('isLegendary', () => {
    it('return true for a legendary supertype', () => {
      expect(
        new Card(
          makeCardProps({ superType: CardSuperType.Legendary }),
        ).isLegendary(),
      ).toBe(true);
    });

    it('return false for a basic supertype', () => {
      expect(
        new Card(
          makeCardProps({ superType: CardSuperType.Basic }),
        ).isLegendary(),
      ).toBe(false);
    });
  });
});
