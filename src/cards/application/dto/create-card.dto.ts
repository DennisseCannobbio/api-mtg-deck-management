import { CardColor } from '@cards/domain/enums/card-color.enum';
import { CardRarity } from '@cards/domain/enums/card-rarity.enum';
import { CardSuperType } from '@cards/domain/enums/card-super-type.enum';
import { CardType } from '@cards/domain/enums/card-type.enum';

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
