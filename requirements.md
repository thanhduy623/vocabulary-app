BẠN LÀ CÔNG TY CHUYÊN XÂY DỰNG PHẦN MỀM THEO YÊU CẦU BAO GỒM ĐỘI NGŨ BA, FE, DB, LOGICAL ENGINEER.

- BA phụ trách thiết kế yêu cầu
- FE phụ trách xây dựng giao diện
- DB khai thác và tối ưu luồng dữ liệu
- LOGICAL ENGINEER phân tích logic nghiệp vụ và logic code (vì không có backend nên tôi dung trực tiếp fe thao tác với database luôn)

YÊU CẦU CHUNG
Tôi cần xây dựng hệ thống trang web học từ vựng chuyên nghiệp hiện đại đầy công nghệ hữu ích cho việc học từ vựng trên máy tính và điện thoại. Biết rằng kiến trúc hệ thống của tôi được xây dựng bằng các công nghệ nền tảng sau:

- DB: Firebase – Dùng trực tiếp từ frontend qua database.json (được tải về từ Firebase) để kết nối thẳng lên DB thay vì cần qua BE
- FE: Vue3 – Giao hiện hiện đại, công nghê, trẻ trung, thuận tiện trong quá trình sử dụng. Tối ưu hoá chỏ cả sử dụng điện thoại và cả máy tính.
- BE: Không có
  Hệ thống phải được xây theo hướng module hoá thay vì kiến trúc lớn sau này sẽ bị khó mở rộng và sau. Đòng thời các logic, service mỗi các sẽ phải tách nhỏ ra từng file riêng và các nghiệp vụ cũng nên tách nhỏ để dễ dàng sữa lỗi về sau và nâng cấp sửa chữa.
  Giao diện được xây dựng bằng bootstrap và css

YÊU CẦU CHỨC NĂNG
Phân hệ Bộ sưu tập (collections): Công dụng của collection là chứa các từ vựng.

- Tạo: ID là uuid tự động của hệ thống thống tương ứng với bản ghi.Cho phép tạo 1 đối tượng collection mới, gồm:
  o Tên collection
  o Ngôn ngữ
  o Kí hiệu (vi, cn, en, … theo chuẩn quốc tế phục vụ chức năng đọc).
- Cập nhật: Cho phép cập nhật 1 đối tượng collection chỉ bao gồm tên, ngôn ngữ, kí hiệu. Không cho phép cập nhật ID.
- Xoá: Cho phép xoá 1 đối tượng collection. Lưu ý xoá collection là xoá tất cả các từ vựng bên trong nó.
- Lấy: Toàn toàn bộ collections
  Phân hệ Từ vựng (words): Công dụng của collection là chứa các từ vựng.
- Tạo: ID là uuid tự động của hệ thống thống tương ứng với bản ghi. Cho phép tạo 1 đối tượng words mới với các trường sau:
  o id: là uuid của bản ghi
  o collectionId: là id của collection chứa nó
  o word: là từ vựng còn học
  o transcription: là cách đọc theo phiên âm IPA latinh
  o meaning: là dịch nghĩa
  o example: là ví dụ
  o type: là phân loại (động, danh, tính, trạng, thành ngữ, nguyên âm, phụa âm,…)
  o topic: là nhóm chủ đề
  o level: là mức độ từ vựng theo cấp học
- Cập nhật: Cho phép cập nhật 1 đối tượng words chỉ bao gồm tất cả các trường nó có, không cho phép cập nhật ID.
- Xoá: Cho phép xoá 1 đối tượng words.
- Lấy: Lấy toàn bộ danh sách từ vựng trong 1 collection
- Lưu ý: Đối với type, topic, level khi tạo và cập nhật phải cho phép chọn trong danh sách thả xuống đồng thời kết hợp với phương pháp cho nhập thủ công bằng cách gõ. Biết rằng danh sách thả xuống dựa trên dữ liệu từ danh sách lấy về của chức năng lấy danh sách từ vựng trong 1 collection (lọc trùng để tránh select có trùng).
  Với tất cả DB đều được lưu timestamp createdAt

LUỒNG THAO TÁC CHÍNH HỆ THỐNG

- Người dung truy cập trang chủ
- Hệ thống hiện thị trang chủ gồm: danh sách các collection
- Người dung chọn collection cần học
- Hệ thống lấy dữ liệu từ vựng trong collection đó và lưu tạm vào cache của frontend để tránh request lại quá nhiều lần.
- Hệ thống sau khi lấy từ vựng xong hiển thị giao diện danh sách từ vựng trong collection
- Người dung chọn các word muốn học/cần ôn tập.
- Người dung có thể bấm nút chọn tất cả hoặc chọn từng cái. Sau đó chọn tiếp theo (chỉ cho phép tiếp khi có chọn ít nhất 04 từ vựng)
- Hệ thống chuyển sang giao diện chọn kỹ năng cần học (tạm thời gồm: Thẻ nhớ, Chọn từ, Luyện nghe, Luyện gõ). Trang này nên đảm bảo cơ chế mở rộng về sau để phát triển thêm các chức năng đó. Biết rằng sẽ cho chọn ít nhất 01 chức năng và có thể chọn nhiều chức năng.
- Sau đó hệ thống sẽ chuyển sang chế độ bắt đầu học
- Sau khi người học học xong thì thì chuyển về trang chọn kỹ năng cần học lại (vẫn ghi nhớ danh sách từ vựng đã chọn trước đó).
- Nếu người dung chọn kỹ năng tiếp thì học tiếp
- Còn chọn nút quay lại thì quay lại giao diện chọn từ vựng
- Chọn quay lại nữa thì về trang collection

MÔ TẢ CÁC KỸ NĂNG HỌC

1. KỸ NĂNG THẺ NHỚ:
   Yêu cầu: Chỉ với 1 object từ vựng hệ thống có thể tự tạo ra 03 card tương ứng, gồm:

- FRONT: word, BACK: transcription, meaning, example, type topic, level, audio
- FRONT: transcription, BACK: word, meaning, example, type topic, level, audio
- FRONT: meaning, BACK: word, transcription, example, type topic, level, audio
  Lưu ý: Người dung có thể bấm vào card/ấn enter/ấn scpace để lật. Để qua thẻ mới người dung cần bấm nút tiếp. Lưu ý rằng chế độ này sẽ lấy từ vựn random và các card được tạo ra cũng ở thứ tự random không cần theo tứ tự hay theo cụm được phát sinh. Sẽ có thêm nút để yêu cầu lặp lại (card yêu cầu học lại sẽ ko tính đã học xong). Card cần lặp lại sẽ xuất hiện ngẫu nhiên lại ở lúc sau. Đảm bảo học hết các card thì mới được kết thúc.

2. KỸ NĂNG CHỌN TỪ
   Yêu cầu: Kết hợp nhiều object từ vựng hệ thống có thể tự tạo ra 06 câu hỏi tương ứng, gồm:

- Q: word, A: transcription
- Q: word, A: meaning
- Q: transcription, A: word
- Q: transcription, A: meaning
- Q: meaning, A: word
- Q: meaning, A: transcription
  Lưu ý: Hệ thống hiển thị Q ở phía trên, 4 A ở phía dưới để người dung chọn. Ví dụ Q là word của từ X, đáp án sẽ là transcription của X, Y, K, M. Tương tự với loại khác. Khi người dung chọn đáp án. Sẽ phải tô chữ màu xanh nếu đáp án đúng, bấm nút tiếp để qua câu mới. Chọn sai thì tô chữ màu đỏ. Khi chọn sai không được chọn lại mà phải bấm nút vẫn cả thể bấm nút tiếp nhưng câu này không tính đã hoàn thành phải mặc lại ở lúc sau. Đảm bảo học hết các câu hỏi thì mới được kết thúc.

3. KỸ NĂNG GÕ CHỮ
   Yêu cầu: Chỉ với 1 object từ vựng hệ thống có thể tự tạo ra 03 câu gõ tương ứng gồm:

- key: word, type: transcription
- key: transcription, type: word
- key: meaning, type: word
  Lưu ý: Hệ thống hiển thị Key ở phía trên, và ô input type ở phía dưới để người dung nhập tương ứng. Ví dụ Q là word của từ X, người dung cần nhập wtranssciption của . Tương tự với loại khác. Khi người dung chọn đáp án. Sẽ phải tô chữ màu xanh nếu đáp án đúng, bấm nút tiếp để qua câu mới. Chọn sai thì tô chữ màu đỏ. Khi chọn sai không được chọn lại mà phải bấm nút vẫn cả thể bấm nút tiếp nhưng câu này không tính đã hoàn thành phải mặc lại ở lúc sau. Đảm bảo học hết các câu hỏi thì mới được kết thúc.

4. KỸ NĂNG LUYỆN NGHE
   Yêu cầu: Kết hợp nhiều object từ vựng hệ thống có thể tự tạo ra 03 câu hỏi tương ứng, gồm:

- audio: audio, type: word
- audio: audio, type: transcription
- audio: audio, type: meaning
  Lưu ý: Audio là một chức năng được import vào bằng js để có thể đọc được từ vựng chứ không có file audio. Mã ngôn ngữ phục vụ chức năng đọc phát âm của từ dựa vào Kí hiệu của ngôn ngữ trong collection.Hệ thống tự động phát audio khi qua câu hỏi mới, ở phía trên sẽ có nút để phát nghe lại. Ví dụ phát audio của từ X, bên dưới sẽ cần chọn word/ transcription, meaning của từ X. Khi người dung chọn đáp án. Sẽ phải tô chữ màu xanh nếu đáp án đúng, bấm nút tiếp để qua câu mới. Chọn sai thì tô chữ màu đỏ. Khi chọn sai không được chọn lại mà phải bấm nút vẫn cả thể bấm nút tiếp nhưng câu này không tính đã hoàn thành phải mặc lại ở lúc sau. Đảm bảo học hết các câu hỏi thì mới được kết thúc.

MÔ TẢ GIAO DIỆN TỔNG QUAN

1. GIAO DIỆN CHUNG

- Header: Logo (bấm vào về lại được trang chủ) + bên phải là nút reresh (xoá các cache để load lại dữ liệu lấy mới từ DB xuống lại thay vì cache đang lưu ví dụ words của collection X để tránh bị ko đồng bộ và dữ liệu bị cũ) + nút back (quay lại trang trước để tránh bị mất stage)
- Phần phía dưới là router

2. ROUTER
   2.1. TRANG CHỦ: Có nút thêm collection, hiển thị danh sáhc collection, mỗi dòng của collection sẽ có nút thêm từ vựng, sửa và xoá tương ứng. Khi sửa sẽ hiển thị popup để sửa và gửi yêu cần lên DB lưu lại. Khi xoá cần xác nhận rồi mới xoá trên DB. Khi chọn từ vựng hệ thống sẽ chuyển sang trang quản lý từ vựng. Khi chọn nút học sẽ chuyển sang trang chọn từ vựng.
   2.2. TRANG QUẢN LÝ TỪ VỰNG: Hiển thị danh sách từ vựng tương ứng với collection đã chọn. Người dung có thể chọn tất cả hoặc chọn từng cái. Có nút để thêm từ vựng vào collection. Lưu ý với mỗi dòng sẽ có nút cập nhật và xoá từ vựng. Khi xoá cần xác nhận. Khi cập nhật sẽ hiển thị popup để cập nhât.
   2.2. TRANG CHỌN TỪ VỰNG: Hiển thị danh sách từ vựng tương ứng với collection đã chọn. Người dung có thể chọn tất cả hoặc chọn từng cái. Lưu ý nên neo nút tiếp/xác nhận để tránh tình trạng cuộn đến cuối danh sáhc mới qua được cái tiếp theo. Phải chọn ít nhất 04 từ rồi mới được qua chọn chế độ. Nút back sẽ về lại trang chọn từ collecition.
   2.3. TRANG CHỌN CHẾ ĐỘ: Card hiển thị 04 chế độ: Thẻ nhớ, Chọn từ, Luyện nghe, Luyện gõ. Người dung có thể chọn 1 hoặc nhiều chức năng. Phải chọn ít nhất 01 chế độ mới được học. Nút back sẽ về lại trang chọn từ vựng.
   2.4. TRANG HỌC:
   2.4.1. Thẻ nhớ: Giao diện flash card, card ở phía trên, còn nút Đã nhớ + Học lại ở phía dưới. Phải lật card mới được bấm tiếp theo hoặc lùi lại. Đảm bảo đánh dấu dã nhớ hết mới kết thúc chế độ học. Nút back sẽ về lại trang chọn chế độ. Kết thúc chế độ học về lại trang chọn chế độ,
   2.4.2. Chọn từ, Luyện nghe: sẽ có giao diện khá giống nhau. Bên trên là từ / nút bật lại audio. Bên dưới là 4 đáp án cần chọn. Chọn đúng bấm tiếp để qua câu. Chọn sai bấm tiếp để qua câu nhưng sau đó sẽ có xuất hiện lại ngãu nhiên câu này. Đảm bảo đúng hết mới kết thúc chế độ học. Nút back sẽ về lại trang chọn chế độ. Kết thúc chế độ học về lại trang chọn chế độ,
   2.4.3. Luyện gõ: Phía trên sẽ là key, phía dưới sẽ là input để gõ. Sẽ có khu vực để nhập bàn phím. Nhập đúng bấm tiếp để qua câu. Nhập sai bấm tiếp để qua câu nhưng sau đó sẽ có xuất hiện lại ngãu nhiên câu này. Đảm bảo đúng hết mới kết thúc chế độ học. Nút back sẽ về lại trang chọn chế độ. Kết thúc chế độ học về lại trang chọn chế độ,
   Lưu ý:

- Tối ưu hoá trải nghiệm người dung
- Tối ưu hoá giao diện cho cả máy tính và điện thoại
- Tối ưu giao diện theo chiều cao của thiết bị (cẩn thận với điẹn thoại và máy tính và chiều cao và ngang khác nhau nhiều và điện thoại sẽ có phần thanh địa chỉ ẩn hiển nữa sẽ bị chiếm diện tích)
- Tối ưu và đảm bảo cache ở giao diện thay đổi phù hợptheo thao tác người dung hệ thống và hạn chế get lại quá nhiều lần ở DB
- Tất cả đều phải theo hướng có thể tái sử dụng lại được và dễ dàng nâng cấp mở rộng về sau
- Đối với Kỹ năng Chọn từ, luyện nghe, luyện gõ thì cần phải cho biết đáp án ngay khi kiểm tra
- Đối với tất cả giao diện học đều phải có trạng thái tiến độ học đã đến đâu, đúng bao nhiêu, sai bao nhiêu, đã học bao nhiêu, tổng bao nhiêu, còn lại bao nhiêu.
- Tất cả các trang đều phải có nút trở về trang trước để ko bị mất state

LUỒNG CHỨC NĂNG CHI TIẾT
I. QUY ƯỚC STATE VÀ CACHE
Trước khi mô tả từng chức năng, hệ thống thống nhất các state chính như sau:
State Mục đích
collections Danh sách toàn bộ collection đã lấy từ DB
selectedCollectionId ID collection hiện đang được chọn
wordsByCollection Cache danh sách words theo từng collection
selectedWordIds Danh sách ID words được chọn để học
selectedSkillIds Danh sách skill được chọn để học
learningSession State phiên học hiện tại
isCollectionsLoaded Xác định collections đã được load hay chưa
loadedWordCollectionIds Xác định collection nào đã có words trong cache
Nguyên tắc cache
Khi cần dữ liệu:
UI
↓
Kiểm tra Session Store
↓
Có dữ liệu?
├── Có → sử dụng cache
└── Không → GET Firebase → lưu Session Store → sử dụng
Sau thao tác CRUD thành công:
Firebase mutation
↓
Thành công
↓
Cập nhật Session Store
↓
UI tự cập nhật
Không GET lại DB nếu dữ liệu trong cache đã có thể xác định chính xác sau mutation.

1. XEM DANH SÁCH COLLECTION
   Mục đích
   Hiển thị toàn bộ collection để người dùng có thể:
   quản lý collection;
   quản lý từ vựng;
   bắt đầu học.
   Luồng chính
   Người dùng truy cập trang chủ.
   Hệ thống kiểm tra collections trong Session Store.
   Nếu Session Store đã có dữ liệu:
   sử dụng dữ liệu cache;
   không gọi DB.
   Nếu Session Store chưa có:
   gọi DB lấy toàn bộ collection;
   lưu kết quả vào collections;
   cập nhật trạng thái isCollectionsLoaded.
   Hệ thống sắp xếp collection theo tên A → Z.
   Hệ thống hiển thị collection dưới dạng Grid Card.
   Action trên Collection Card
   Mỗi card có:
   HỌC NGAY
   TỪ VỰNG
   CẬP NHẬT
   XOÁ
   Khi chọn HỌC NGAY
   Collection Card
   ↓
   selectedCollectionId = collection.id
   ↓
   Chuyển sang Word Selection
   Khi chọn TỪ VỰNG
   Collection Card
   ↓
   selectedCollectionId = collection.id
   ↓
   Chuyển sang Word Management
   Business Rule
   Không sử dụng:
   indexCollection
   làm định danh collection.
   Nên sử dụng:
   selectedCollectionId
   vì ID không thay đổi dù danh sách được sort, thêm hoặc xóa.
2. TẠO COLLECTION
   Luồng chính
   Người dùng mở trang chủ.
   Hệ thống hiển thị danh sách collection.
   Người dùng bấm THÊM BỘ SƯU TẬP.
   Hệ thống hiển thị Modal tạo collection.
   Người dùng nhập:
   Tên collection;
   Ngôn ngữ;
   Ký hiệu ngôn ngữ.
   Người dùng bấm Tạo.
   Frontend kiểm tra dữ liệu đầu vào.
   Nếu dữ liệu không hợp lệ:
   hiển thị validation;
   không gửi DB.
   Nếu hợp lệ:
   hệ thống tạo UUID;
   tạo createdAt;
   gửi dữ liệu lên Firebase.
   Nếu Firebase trả về lỗi:
   giữ Modal;
   hiển thị thông báo lỗi;
   không thay đổi cache.
   Nếu thành công:
   đóng Modal;
   thêm collection mới vào collections;
   sort lại A → Z;
   cập nhật Session Store;
   hiển thị collection mới.
   Kết quả
   Không cần gọi lại:
   GET collections
   sau khi tạo thành công.
3. CẬP NHẬT COLLECTION
   Luồng chính
   Người dùng mở trang chủ.
   Hệ thống sử dụng collections từ Session Store nếu đã có.
   Hệ thống hiển thị danh sách A → Z.
   Người dùng chọn CẬP NHẬT trên collection.
   Hệ thống mở Modal cập nhật.
   Modal hiển thị dữ liệu hiện tại:
   Tên;
   Ngôn ngữ;
   Ký hiệu.
   ID được sử dụng nội bộ nhưng không cho phép chỉnh sửa.
   Người dùng thay đổi dữ liệu.
   Người dùng bấm Lưu.
   Frontend validation.
   Nếu không hợp lệ:
   hiển thị lỗi;
   giữ Modal.
   Nếu hợp lệ:
   gửi update Firebase.
   Nếu thất bại:
   hiển thị lỗi;
   giữ nguyên cache hiện tại.
   Nếu thành công:
   đóng Modal;
   cập nhật collection tương ứng trong collections;
   sort lại A → Z;
   cập nhật Session Store.
4. XOÁ COLLECTION
   Luồng chính
   Người dùng mở trang chủ.
   Hệ thống lấy collections từ Session Store hoặc Firebase.
   Người dùng bấm XOÁ.
   Hệ thống hiển thị Modal xác nhận.
   Nội dung xác nhận phải cảnh báo:
   Xóa bộ sưu tập sẽ đồng thời xóa toàn bộ từ vựng thuộc bộ sưu tập này.
   Người dùng chọn Hủy
   Đóng Modal
   ↓
   Giữ nguyên dữ liệu
   Người dùng chọn Xác nhận
   Gửi yêu cầu xóa collection.
   Hệ thống thực hiện cascade delete:
   xóa collection;
   xóa toàn bộ words có collectionId tương ứng.
   Nếu thất bại:
   hiển thị lỗi;
   không tự ý xóa khỏi cache.
   Nếu thành công:
   xóa collection khỏi collections;
   xóa cache words tương ứng;
   nếu collection đang là selectedCollectionId thì reset state đó;
   cập nhật Session Store;
   cập nhật UI.
5. XEM DANH SÁCH WORD
   Luồng chính
   Người dùng đang ở trang chủ.
   Người dùng chọn TỪ VỰNG trên một collection.
   Hệ thống lưu:
   selectedCollectionId = collection.id
   Hệ thống chuyển sang trang Quản lý từ vựng.
   Hệ thống kiểm tra cache:
   wordsByCollection[selectedCollectionId]
   Nếu đã có:
   sử dụng cache;
   không GET Firebase.
   Nếu chưa có:
   GET words theo collectionId;
   lưu vào cache;
   hiển thị dữ liệu.
   Hệ thống hiển thị danh sách words.
6. HIỂN THỊ VÀ LỌC WORD
   Trang Word Management hỗ trợ:
   Search
   Tìm kiếm theo:
   word
   Filter
   Theo:
   type
   topic
   level
   Các option filter được sinh từ danh sách words hiện tại của collection.
   Ví dụ:
   type:

- adjective
- noun
- verb
  topic:
- Family
- Travel
- Food
  level:
- A1
- A2
- B1
  Các giá trị phải được lọc trùng.
  Sort
  Danh sách hiển thị theo:
  word A → Z
  Tôi đề xuất search/filter/sort là client-side operation, không gọi Firebase cho mỗi thao tác.

7. TẠO WORD
   Luồng chính
   Người dùng mở trang Word Management.
   Bấm THÊM TỪ VỰNG.
   Hệ thống mở Modal.
   Người dùng nhập:
   word
   transcription
   meaning
   example
   type
   topic
   level
   collectionId
   Collection
   collectionId mặc định là collection hiện tại.
   Nếu yêu cầu cho phép chọn collection ngay khi tạo thì dùng danh sách collections đã cache.
   type/topic/level hỗ trợ:
   chọn từ danh sách;
   hoặc nhập giá trị mới.
   User bấm Tạo.
   Frontend validation.
   Nếu hợp lệ:
   generate UUID;
   generate createdAt;
   gửi Firebase.
   Nếu thất bại:
   giữ Modal;
   báo lỗi;
   không thay đổi cache.
   Nếu thành công:
   đóng Modal;
   thêm Word vào cache của collection tương ứng;
   cập nhật wordsByCollection;
   UI hiển thị Word mới;
   cập nhật danh sách option type/topic/level.
8. CẬP NHẬT WORD
   Luồng chính
   Người dùng chọn CẬP NHẬT trên Word.
   Hệ thống mở Modal.
   Hiển thị toàn bộ thông tin Word.
   Người dùng được thay đổi:
   collectionId
   word
   transcription
   meaning
   example
   type
   topic
   level
   id không được phép chỉnh sửa.
   createdAt không được phép chỉnh sửa.
   collectionId là Selection.
   Danh sách Collection lấy từ collections đang cache.
   Người dùng bấm Lưu.
   Validation.
   Gửi Firebase.
   Nếu thất bại:
   hiển thị lỗi;
   giữ nguyên cache.
   Nếu thành công:
   đóng Modal;
   cập nhật Word trong cache.
   Trường hợp thay đổi collection
   Đây là một nghiệp vụ đặc biệt.
   Ví dụ:
   Word A
   collectionId = Collection 1
   được đổi thành:
   collectionId = Collection 2
   thì cache phải thay đổi:
   wordsByCollection[Collection1]
   ↓
   remove Word A
   wordsByCollection[Collection2]
   ↓
   add Word A
   Không được chỉ update object tại cache Collection 1.
9. XOÁ WORD
   Luồng chính
   Người dùng bấm XOÁ.
   Hệ thống mở Modal xác nhận.
   Người dùng chọn:
   Hủy;
   Xác nhận.
   Hủy
   Đóng Modal.
   Xác nhận
   Gửi yêu cầu delete Firebase.
   Nếu thất bại:
   báo lỗi;
   giữ nguyên cache.
   Nếu thành công:
   xóa Word khỏi cache collection;
   cập nhật wordsByCollection;
   cập nhật danh sách hiển thị;
   cập nhật lại các option type/topic/level.
10. BẮT ĐẦU HỌC TỪ COLLECTION
    Đây là flow chính của hệ thống học.
    Bước 1 — Chọn Collection
    Người dùng mở Home.
    Hệ thống load collections.
    Người dùng bấm HỌC NGAY.
    Hệ thống lưu:
    selectedCollectionId
    Chuyển sang Word Selection.
11. CHỌN WORD ĐỂ HỌC
    Load dữ liệu
    Hệ thống kiểm tra:
    wordsByCollection[selectedCollectionId]
    Nếu đã có:
    sử dụng cache.
    Nếu chưa có:
    GET Firebase;
    lưu cache.
    Hiển thị danh sách Word.
    Khôi phục lựa chọn
    Hệ thống kiểm tra:
    selectedWordIds
    Nếu đã tồn tại cho collection hiện tại:
    Word A ☑
    Word B ☐
    Word C ☑
    thì phải khôi phục đúng trạng thái checkbox.
12. CHỌN WORD
    Người dùng có thể:
    Chọn từng Word
    Checkbox từng dòng.
    Chọn tất cả
    Checkbox Select All.
    Nếu bỏ Select All:
    → bỏ chọn toàn bộ
    Nếu chọn từng item:
    Select All
    phải tự động chuyển trạng thái tương ứng.
13. ĐIỀU KIỆN NEXT
    Hệ thống luôn hiển thị:
    Đã chọn: X từ
    Ví dụ:
    Đã chọn: 7 / 120
    Nút:
    TIẾP
    chỉ enabled khi:
    selectedWordIds.length >= 4
    Nếu:
    0–3
    thì disabled.
14. LƯU WORD ĐÃ CHỌN
    Khi user bấm TIẾP:
    selectedWordIds
    được lưu vào Learning Session Store.
    Ví dụ:
    selectedWordIds = [
    wordId1,
    wordId5,
    wordId8,
    wordId10
    ]
    Có thể đồng thời lưu:
    selectedCollectionId
    để đảm bảo session không bị nhầm collection.
15. CHỌN CHẾ ĐỘ HỌC
    Hệ thống hiển thị 4 skill:
    FLASH_CARD
    MULTIPLE_CHOICE
    LISTENING
    TYPING
    Mỗi skill hiển thị dưới dạng Card.
    User chỉ có thể chọn đúng 1 skill (single-select).
    Khi chọn một skill, hệ thống chuyển thẳng sang trang
    TÙY CHỌN CHẾ ĐỘ HỌC — không còn nút Tiếp.
    Điều kiện:
    selectedSkillIds.length === 1
16. LƯU CHẾ ĐỘ HỌC
    Khi user chọn skill:
    selectedSkillIds
    được cập nhật vào Learning Session Store.
    Ví dụ:
    selectedSkillIds = [
    FLASH_CARD,
    LISTENING
    ]
    Không nên tạo các biến riêng kiểu:
    isFlashCard
    isListening
    isTyping
    ...
    vì sẽ khó mở rộng.
17. BẮT ĐẦU LEARNING SESSION
    Khi user bấm BẮT ĐẦU HỌC:
    Lấy:
    selectedCollectionId
    selectedWordIds
    selectedSkillIds
    Lấy Word từ cache.
    Tạo snapshot dữ liệu cho learning session.
    Skill Generator tương ứng tạo Learning Items.
    Randomize Learning Items.
    Khởi tạo progress.
    Khởi tạo retry queue.
    Chuyển đến skill đầu tiên.
    Ví dụ:
    selectedSkillIds
    [
    FLASH_CARD,
    LISTENING,
    TYPING
    ]
    thì bắt đầu:
    FLASH_CARD
18. CHUYỂN GIỮA CÁC SKILL
    Sau khi hoàn thành một skill:
    Learning Skill
    ↓
    Complete
    ↓
    Skill Selection
    Tại Skill Selection:
    các skill đã hoàn thành có thể hiển thị trạng thái Đã hoàn thành;
    user có thể chọn skill khác;
    user có thể học lại skill đã hoàn thành nếu nghiệp vụ cho phép.
    Tuy nhiên cần phân biệt:
    selectedSkillIds
    Các skill user đã chọn trong session.
    activeSkillId
    Skill đang thực sự được học.
    completedSkillIds
    Các skill đã hoàn thành.
    Ba state này không nên gộp thành một biến.
19. TIẾP TỤC HỌC
    Ví dụ ban đầu user chọn:
    FLASH_CARD
    LISTENING
    Sau khi hoàn thành Flash Card:
    Skill Selection
    ☑ Flash Card — Hoàn thành
    ☐ Listening
    User chọn Listening:
    activeSkillId = LISTENING
    và bắt đầu Listening.
    Sau khi Listening hoàn thành:
    FLASH_CARD — Completed
    LISTENING — Completed
    Phiên học được xem là hoàn thành khi tất cả skill đã được yêu cầu hoàn thành.
20. QUAY LẠI TRONG LEARNING FLOW
    Từ Learning → Skill Selection
    Không xóa:
    selectedCollectionId
    selectedWordIds
    selectedSkillIds
    Chỉ reset state của skill đang học nếu user thực sự thoát skill.
    Từ Skill Selection → Word Selection
    Giữ:
    selectedCollectionId
    Nhưng reset:
    selectedSkillIds
    learningSession
    selectedWordIds có thể được giữ để người dùng quay lại chỉnh sửa.
    Từ Word Selection → Home
    Reset learning context.
21. CACHE / SESSION STORE SAU KHI CHỈNH SỬA
    Tôi đề xuất tên state rõ nghĩa hơn thay vì các tên:
    indexCollection
    list_words_of_collection_123
    list_words_for_study
    Có thể chuẩn hóa thành:
    collections
    selectedCollectionId
    wordsByCollection
    selectedWordIds
    selectedSkillIds
    activeSkillId
    completedSkillIds
    learningSession
    Trong đó:
    wordsByCollection = {
    collectionId1: [...],
    collectionId2: [...],
    collectionId3: [...]
    }
    Không cần sinh tên biến động như:
    list_words_of_collection_123

BÂY GIỜ BA SẼ PHÂN TÍCH, TỔNG HỢP CÁC YÊU CẦU VÀ ĐƯA RA GIẢI PHÁP XÂY DỰNG HỆ THỐNG HỢP LÝ. ĐƯA DỮ LIỆU ĐẦU RA KỸ THẬUT CHI TIÊT
