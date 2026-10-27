# Flashlab design system v1

Hai ảnh người dùng cung cấp là chuẩn bố cục và component. `/design-system` là reference chạy bằng chính component trên homepage. Không thay đổi ngôn ngữ thiết kế theo từng section.

## Tokens

Nguồn duy nhất: `apps/storefront/styles/tokens.css` (Tailwind v4 theme + shadcn semantic variables).

| Token            | Giá trị | Vai trò                                     |
| ---------------- | ------- | ------------------------------------------- |
| primary          | #cf0a49 | Search, CTA, cart button, carousel progress |
| background       | #f5f5f5 | Nền trang                                   |
| card             | #ffffff | Product/category/service cards              |
| foreground       | #171717 | Nội dung chính                              |
| muted-foreground | #717171 | Metadata                                    |
| price-sale       | #be0b43 | Giá ưu đãi                                  |
| rating           | #e5ac16 | Sao đánh giá                                |
| surface-dark     | #292929 | Surface tối                                 |
| surface-footer   | #202020 | Footer                                      |

## Hình học

Content max-width 1140px; shell 1280px; desktop có nền tối với glow đỏ/tím như reference. Main content padding 48px mỗi bên, thu nhỏ theo breakpoint. Section gap 48px, card gap 10–12px, 7 category tiles, 6 bestseller cards, 5 top-sale cards. Hero slide width 84%, hai slide bên cạnh lộ ra; radius 26px, height 340px. Category radius 12px, product 7px, control 3–6px. Shadow rất nhẹ; không thêm nhiều đường viền vào product grid.

## Typography

Arial/Helvetica/system sans, có hỗ trợ tiếng Việt và không phụ thuộc Google Fonts/network. Hero 38px, section 27px, body 14px, product title 12px, price 15px semibold, metadata 9–11px ở desktop. Hệ thống responsive điều chỉnh đồng bộ, không đặt font riêng cho từng card.

## ProductCard

Visual trắng, ảnh object-contain, badge trên trái, heart trên phải, dots dưới ảnh. Metadata nằm ngoài visual: rating/review, tên tối đa 3 dòng, giá so sánh và discount, giá bán + cart button chung hàng. Compact variant ẩn rating/dots, tên 2 dòng; featured variant dùng cùng component với vùng ảnh lớn. Button disabled khi hết hàng. Wishlist dùng aria-pressed, các icon button đều có accessible name.

## Responsive

- > =1280: shell đầy đủ và background glow.
- 768–1279: giữ mật độ nội dung, giảm khoảng cách/typography theo tỷ lệ.
- <=767: shell full-width, header 2 hàng, category cuộn ngang, grid 3 cột.
- <=420: product grid 2 cột, blog xếp dọc, footer 2 cột.
- Banner/card giữ cùng màu, spacing scale, typography hierarchy; không chuyển sang một style mobile khác.

## Khác biệt chủ đích với ảnh

Brand Flashlab, tiếng Việt/VND; ảnh sản phẩm demo thay cho nội dung gốc. Top Sales trở thành Flash sale với countdown. Hero dùng minh họa điện thoại riêng; banner quảng cáo dùng thiết bị có sẵn trong asset local. Link ngoài phạm vi mở thông tin demo rõ ràng. Newsletter chưa gửi email; tài khoản chưa xác thực; không giả lập giao dịch thành công.

## Thư viện

Tailwind CSS v4; official shadcn/ui new-york components; Radix accessibility primitives; Lucide icons; Embla carousel. Account preview dùng composition Card/centered header từ official shadcn `login-03` block, chuyển thành thông báo demo và bỏ form đăng nhập. Xem `docs/assets.md` và `THIRD_PARTY_NOTICES.md`.
