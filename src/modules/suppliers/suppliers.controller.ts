import { Controller, Get, Post, Query, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { SupplierHotel } from '../../common/interfaces/hotel.interface';

@ApiTags('Mock Suppliers')
@Controller()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get('supplierA/hotels')
  @ApiOperation({ summary: 'Mock endpoint for Supplier A hotel offers' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter hotels by city (e.g. delhi)' })
  @ApiQuery({ name: 'fail', required: false, type: Boolean, description: 'Simulate supplier failure' })
  @ApiResponse({ status: 200, description: 'List of hotel offers from Supplier A' })
  @ApiResponse({ status: 503, description: 'Simulated Supplier A outage' })
  getSupplierA(
    @Query('city') city?: string,
    @Query('fail') fail?: string,
  ): SupplierHotel[] {
    const isFail = fail === 'true' || fail === '1';
    return this.suppliersService.getSupplierAHotels(city, isFail);
  }

  @Get('supplierB/hotels')
  @ApiOperation({ summary: 'Mock endpoint for Supplier B hotel offers' })
  @ApiQuery({ name: 'city', required: false, description: 'Filter hotels by city (e.g. delhi)' })
  @ApiQuery({ name: 'fail', required: false, type: Boolean, description: 'Simulate supplier failure' })
  @ApiResponse({ status: 200, description: 'List of hotel offers from Supplier B' })
  @ApiResponse({ status: 503, description: 'Simulated Supplier B outage' })
  getSupplierB(
    @Query('city') city?: string,
    @Query('fail') fail?: string,
  ): SupplierHotel[] {
    const isFail = fail === 'true' || fail === '1';
    return this.suppliersService.getSupplierBHotels(city, isFail);
  }

  @Post('suppliers/simulate-fault')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle fault injection for testing resilience & health check' })
  toggleFault(@Body() body: { supplier: 'A' | 'B'; faulty: boolean }) {
    if (body.supplier === 'A') {
      this.suppliersService.setSupplierAFaulty(body.faulty);
    } else if (body.supplier === 'B') {
      this.suppliersService.setSupplierBFaulty(body.faulty);
    }
    return {
      message: `Supplier ${body.supplier} fault status set to ${body.faulty}`,
      health: this.suppliersService.checkHealth(),
    };
  }
}
