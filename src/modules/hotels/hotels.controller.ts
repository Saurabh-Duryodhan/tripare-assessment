import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { HotelQueryDto, HotelOfferResponseDto } from '../../common/dto/hotel-query.dto';
import { DeduplicatedHotel } from '../../common/interfaces/hotel.interface';

@ApiTags('Hotels')
@Controller('api/hotels')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({
    summary: 'Search, deduplicate and price-filter hotel offers',
    description:
      'Aggregates overlapping hotel offers from Supplier A and Supplier B via Temporal.io, deduplicates by hotel name selecting the cheapest price, and filters by price inside Redis.',
  })
  @ApiQuery({ name: 'city', required: true, description: 'City name (e.g. delhi, mumbai)', example: 'delhi' })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter', example: 5000 })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter', example: 6000 })
  @ApiQuery({ name: 'fresh', required: false, description: 'Bypass cache and force Temporal aggregation', example: false })
  @ApiResponse({
    status: 200,
    description: 'Deduplicated list of best hotel offers',
    type: [HotelOfferResponseDto],
  })
  async getHotels(@Query() query: HotelQueryDto): Promise<DeduplicatedHotel[]> {
    return this.hotelsService.searchHotels(query);
  }
}
