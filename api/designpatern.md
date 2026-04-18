```markdown
# Backend Architecture Design (Pragmatic Production Guide)

Tài liệu này định nghĩa kiến trúc backend cho hệ thống modular monolith, tối ưu cho **ecommerce workflow phức tạp (orders, payments, inventory, notifications)** với mục tiêu:

- Giảm coupling giữa các module core
- Đảm bảo consistency qua event/outbox pattern
- Tránh over-engineering nhưng vẫn giữ khả năng scale
- Tối ưu maintainability cho team nhỏ–vừa

---

# 1. Architectural Style

Hệ thống sử dụng kết hợp:

- **Modular Monolith (Domain-based modules)**
- **Layered Architecture (Controller → Application → Domain → Repository)**
- **Internal Event-driven workflow (Outbox pattern)**

### Flow tổng thể:

```

Controller
↓
Application Service (Use-case / Orchestration)
↓
Domain Service (Business rules)
↓
Repository (Data access)
↓
Database

```

---

# 2. Modular Structure (Domain-first)

Code tổ chức theo domain, không theo technical layer:

```

src/modules/
├── auth/
├── user/
├── product/
├── order/
├── payment/
├── inventory/
├── notification/

```

### Nguyên tắc:
- Mỗi module = 1 bounded context logic
- Module có thể tách microservice sau này
- Không cross-import logic trực tiếp giữa modules

---

# 3. Layer Responsibilities

## 3.1 Controller Layer
- Handle HTTP request/response
- Validate input (DTO trigger)
- Không chứa business logic

---

## 3.2 Application Service (NEW - CORE LAYER)

> Lớp orchestration quan trọng nhất

### Responsibilities:
- Điều phối business flow
- Quản lý transaction boundary
- Gọi nhiều domain/service khác nhau
- Emit outbox events

### Ví dụ:
```

OrderApplicationService.placeOrder()

→ validate cart
→ reserve inventory
→ create order
→ write outbox event

````

---

## 3.3 Domain Service
- Business rules thuần (pure logic)
- Không phụ thuộc DB
- Không gọi external services

### Ví dụ:
- Order status transition rules
- Inventory calculation logic
- Pricing rules

---

## 3.4 Repository Layer
- Data access only
- Không chứa business logic
- Có thể tối ưu query/read model

---

# 4. DTO & Validation Strategy

- Input validation qua DTO layer
- Reject invalid data before entering Application layer

### Rules:
- Không dùng raw request object trong service
- Validate schema trước khi vào business flow

---

# 5. Error Handling Standard

Response format thống nhất:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
````

### Rules:

* Không expose raw error
* Map internal error → HTTP status + error code

---

# 6. Authentication & Authorization

* JWT (Access + Refresh Token)
* RBAC + Permission-based access

### Rules:

* Auth handled in middleware
* Không xử lý auth trong controller/service
* Authorization enforced at guard/middleware level

---

# 7. Middleware & Cross-cutting Concerns

Middleware sử dụng cho:

* Authentication
* Authorization
* Logging
* Request tracing
* Validation pre-check

---

# 8. Configuration Management

* `.env` cho toàn bộ config
* Strict validation khi startup

### Rules:

* Không hardcode secret
* Fail-fast nếu thiếu env quan trọng

---

# 9. Logging & Observability

## Log events:

* Auth events (login/logout)
* Order/payment lifecycle
* Errors & failures

## Rules:

* Không log sensitive data
* Có correlationId / requestId

---

# 10. Database Design Principles

* UUID primary key
* `created_at`, `updated_at` bắt buộc
* Soft delete (`deleted_at`)

### Transaction rules:

* Chỉ Application layer được quản lý transaction boundary
* Không transaction trong domain layer

---

# 11. API Design Principles

* RESTful standard
* Use plural nouns:

```
/users
/products
/orders
```

### Rules:

* Không dùng verb trong endpoint
* HTTP method thể hiện action

---

# 12. Scalability Strategy

## System design hướng tới:

* Stateless API
* Horizontal scaling ready
* Cache layer (Redis optional)
* Background processing (Queue/Worker)

---

# 13. Event-driven Internal Architecture (OUTBOX PATTERN)

## Core principle:

> Không gọi cross-module sync logic trực tiếp

---

## Flow:

```
API Request
   ↓
DB Transaction
   ↓
Write Outbox Event
   ↓
Worker Processor
   ↓
Dispatch events (payment / notification / fulfillment)
```

---

## Outbox Event Structure:

* id
* aggregate_id
* event_type
* payload
* status (PENDING / PROCESSING / DONE / FAILED)
* retry_count
* created_at

---

## Worker behavior:

* Poll PENDING events
* Process in batch
* Retry failed events
* Ensure idempotency

---

# 14. Application Flow Design (CORE MISSING PIECE FIXED)

## Example: Place Order Flow

```
OrderApplicationService.placeOrder()

1. Validate cart
2. Check inventory
3. Create order
4. Reserve stock
5. Write outbox event
6. Commit transaction
```

---

# 15. Anti Over-engineering Rules

## KHÔNG tách layer nếu:

* Logic < 150 lines
* Không reuse
* Không có clear boundary
* Chỉ phục vụ “clean architecture aesthetic”

---

## OPTIMIZATION RULE:

> Optimize for readability first, abstraction second

---

# 16. Scalability Evolution Path

Hệ thống có thể evolve theo:

### Stage 1:

Modular Monolith (current)

### Stage 2:

Event-driven internal system (outbox + workers)

### Stage 3 (optional):

Extract microservices per domain (order/payment)

---

# Conclusion

Kiến trúc này đảm bảo:

* Clean nhưng không over-engineered
* Giữ được tốc độ development
* Giảm coupling ở core business flows
* Sẵn sàng scale theo event-driven model

Tất cả module mới phải tuân theo:

> Domain-first + Application orchestration + Event-based decoupling

```

---
``` 
