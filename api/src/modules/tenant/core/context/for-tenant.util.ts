import type { FindOptionsWhere, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * TypeORM helper: add `AND alias.tenantId = :tenantId` to a query builder.
 * See repo `docs/multi-tenant-implementation-spec.md` — use on tenant-scoped list queries; pair with DB constraints.
 */
export function forTenantQb<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  tenantId: string,
): SelectQueryBuilder<T> {
  return qb.andWhere(`${alias}.tenantId = :__forTenantId`, {
    __forTenantId: tenantId,
  });
}

/**
 * Merge `tenantId` into a `find` / `findOne` where clause (shallow).
 */
export function withTenantWhere<Entity extends { tenantId: string }>(
  tenantId: string,
  where: FindOptionsWhere<Entity>,
): FindOptionsWhere<Entity> {
  return { ...where, tenantId };
}
