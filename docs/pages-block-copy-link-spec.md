# Spec: Copy link của 1 block trong Pages

Tài liệu thiết kế đi kèm (lý do chọn, các phương án bị loại, sự thật đã kiểm chứng): [pages-block-copy-link-design.md](./pages-block-copy-link-design.md).

Thuật ngữ dùng trong spec:
- **Block**: một node khối trong editor có `id` ổn định do extension UniqueID gán.
- **Block link**: URL chuẩn của page cộng fragment `#<block id>`.
- **Block menu**: menu nổi mở khi bấm drag handle (⋮⋮) bên trái block.

## Problem Statement

Người dùng Plane Pages muốn chỉ cho đồng nghiệp đúng một đoạn, mục hoặc dòng trong một page dài, nhưng chỉ copy được link của cả page. Người nhận mở ra ở đầu page và phải tự cuộn đi tìm. Người chỉ có quyền xem, hoặc người đang đọc một page đã khoá hay đã lưu trữ, hoàn toàn không có thao tác nào theo block. Ai mở link khi đã hết phiên đăng nhập thì sau khi đăng nhập lại cũng mất vị trí đích.

Editor đã biết cuộn tới và tô sáng một block khi URL có `#<block id>`, nhưng không có cách nào để người dùng lấy được link đó.

## Solution

Block menu của editor trong Pages có thêm mục **"Copy link"**. Bấm vào thì link tới đúng block đó (URL chuẩn của page + `#<block id>`) được copy vào clipboard, và một toast xác nhận hiện ra. Ai mở link sẽ thấy page cuộn tới block đó và block được tô sáng cho tới khi họ bấm vào editor. Điều này đúng cả khi link được mở lúc đang ở chính page đó, và cả khi người mở phải đăng nhập trước. Người chỉ có quyền xem và page bị khoá hoặc đã lưu trữ vẫn có drag handle, nhưng Block menu của họ chỉ có "Copy link". Các editor khác (ví dụ mô tả work item) không có mục này.

## User Stories

1. Là thành viên đang sửa một page, tôi muốn có mục "Copy link" trong Block menu của một block, để chia sẻ đúng vị trí đó.
2. Là thành viên, tôi muốn link được copy trỏ tới đúng block tôi đã bấm drag handle, để người nhận không phải đoán tôi muốn nói chỗ nào.
3. Là thành viên, tôi muốn copy link của một list item hoặc task item nằm lồng trong danh sách, để chỉ tới một mục cụ thể chứ không phải cả danh sách.
4. Là thành viên, tôi muốn copy link của heading, đoạn văn, quote, code block, bảng, ảnh, callout và đường kẻ ngang, để mọi loại block đều chia sẻ được.
5. Là thành viên, tôi muốn thấy một toast xác nhận đã copy link, để biết thao tác đã thành công.
6. Là thành viên, tôi muốn thấy một toast lỗi khi trình duyệt không cho ghi clipboard, để biết là phải thử lại.
7. Là thành viên, tôi muốn toast hiển thị theo ngôn ngữ giao diện của tôi, để thông báo nhất quán với phần còn lại của Plane.
8. Là thành viên, tôi muốn Block menu tự đóng sau khi tôi bấm "Copy link", để quay lại đọc hoặc viết ngay.
9. Là thành viên, tôi muốn link luôn là URL chuẩn của page, dù tôi đang mở page qua route nào hay URL đang có query gì, để link không hỏng khi người khác mở.
10. Là người nhận link, tôi muốn page cuộn tới block đích ngay khi mở, để thấy ngay nội dung được chỉ.
11. Là người nhận link, tôi muốn block đích được tô sáng, để phân biệt nó với các block xung quanh.
12. Là người nhận link, tôi muốn phần tô sáng mất đi khi tôi bấm vào editor, để nó không cản tôi đọc hoặc sửa tiếp.
13. Là người nhận link, tôi muốn việc cuộn tới block vẫn đúng khi nội dung page được tải từ cache hoặc đồng bộ muộn, để link vẫn chạy khi mạng chậm.
14. Là người đang đọc một page, tôi muốn khi bấm hoặc dán một block link của chính page đó, page sẽ cuộn và tô sáng block mà không cần tải lại, để có thể làm "mục lục" hoặc "xem mục X" bằng block link.
15. Là người nhận link, nếu block đích đã bị xoá thì tôi muốn page vẫn mở bình thường ở đầu, để ít nhất vẫn đọc được page.
16. Là người chỉ có quyền xem page, tôi muốn có drag handle và mục "Copy link" trong Block menu, để chia sẻ một đoạn dù không sửa được.
17. Là người chỉ có quyền xem, tôi muốn Block menu chỉ có "Copy link" và không có Delete, Duplicate, AI hay các tuỳ chọn theo node, để không thấy những thao tác tôi không được phép làm.
18. Là người chỉ có quyền xem, tôi muốn không kéo thả được block, để không vô tình sửa page.
19. Là thành viên đang đọc một page đã khoá, tôi muốn vẫn copy được block link, để chia sẻ nội dung đã chốt.
20. Là thành viên đang đọc một page đã lưu trữ, tôi muốn vẫn copy được block link, để dẫn tới tài liệu cũ.
21. Là người mở block link khi chưa đăng nhập hoặc đã hết phiên, tôi muốn sau khi đăng nhập được đưa tới đúng page và đúng block, để không mất ngữ cảnh.
22. Là người đăng nhập bằng mật khẩu, mã gửi qua email, hoặc OAuth (Google, GitHub, GitLab, Gitea), tôi muốn mọi cách đăng nhập đều giữ được block đích, để trải nghiệm không phụ thuộc cách tôi đăng nhập.
23. Là người bị đẩy về trang đăng nhập do một API trả 401 trong lúc đang xem block link, tôi muốn sau khi đăng nhập lại vẫn quay về đúng block.
24. Là quản trị viên lo về bảo mật, tôi muốn việc giữ fragment qua đăng nhập không mở ra lỗ hổng open redirect, để tham số chuyển hướng vẫn chỉ trỏ về đường dẫn tương đối an toàn.
25. Là người sửa mô tả work item, tôi không muốn thấy "Copy link" trong Block menu ở đó, vì link tới URL đang mở (có thể là peek view) sẽ không đáng tin.
26. Là người dùng trên thiết bị cảm ứng, tôi chấp nhận rằng hiện chưa có Block menu nên chưa copy được block link (giới hạn hiện có, giữ nguyên).
27. Là lập trình viên tích hợp editor, tôi muốn tính năng chỉ bật khi tôi truyền handler copy link, để các nơi dùng editor khác không đổi hành vi.

## Implementation Decisions

**Editor package (`@plane/editor`)**
- Document editor nhận thêm một handler tuỳ chọn để copy block link. Handler nhận `id` của block và tự lo việc dựng URL, ghi clipboard và hiện toast. Dạng gợi ý: `onCopyBlockLink(blockId: string) => void | Promise<void>`. Tên cuối cùng do người làm chọn, miễn là theo quy ước handler hiện có.
- Block menu hiện "Copy link" chỉ khi: (a) có handler, và (b) node đang được chọn có `id` hợp lệ. Khi bấm, gọi handler với `id` đó rồi đóng menu như các mục khác.
- Node được chọn là node mà drag handle đang chọn (NodeSelection), kể cả list item hoặc task item lồng bên trong.
- Nhãn "Copy link" là chuỗi tiếng Anh cố định trong editor, giống Delete và Duplicate. Icon lấy từ bộ icon hiện có.
- Ở chế độ không editable:
  - Side menu vẫn hiện drag handle khi hover, nhưng tắt kéo thả và AI handle.
  - Block menu được render, và chỉ chứa "Copy link".
  - Không có handler thì không hiện gì, giống hiện trạng.
  - Thiết bị cảm ứng giữ nguyên: không có Block menu.
- Deep link khi mở page: logic tìm node theo `id`, dispatch meta tô sáng rồi cuộn vào giữa được tách ra để dùng ở hai nơi.
  - Lúc tải: giữ nguyên hành vi hiện có (chờ provider sync, dùng cached content).
  - Khi hash đổi trên cùng page: chạy lại cùng logic đó.
  - Listener phải được gỡ khi unmount.
  - Hash không khớp `id` nào thì không làm gì.
- Tô sáng: giữ nguyên plugin highlight hiện có, phần tô sáng mất khi editor nhận focus.
- Block đã bị xoá: không báo gì, page ở vị trí đầu.

**Web app (`apps/web`)**
- Editor body của Pages truyền handler copy block link vào document editor. Handler:
  - Dựng URL tuyệt đối từ đường dẫn chuẩn của page (handler `getRedirectionLink` hiện có) cộng `#<blockId>`.
  - Copy bằng tiện ích clipboard dùng chung trong `@plane/utils`.
  - Hiện toast thành công hoặc lỗi bằng chuỗi i18n mới trong `@plane/i18n`. Phải thêm vào mọi locale theo quy trình dịch của repo.
- Không truyền handler cho rich-text editor (mô tả work item, v.v.).
- Mọi nơi chuyển hướng về đăng nhập với `next_path` phải gồm cả fragment hiện tại (pathname + hash), được encode đúng:
  - authentication wrapper;
  - xử lý 401 trong lớp API service;
  - các nút đăng nhập OAuth (đang chuyển tiếp `next_path` tới API).
- Sau khi đăng nhập, điều hướng tới `next_path` phải giữ fragment để editor nhận được `#<blockId>` lúc tải.

**API (`apps/api`)**
- Việc kiểm tra `next_path` phải cho fragment đi qua mà vẫn giữ mọi biện pháp chống open redirect hiện có: chặn scheme/netloc, `//`, `..` và các mẫu đáng ngờ.
- Việc dựng URL redirect an toàn phải encode `next_path` để `#` không bị trình duyệt hiểu thành fragment của URL redirect. Phía web phải decode tương ứng.
- Đây là thay đổi hợp đồng với web: sau khi sửa, giá trị `next_path` trả về là đã encode. Mọi chỗ ở web đọc `next_path` phải được rà lại.

## Testing Decisions

- **Thế nào là test tốt:** chỉ kiểm tra hành vi nhìn thấy từ bên ngoài, gồm cái người dùng thấy (mục menu có hoặc không, menu chứa gì) và cái bên tích hợp nhận được (handler được gọi với `id` nào, block nào được tô sáng). Không test chi tiết nội bộ như tên plugin, cấu trúc state, hay chuỗi class CSS.
- **Seam 1, seam chính: component document editor.**
  - Thêm vitest + jsdom + testing-library cho `@plane/editor`, theo cấu hình đang dùng ở `@plane/blocks`.
  - Render document editor ở chế độ không cộng tác, với nội dung có sẵn các block có `id`.
  - Mở Block menu bằng cách đặt NodeSelection lên block rồi kích hoạt drag handle. jsdom không hỗ trợ `posAtCoords` nên không đi qua đường mousemove.
  - Các trường hợp cần test:
    - Có handler: "Copy link" xuất hiện; bấm vào thì handler được gọi đúng một lần với `id` của block được chọn, kể cả list item lồng; menu đóng lại.
    - Không có handler: không có "Copy link".
    - Node được chọn không có `id`: không có "Copy link".
    - Editor không editable: menu chỉ có "Copy link"; không có Delete hay Duplicate.
    - Đổi `location.hash` sang `id` của một block: block đó mang đánh dấu tô sáng. Hash không tồn tại: không block nào được tô sáng.
  - Rủi ro: drag handle và side menu phụ thuộc toạ độ DOM. Nếu jsdom không dựng được side menu, người làm báo lại thay vì thay bằng test nối dây.
- **Seam 2: kiểm tra `next_path` ở backend.**
  - Mở rộng bộ unit test `validate_next_path` và `get_safe_redirect_url` hiện có trong `apps/api`.
  - Các trường hợp cần test:
    - Đường dẫn tương đối có fragment được giữ nguyên.
    - URL redirect sinh ra có `next_path` được encode, nên fragment nằm trong giá trị tham số chứ không thành fragment của URL.
    - Các ca open redirect hiện có (scheme, `//`, `..`, ký tự điều khiển, mẫu đáng ngờ) vẫn bị chặn khi có thêm fragment.
- Không thêm seam test mới ở `apps/web` (chưa có bộ test). Handler copy ở web và các điểm redirect về đăng nhập được kiểm chứng bằng chạy thử thật: copy link → mở ở tab ẩn danh → đăng nhập bằng từng phương thức → về đúng block.
- **Tham khảo cách viết test:** các bộ vitest + testing-library trong `@plane/blocks` (menu, context menu, outside-click), và `test_path_validator.py` trong bộ unit test của API.

## Out of Scope

- Copy block link trong rich-text editor khác Pages (mô tả work item, comment…).
- Icon 🔗 khi hover heading; phím tắt copy block link.
- Block menu và copy block link trên thiết bị cảm ứng.
- Toast hoặc thông báo khi block đích đã bị xoá.
- Đổi thời gian hay kiểu tô sáng của deep link.
- Dịch các nhãn của Block menu (Delete, Duplicate, Copy link…); việc này nên làm một lượt riêng cho cả menu.
- Published/public page: app `space` không render Pages.

## Further Notes

- Spec này dựa trên `upstream/preview` tại commit `053b2c0e58`. Các file liên quan (Block menu, side menu, UniqueID, plugin highlight, editor container, editor body của Pages, authentication wrapper, API service, path validator) không khác gì giữa nhánh này và bản đã khảo sát khi thiết kế.
- Điều chưa kiểm chứng: khi bấm một block link của cùng page bên trong nội dung editor, router phía client có thể điều hướng bằng `pushState`, vốn không phát sự kiện `hashchange`. Người làm cần xác nhận click link trong editor đi theo đường nào và bảo đảm User Story 14 chạy được với đường đó.
- `id` của block do UniqueID sinh và lưu trong nội dung. Nội dung cũ chưa có `id` sẽ được gán khi editor tải, nhưng link chỉ ổn định sau khi thay đổi đó được đồng bộ lên server.
- Prop handler mới là thay đổi API công khai của `@plane/editor`. Cần rà mọi nơi đang render document editor.
