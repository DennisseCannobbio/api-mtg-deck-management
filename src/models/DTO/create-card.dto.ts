import { CardColor } from '@enums/card-color.enum';
import { CardRarity } from '@enums/card-rarity.enum';
import { CardSuperType } from '@enums/card-super-type.enum';
import { CardType } from '@enums/card-type.enum';

export class CreateCardDto {
  name!: string;
  color!: CardColor[];
  manaValue!: number;
  type!: CardType[];
  superType!: CardSuperType;
  rarity!: CardRarity;
  setCode!: string;
  rules!: string;
  power?: string;
  toughness?: string;
}
