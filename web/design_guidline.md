```markdown
# Frontend Design Pattern Overview (Pragmatic Senior Frontend Guide)

Tài liệu này định nghĩa kiến trúc frontend cho website local brand thời trang, tối ưu cho:

- UI nhất quán toàn hệ thống
- Dễ scale feature (collection, product, campaign)
- Giảm duplicate logic giữa pages
- Tách rõ UI / state / data fetching
- Tối ưu maintainability cho team nhỏ–vừa

---

# 1. Frontend Architecture Style

Hệ thống sử dụng:

- **Component-based architecture**
- **Page → Section → Component hierarchy**
- **Data-driven rendering (API-first UI)**
- **Feature-based folder structure**

---

## UI hierarchy:

```

Page
├── Sections (layout blocks)
│     ├── Components
│     ├── Components
│     └── Components
└── Shared UI Components

```

---

# 2. Page Layout Structure (GLOBAL STANDARD)

Tất cả pages phải tuân theo layout chuẩn:

```

Header
Main Content
Footer

```

## 2.1 Header responsibilities:
- Logo / brand identity
- Navigation
- Search
- Cart
- User actions (auth/profile)

## 2.2 Main Content:
- Render theo page-specific sections

## 2.3 Footer:
- Brand info
- Links
- Social media

---

## Rule:
> Layout MUST be reusable, không duplicate theo page

---

# 3. Section-Based Architecture (CORE PRINCIPLE)

Mỗi page được chia thành sections độc lập:

## Common sections:

- HeroBannerSection
- CollectionSection
- ProductGridSection
- PromotionSection

---

## Rules:
- Mỗi section = 1 component độc lập
- Không chứa business logic phức tạp
- Nhận data qua props
- Có thể reuse giữa nhiều pages

---

## Example:

```

HomePage
├── HeroSection
├── CollectionSection
├── ProductHighlightSection
└── PromotionSection

```

---

# 4. Component Design Principles

## 4.1 Reusability-first

Component phải:
- reuse được ở nhiều page
- không phụ thuộc page context

---

## 4.2 Separation of concerns

### UI Component:
- chỉ render UI

### Logic layer:
- hooks / services
- không nhúng vào UI component

---

## 4.3 Core reusable components:

- Button
- Input
- Modal
- ProductCard
- CollectionCard
- Badge
- PriceDisplay

---

## Rule:
> Không tạo component chỉ dùng 1 lần nếu không có reuse plan

---

# 5. Feature-based Structure

Folder structure:

```

src/
├── features/
│    ├── product/
│    ├── cart/
│    ├── order/
│    └── auth/
├── components/
├── pages/
├── layouts/
├── hooks/
└── lib/

```

---

## Rule:
- Feature chứa logic domain
- components chứa UI reusable
- pages chỉ compose

---

# 6. Visual Design System (LOCAL BRAND STYLE)

## 6.1 Design direction:
- Minimalist
- Editorial style
- High visual focus on product images

---

## 6.2 Color system:
- White / Black / Beige base
- Accent color limited (1–2 max)

---

## 6.3 Typography:
- Clean, modern sans-serif
- Strong hierarchy (H1–H6 rõ ràng)

---

## Rule:
> UI phải “fashion editorial”, không phải marketplace UI

---

# 7. Responsive Strategy

## Breakpoints:
- Mobile first
- Tablet
- Desktop

---

## Rules:
- Layout phải fluid
- Grid system flexible
- Product grid adaptive columns

---

# 8. Interaction & UX Principles

## 8.1 Micro-interactions:
- hover product card
- image zoom / swap
- smooth transitions

---

## 8.2 CTA rules:
- rõ ràng: Shop Now / Add to Cart / View Detail
- không nhiều CTA cạnh tranh

---

## 8.3 Navigation:
- đơn giản, tối đa 2–3 levels

---

# 9. Data-driven UI (IMPORTANT)

## Rule:
> Không hardcode content trong UI

---

## Everything comes from API:
- Products
- Collections
- Banners
- Promotions

---

## UI behavior:
- render based on data shape
- fallback UI khi empty state

---

# 10. State Management Strategy

## Recommended approach:

- Local state: UI-only state
- Global state: cart / auth / user
- Server state: React Query / SWR pattern

---

## Rule:
> Không dùng global state cho data server cache nếu không cần thiết

---

# 11. API Integration Layer

## Structure:

```

lib/
├── http-client.ts
├── product-api.ts
├── cart-api.ts
└── order-api.ts

```

---

## Rules:
- centralize API calls
- normalize response format
- handle error globally

---

# 12. Performance Strategy

## Optimization rules:

- lazy load images
- code splitting by page
- memoize heavy components
- avoid unnecessary re-renders

---

# 13. Anti-pattern Rules

## ❌ Avoid:

- Duplicate page layout logic
- Component dùng 1 lần không cần thiết
- Business logic trong UI component
- Hardcoded product data
- Over-abstraction UI layer

---

## ✅ Prefer:

- composition over inheritance
- simple components
- reusable sections
- data-driven rendering

---

# 14. Scalability Strategy

Hệ thống có thể scale theo:

## Stage 1:
- Monolithic frontend (current)

## Stage 2:
- Feature isolation (cart, product, order separation)

## Stage 3 (optional):
- Micro-frontend (rare case, only if needed)

---

# Conclusion

Kiến trúc frontend này đảm bảo:

- UI nhất quán toàn hệ thống
- Dễ mở rộng feature mới
- Giảm duplication logic
- Tối ưu maintainability cho team nhỏ
- Phù hợp ecommerce/local brand scale

---

> Nguyên tắc cốt lõi:
> “Simple UI architecture, strict structure, data-driven rendering”
```

---
