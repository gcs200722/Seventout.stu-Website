import { IsUUID } from 'class-validator';

export class SwitchTenantDto {
  @IsUUID()
  tenant_id: string;
}
