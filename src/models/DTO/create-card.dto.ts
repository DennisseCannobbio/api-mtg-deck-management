import { CardColor } from 'src/enums/card-color.enum';
import { CardRarity } from 'src/enums/card-rarity.enum';
import { CardSuperType } from 'src/enums/card-super-type.enum';
import { CardType } from 'src/enums/card-type.enum';

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
