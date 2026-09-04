import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SupplierHotel } from '../../common/interfaces/hotel.interface';
import { SUPPLIER_A_HOTELS } from './data/supplier-a.data';
import { SUPPLIER_B_HOTELS } from './data/supplier-b.data';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  // In-memory outage simulation toggles for resilience testing
  private supplierAFaulty = false;
  private supplierBFaulty = false;

  getSupplierAHotels(city?: string, fail?: boolean, delayMs?: number): SupplierHotel[] {
    if (fail || this.supplierAFaulty) {
      this.logger.warn('Supplier A outage simulation triggered');
      throw new HttpException(
        { message: 'Supplier A service unavailable', status: HttpStatus.SERVICE_UNAVAILABLE },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let results = SUPPLIER_A_HOTELS;
    if (city) {
      const normalizedCity = city.trim().toLowerCase();
      results = results.filter((h) => h.city.toLowerCase() === normalizedCity);
    }
    return results;
  }

  getSupplierBHotels(city?: string, fail?: boolean, delayMs?: number): SupplierHotel[] {
    if (fail || this.supplierBFaulty) {
      this.logger.warn('Supplier B outage simulation triggered');
      throw new HttpException(
        { message: 'Supplier B service unavailable', status: HttpStatus.SERVICE_UNAVAILABLE },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    let results = SUPPLIER_B_HOTELS;
    if (city) {
      const normalizedCity = city.trim().toLowerCase();
      results = results.filter((h) => h.city.toLowerCase() === normalizedCity);
    }
    return results;
  }

  setSupplierAFaulty(isFaulty: boolean): void {
    this.supplierAFaulty = isFaulty;
  }

  setSupplierBFaulty(isFaulty: boolean): void {
    this.supplierBFaulty = isFaulty;
  }

  checkHealth(): { supplierA: { status: string }; supplierB: { status: string } } {
    return {
      supplierA: { status: this.supplierAFaulty ? 'DOWN' : 'UP' },
      supplierB: { status: this.supplierBFaulty ? 'DOWN' : 'UP' },
    };
  }
}
