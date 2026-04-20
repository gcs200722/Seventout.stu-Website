## Testing Strategy (Modular Approach)

Hệ thống áp dụng chiến lược kiểm thử theo từng module (domain-based testing) nhằm đảm bảo chất lượng code và giảm rủi ro ở các thành phần quan trọng.

---

### 1. Testing Philosophy

- Test được tổ chức theo từng module (auth, user, product, order)
- Mỗi module chịu trách nhiệm coverage riêng
- Ưu tiên test **business logic (service layer)** thay vì test UI/controller đơn thuần

> Không tập trung vào coverage tổng thể, mà tập trung vào module quan trọng

---

### 2. Test Structure

Cấu trúc thư mục test:


src/modules/
├── auth/
│ ├── auth.service.ts
│ ├── auth.service.spec.ts
│ ├── auth.controller.spec.ts
├── user/
│ ├── user.service.ts
│ ├── user.service.spec.ts


---

### 3. Test Types

#### Unit Test
- Test từng function riêng lẻ  
- Mock repository / external services  
- Áp dụng chủ yếu cho service layer  

#### Integration Test
- Test flow hoàn chỉnh (login, register, order)  
- Có thể dùng test database  

---

### 4. Coverage Strategy

Coverage được thiết lập theo từng module:

- **Auth Module (Critical)**  
  - Coverage: ≥ 80%  
  - Test:
    - Login  
    - Register  
    - Token generation  
    - Refresh token  
    - Revoke token  

---

- **User Module (Medium)**  
  - Coverage: ≥ 60%  
  - Test:
    - CRUD user  
    - Update profile  

---

- **Other Modules**  
  - Coverage: ≥ 40%  
  - Test các chức năng chính  

---

### 5. Mocking Strategy

- Mock các dependency:
  - Database (repository)  
  - External API  
  - Cache (Redis)  

- Không mock:
  - Business logic chính  

---

### 6. Test Naming Convention

Đặt tên test rõ ràng theo format:


should_<expected_behavior>when<condition>


Ví dụ:

should_return_token_when_login_success
should_throw_error_when_password_invalid


---

### 7. CI/CD Integration

- Test phải chạy trong pipeline (GitHub Actions / CI)
- Fail build nếu không đạt coverage theo module
- Module critical (auth) phải pass tất cả test

---

### 8. Best Practices

- Không test controller nếu không cần thiết  
- Không test getter/setter đơn giản  
- Ưu tiên test logic quan trọng  
- Test phải độc lập, không phụ thuộc thứ tự  

---

### Conclusion

Chiến lược test theo modular giúp:

- Tập trung vào phần quan trọng (auth, business logic)  
- Dễ maintain và scale  
- Giảm rủi ro khi deploy production  

Tất cả module mới phải có test tương ứng theo chuẩn trên.