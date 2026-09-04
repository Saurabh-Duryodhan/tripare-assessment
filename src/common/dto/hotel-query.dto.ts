import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class HotelQueryDto {
  @ApiProperty({
    description: 'City name to search hotels for (e.g. delhi, mumbai, goa)',
    example: 'delhi',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 6000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Bypass Redis cache and force fresh Temporal workflow execution',
    example: false,
  })
  @IsOptional()
  fresh?: boolean;
}

export class HotelOfferResponseDto {
  @ApiProperty({ example: 'Holtin' })
  name: string;

  @ApiProperty({ example: 5340 })
  price: number;

  @ApiProperty({ example: 'Supplier B' })
  supplier: string;

  @ApiProperty({ example: 20 })
  commissionPct: number;
}
