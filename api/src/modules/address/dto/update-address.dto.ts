import { PartialType } from '@nestjs/swagger';
import { AddressBaseDto } from './address-base.dto';

export class UpdateAddressDto extends PartialType(AddressBaseDto) {}
