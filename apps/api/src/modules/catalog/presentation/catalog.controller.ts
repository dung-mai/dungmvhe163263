import { Controller, Get, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import {
  ApiPropertyOptional,
  ApiTags,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { GetProduct, ListCategories, ListProducts } from '../application/catalog.use-cases';
import { productSchema, listSchema, categorySchema } from './catalog.openapi';
export class CatalogQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
  @ApiPropertyOptional({ default: 12, maximum: 48 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  limit = 12;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[a-z0-9-]+$/) @MaxLength(80) category?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[a-z0-9-]+$/) @MaxLength(80) collection?: string;
}
@ApiTags('Catalog')
@Controller()
export class CatalogController {
  constructor(
    private readonly list: ListProducts,
    private readonly detail: GetProduct,
    private readonly categoriesQuery: ListCategories,
  ) {}
  @ApiOkResponse({ schema: listSchema })
  @ApiBadRequestResponse({ description: 'Invalid or unknown query parameter' })
  @Get('products')
  products(@Query() query: CatalogQueryDto) {
    return this.list.execute(query);
  }
  @ApiOkResponse({ schema: productSchema })
  @ApiNotFoundResponse({ description: 'Product not found or inactive' })
  @Get('products/:slug')
  product(@Param('slug') slug: string) {
    return this.detail.execute(slug);
  }
  @ApiOkResponse({ schema: { type: 'array', items: categorySchema } })
  @Get('categories')
  categories() {
    return this.categoriesQuery.execute();
  }
}
