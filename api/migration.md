# Database Migration Guide

Tài liệu này mô tả cách tạo/chạy/revert migration cho API service (`TypeORM`).

## 1) Điều kiện cần

- Đã cài dependencies ở root: `pnpm install`
- Có file env cho API:
  - local: `api/.env.example` -> copy thành `api/.env`
  - vps: `api/.env.vps.example` -> copy thành file env tương ứng
- Database đã chạy và thông số trong env đúng:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`

## 2) Chạy migration

Từ thư mục root project:

```bash
pnpm --filter @apps/api migration:run
```

Lệnh trên tương đương chạy TypeORM CLI với datasource:
`api/src/infra/database/typeorm.config.ts`.

## 3) Revert migration gần nhất

Từ root project:

```bash
pnpm --filter @apps/api typeorm -- migration:revert
```

## 4) Tạo migration mới

Hiện script `migration:generate` trong `api/package.json` đang cố định tên output.
Khi tạo migration mới, nên chạy trực tiếp:

```bash
pnpm --filter @apps/api typeorm -- migration:generate src/infra/database/migrations/<MigrationName>
```

Ví dụ:

```bash
pnpm --filter @apps/api typeorm -- migration:generate src/infra/database/migrations/AddUserProfileFields
```

## 5) Tạo migration rỗng (manual)

Khi bạn muốn tự viết SQL:

```bash
pnpm --filter @apps/api typeorm -- migration:create src/infra/database/migrations/<MigrationName>
```

Sau đó mở file migration vừa tạo và implement `up/down`.

## 6) Kiểm tra trạng thái migration

```bash
pnpm --filter @apps/api typeorm -- migration:show
```

## 7) Best practices

- Một migration chỉ nên giải quyết một thay đổi schema rõ ràng.
- Luôn có `down()` để rollback an toàn.
- Không sửa migration đã chạy ở môi trường chung; tạo migration mới để thay đổi tiếp.
- Review SQL generated trước khi commit.
