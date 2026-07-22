import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateCardDto } from 'src/models/DTO/create-card.dto';
import { CardsService } from './cards.service';
import type { UUID } from 'crypto';
import type { Card } from 'src/models/interface/card.interface';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  getCards(): Card[] {
    return this.cardsService.findAll();
  }

  @Get(':id')
  getCard(@Param('id') id: UUID): Card | undefined {
    return this.cardsService.findOne(id);
  }

  @Post()
  createCard(@Body() createCardDto: CreateCardDto) {
    return this.cardsService.create(createCardDto);
  }
}
