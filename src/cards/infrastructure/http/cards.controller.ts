import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateCardDto } from '@cards/application/dto/create-card.dto';
import type { UUID } from 'crypto';
import { CreateCardUseCase } from '@cards/application/use-cases/create-card.use-case';
import { FindAllCardsUseCase } from '@cards/application/use-cases/find-all-cards.use-case';
import { FindCardByIdUseCase } from '@cards/application/use-cases/find-card-by-id.use-case';
import { UpdateCardUseCase } from '@cards/application/use-cases/update-card.use-case';
import { UpdateCardDto } from '@cards/application/dto/update-card.dto';
import { Card } from '@cards/domain/entities/card';

@Controller('cards')
export class CardsController {
  constructor(
    private readonly createCardUseCase: CreateCardUseCase,
    private readonly findAllCardsUseCase: FindAllCardsUseCase,
    private readonly findCardByIdUseCase: FindCardByIdUseCase,
    private readonly updateCardUseCase: UpdateCardUseCase,
  ) {}

  @Get()
  getCards(): Card[] {
    return this.findAllCardsUseCase.execute();
  }

  @Get(':id')
  getCard(@Param('id') id: UUID): Card | undefined {
    return this.findCardByIdUseCase.execute(id);
  }

  @Post()
  createCard(@Body() createCardDto: CreateCardDto) {
    return this.createCardUseCase.execute(createCardDto);
  }

  @Patch(':id')
  updateCard(@Param('id') id: UUID, @Body() updateCardDto: UpdateCardDto) {
    return this.updateCardUseCase.execute(id, updateCardDto);
  }
}
