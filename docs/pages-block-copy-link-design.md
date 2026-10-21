# Pages: copy link của 1 block — thiết kế

## Tóm tắt

Thêm mục **"Copy link"** vào Block menu của document editor trong Plane Pages. Link có dạng URL chuẩn của page cộng `#<block id>`, do web app dựng qua một handler truyền vào editor; mục chỉ hiện khi handler có mặt, nên tính năng chỉ có ở Pages. Sau khi copy, web app hiện toast. Khi mở link (tải page, hoặc đổi hash trên chính page đó), editor scroll tới block và highlight nó bằng cơ chế deep link sẵn có. Người chỉ xem (page read-only/locked/archived) vẫn có drag handle và Block menu, nhưng menu chỉ có "Copy link". Hash phải đi theo qua bước redirect đăng nhập.

## Terms

- **Block**: một node khối của editor có attr `id` do extension UniqueID sinh (paragraph, heading, list item, task item, table, image, callout, code…). _Tránh:_ "dòng", "đoạn".
- **Block link**: URL của page kèm fragment `#<block id>`; mở ra thì editor scroll tới block và highlight nó. _Tránh:_ "anchor link", "permalink".
- **Block menu**: menu nổi mở khi bấm drag handle (⋮⋮) bên trái block (`packages/editor/src/components/menus/block-menu.tsx`), hiện có Delete, Duplicate và các tuỳ chọn theo node. _Tránh:_ "context menu", "menu chuột phải".

## Why

Trong Plane Pages, người dùng muốn copy một link trỏ thẳng tới một block cụ thể trong page để chia sẻ.

## Locked decisions

### Q3: Chỉ áp dụng cho Pages (document editor)

- **Quyết định:** Copy link chỉ có trong document editor của Pages.
- **Bị loại:** _Pages + mọi rich-text editor có Block menu_ (mô tả work item, v.v.). Lý do: ở work item, URL đang mở có thể là peek view/modal, nên link phải trỏ tới trang chi tiết; fragment cũng có thể đụng với điều hướng ở đó. Mở rộng sau chỉ cần truyền handler (xem Q4).
- **Cái giá:** Block menu hành xử khác nhau giữa hai editor.

### Q4: Web app dựng URL qua handler

- **Quyết định:** Web app truyền một handler (ví dụ `getBlockLink(blockId)` hoặc một handler copy hoàn chỉnh) vào document editor, nối qua `apps/web/components/pages/editor/editor-body.tsx`. Handler dựng URL chuẩn của page từ `handlers.getRedirectionLink(pageId)` cộng `#<blockId>`, rồi copy bằng `copyUrlToClipboard` hoặc `copyTextToClipboard` (`packages/utils/src/string.ts`). Block menu chỉ hiện "Copy link" khi handler được truyền. Đây cũng là cơ chế thực thi Q3.
- **Bị loại:** _Editor tự dựng `window.location.origin + pathname + #id`_. Lý do: phụ thuộc vào route và query đang mở, không phải URL chuẩn; và không có cách tự nhiên để giới hạn tính năng chỉ cho Pages.
- **Cái giá:** thêm một prop vào API công khai của document editor (`@plane/editor`).

### Q7: Người chỉ xem vẫn copy được link

- **Quyết định:** Ở chế độ không editable (viewer, page locked hoặc archived), vẫn hiện drag handle; Block menu chỉ có "Copy link". Không drag, không Delete/Duplicate, không AI handle, không node options.
- **Bị loại:**
  - _Chỉ người đang sửa, trên desktop_: chia sẻ link là thao tác đọc, nên viewer và page đã lock là đúng những trường hợp cần nó.
  - _Ở read-only chỉ heading có icon 🔗 khi hover_: thêm một điểm bấm thứ hai, trái với Q1, và không phủ được các block không phải heading.
- **Cần thay đổi (đã kiểm tra):** `page-renderer.tsx` hiện chỉ render BlockMenu khi `editor.isEditable && !isTouchDevice`; `SideMenuExtension` (`packages/editor/src/extensions/side-menu.ts`) return sớm ở `mousemove` khi `!view.editable`. Cả hai phải cho phép chế độ read-only chỉ có Copy link.
- **Giới hạn giữ nguyên:** thiết bị cảm ứng vẫn không có Block menu, nên không copy được block link.

## Routine choices

- **Q1, điểm bấm:** chỉ thêm mục "Copy link" vào Block menu. Không có icon hover heading, không có phím tắt.
- **Q2, block nào:** đúng node mà drag handle đang chọn, kể cả list item/task item lồng. Ẩn mục nếu node được chọn không có `id`.
- **Q5, phản hồi:** web app hiện toast "đã copy link" trong handler; lỗi clipboard thì hiện toast lỗi. Chuỗi đi qua `@plane/i18n`.
- **Q6, cùng page:** lắng nghe `hashchange`. Mỗi khi hash đổi thì scroll và highlight bằng hàm dùng chung `highlightLinkedBlock` (`packages/editor/src/helpers/block-deep-link.ts`), được tách từ `scrollToNode` trong `packages/editor/src/components/editors/editor-container.tsx`; deep link lúc tải page vẫn chạy một lần, bị chặn bởi `hasScrolledOnce`.
  - **Đường đi khi bấm link trong editor:** không phải `hashchange`, cũng không phải `pushState`. Plugin `handleClickLink` (`packages/editor/src/extensions/custom-link/helpers/clickHandler.ts`) gọi `window.open(href, target)`, và mọi link mark mặc định có `target="_blank"` (`custom-link/extension.tsx`), nên link của cùng page mở ra tab mới. Handler chạy cả khi editor ở chế độ chỉ đọc (đã kiểm chứng bằng test).
  - **Quyết định: đi theo link ngay trong tab hiện tại.** Lý do: User Story 14 yêu cầu bấm link của cùng page thì cuộn và tô sáng mà không tải lại; mở tab mới không đáp ứng. Một cú bấm chuột trái không kèm phím bổ trợ vào link có cùng origin, cùng pathname và hash khác rỗng sẽ được xử lý trong sự kiện `click` (chặn hành vi mặc định để trình duyệt không mở `target="_blank"` ở chế độ chỉ đọc) và đặt `window.location.hash`, nhờ vậy đi qua listener `hashchange`. Nếu hash trùng với hash hiện tại thì gọi thẳng `highlightLinkedBlock`, vì đặt lại cùng hash không phát `hashchange`. Mọi link khác (page khác, origin khác, link không có hash, bấm kèm ctrl/cmd/shift/alt, nút giữa) giữ nguyên hành vi cũ.
  - **Quyết định: chỉ Pages document editor đi theo link cùng page ngay tại chỗ.** Lý do: quyết định sản phẩm của Human. Option `followBlockLinksInPlace` của `CustomLinkExtension` mặc định `false`; chỉ document editor (`components/editors/document/editor.tsx`) và collaborative document editor (`hooks/use-collaborative-editor.ts`) bật nó qua `useEditor`, ở cả chế độ sửa được và chỉ đọc. Mọi rich-text editor khác (mô tả work item, comment, …) bấm link cùng origin, cùng pathname, có `#hash` vẫn gọi `window.open(href, target)` như cũ.
  - **So khớp "cùng page" bỏ qua dấu `/` cuối:** `/a/b` và `/a/b/` là cùng một page, vì page đang mở có `pathname` kết thúc bằng `/` còn link cũ hoặc link gõ tay có thể không có.
- **Block link chuẩn có dấu `/` cuối:** handler copy link trong `apps/web/components/pages/editor/editor-body.tsx` dựng `<origin><đường dẫn chuẩn của page qua ensureTrailingSlash>#<block id>`, theo quy ước trailing slash có sẵn của web app (`apps/web/app/compat/next/helper.ts`). Lý do: `trailingSlashRedirectMiddleware` (`apps/web/app/layout.tsx`) redirect URL không có `/` cuối dựa trên `request.url`, mà React Router bỏ fragment khỏi `request.url`, nên link không có `/` mất hash và không cuộn tới block. Middleware giờ giữ lại fragment khi `window.location` (bỏ hash) trùng với URL của request, tức lúc tải document; khi điều hướng phía client, `window.location` vẫn là page trước nên không gắn fragment. Redirect 308 và query string giữ nguyên như cũ.
- **Q8, block đã bị xoá:** giữ nguyên, mở page ở đầu và không báo gì.
- **Q9, thời gian highlight:** giữ nguyên `NodeHighlightPlugin` (`packages/editor/src/plugins/highlight.ts`): highlight bị xoá khi editor nhận focus.
- **Q10, đăng nhập:** đưa cả hash vào `next_path` (pathname + hash, encode đúng) ở các điểm redirect về login, để sau khi đăng nhập vẫn nhảy tới block.
- **Q11, i18n nhãn:** nhãn "Copy link" là chuỗi tiếng Anh cứng trong editor, giống Delete/Duplicate; toast ở web dùng i18n.

## Verified facts

- UniqueID (`packages/editor/src/extensions/unique-id/extension.ts`) gán attr `id` (render thành `data-id`) cho mọi type trong `COMBINED_BLOCK_NODE_TYPES`, gồm paragraph, heading, blockquote, code block, horizontal rule, các loại list, list item, task item, table, image, custom image, v.v.
- `EditorContainer` đọc hash của URL một lần lúc tải, chờ provider sync hoặc dùng cached content, tìm node bằng `doc.descendants` theo `attrs.id`, scroll `block: "center"`, và dispatch meta cho `nodeHighlightPluginKey`. Chưa có chỗ nào tạo ra link.
- `NodeHighlightPlugin` được định nghĩa từ commit `b53016b449` nhưng chưa từng được đăng ký vào editor, nên trước đây deep link chỉ cuộn mà không tô sáng (Lead đã kiểm chứng trên trình duyệt). Ticket 03 đăng ký plugin trong `UtilityExtension` (`packages/editor/src/extensions/utility.ts`) và giữ nguyên hành vi của plugin.
- Block menu dùng chung cho document editor (`components/editors/document/page-renderer.tsx`) và rich-text editor (`components/editors/rich-text/editor.tsx`).
- Package editor không có hệ thống toast; web app có.
- `TEditorBodyHandlers` trong `editor-body.tsx` đã có `getRedirectionLink(pageId)`.
- `apps/space` không render Pages, nên không có trường hợp page công khai cần xét.
- Redirect về login bỏ mất hash: `apps/web/lib/wrappers/authentication-wrapper.tsx` push `/?next_path=${pathname}`; `apps/web/services/api.service.ts` dùng `window.location.pathname`; OAuth (`apps/web/hooks/oauth/core.tsx`) truyền `next_path` thẳng tới API.
- `apps/api/plane/utils/path_validator.py`: `get_safe_redirect_url` ghép `next_path={validated_path}` vào query mà không encode; `validate_next_path` còn chạy `_contains_suspicious_patterns`.

## Risks

- **Hash qua luồng login (Q10):** vì backend ghép `next_path` không encode, `#…` trong next_path có thể thành fragment của URL redirect thay vì nằm trong `next_path`. Đường đi cụ thể của hash sẽ khác nhau theo luồng: password, magic code, OAuth Google/GitHub/GitLab/Gitea, và 401 trong `api.service.ts`. Cần kiểm tra end-to-end từng luồng; nếu cần sửa backend thì phạm vi lan sang `apps/api`. Cũng phải xác nhận `_contains_suspicious_patterns` không loại `%23`/`#`.
- **Read-only side menu (Q7):** bật side menu khi không editable có thể vô tình lộ thao tác sửa (drag, delete, duplicate, AI, node options) hoặc kéo được. Cần kiểm thử với viewer, page locked và page archived.
- **`hashchange` (Q6):** hash từ nguồn khác (ví dụ `#editor-image-block-…` trong `helpers/assets.ts`) cũng kích hoạt listener; `scrollToNode` trả `false` khi không tìm thấy id nên vô hại, nhưng sẽ dispatch highlight meta chỉ khi tìm thấy. Listener phải được gỡ khi unmount.
- **Node không có id:** node ngoài `COMBINED_BLOCK_NODE_TYPES`, hoặc chưa được UniqueID gán id (nội dung cũ trước khi sync), phải ẩn mục thay vì copy link hỏng.
- **API editor:** prop handler mới là thay đổi API công khai của `@plane/editor`; mọi nơi dùng document editor cần được rà soát (hiện có `apps/web/components/editor/document/editor.tsx` và `apps/web/components/pages/editor/editor-body.tsx`).

## Deferred

Không có câu hỏi nào bị hoãn. Các mở rộng đã cân nhắc và loại khỏi phạm vi, sẽ được mở lại nếu có yêu cầu:

- Copy link trong rich-text editor của work item: mở lại khi cần chia sẻ block trong mô tả work item; khi đó truyền handler dựng URL trang chi tiết work item.
- Icon 🔗 khi hover heading hoặc phím tắt: mở lại nếu người dùng thấy Block menu khó tìm.
- Thiết bị cảm ứng: mở lại khi Block menu được hỗ trợ trên touch.
- Toast "Block không còn tồn tại": mở lại nếu người dùng phản ánh bị lạc khi link hỏng.
- Dịch toàn bộ Block menu: làm một lượt riêng cho cả menu.

## Open threads

Không có.
