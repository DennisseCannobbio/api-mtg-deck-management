import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateCardDto } from 'src/models/DTO/create-card.dto';

@Controller('cards')
export class CardsController {
  @Get()
  getCards(): string {
    return 'All the cards';
  }

  @Get(':id')
  getCard(@Param('id') id: string): string {
    return `'Card with id: ${id}'`;
  }

  @Post()
  createCard(@Body() createCardDto: CreateCardDto) {
    return createCardDto;
  }
}
