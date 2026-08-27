export interface VocabPromptItem {
  id: string;
  word: string;
  meaning?: string;
  notes?: string;
  example?: string;
}

// Handcrafted Vietnamese prompts for common VSTEP vocabulary items
export const vietnamesePromptMap: Record<string, string> = {
  // === Transport ===
  "bus": "Xe buýt là phương tiện giao thông công cộng phổ biến và tiết kiệm chi phí nhất trong thành phố.",
  "train": "Đi lại bằng tàu hỏa giúp hành khách nghỉ ngơi và ngắm cảnh đẹp suốt hành trình dài.",
  "coach": "Chuyến xe khách đưa chúng tôi về quê vào dịp cuối tuần một cách an toàn và thoải mái.",
  "airplane": "Máy bay là phương tiện di chuyển nhanh nhất khi bạn muốn đi du lịch nước ngoài.",
  "public transport": "Tôi lựa chọn phương tiện giao thông công cộng khi đi làm. Nó giúp tôi tiết kiệm chi phí đi lại.",
  "be safer": "Sử dụng tàu hỏa thường được coi là an toàn hơn vì đường sắt có ít tai nạn hơn.",
  "avoid getting wet, dust": "Đi lại bằng xe buýt giúp tôi tránh bị ướt và khói bụi trong những trận bão lớn.",
  "listen to music & read books": "Tôi có thể nghe nhạc hoặc đọc sách trong lúc đi tàu điện ngầm.",
  "take a nap": "Đi xe khách cho phép tôi chợp mắt một lúc sau một ngày làm việc mệt mỏi.",
  "enjoy the roadside view": "Thật thú vị khi được ngắm cảnh ven đường và quan sát hoạt động thường ngày của mọi người.",
  "travel wherever i want and whenever i want": "Sở hữu xe riêng giúp tôi đi bất cứ nơi nào tôi muốn và bất kỳ lúc nào.",
  "cheap (bus)": "Giá vé xe buýt rất rẻ, và học sinh sinh viên còn được giảm giá vé khi xuất trình thẻ.",
  "have a higher chance of getting diseases": "Hành khách đối mặt với nguy cơ mắc các bệnh truyền nhiễm cao hơn khi ngồi trong các toa xe công cộng đông đúc.",
  "be pretty crowded at rush hours": "Xe buýt công cộng thường khá đông đúc vào các khung giờ cao điểm.",
  "air conditioner is broken down / xe xuống cấp": "Nhiều hệ thống giao thông công cộng đang xuống cấp với hệ thống điều hòa bị hỏng.",

  // === City Life ===
  "city life is interesting": "Cuộc sống ở thành phố rất thú vị vì luôn có nhiều hoạt động giải trí và sự kiện văn hóa phong phú.",
  "restaurants": "Thành phố có rất nhiều nhà hàng phục vụ các món ăn đa dạng từ nhiều quốc gia.",
  "cinemas": "Cuối tuần tôi thường cùng bạn bè đến rạp chiếu phim để thưởng thức các bộ phim mới.",
  "shopping malls": "Các trung tâm thương mại lớn là nơi lý tưởng để mua sắm và vui chơi giải trí.",
  "skyscrapers": "Các tòa nhà chọc trời hiện đại làm cho khung cảnh đô thị trở nên tráng lệ.",
  "convenient & modern life": "Sống ở đô thị mang lại một cuộc sống tiện nghi và hiện đại với đầy đủ dịch vụ.",
  "convenient transport system": "Hệ thống giao thông tiện lợi giúp người dân di chuyển dễ dàng giữa các quận.",
  "easily find a job": "Thành phố lớn thu hút nhiều công ty nên người dân có thể dễ dàng tìm một công việc phù hợp.",
  "high quality of education & health care": "Thành phố tập trung các trường học và bệnh viện với chất lượng giáo dục và y tế cao.",
  "polluted air": "Khói bụi từ xe cộ khiến không khí ở các thành phố lớn bị ô nhiễm nghiêm trọng.",
  "higher crime rate": "Tỉ lệ tội phạm cao hơn ở các khu đô thị khiến việc đảm bảo an ninh trở thành thách thức lớn.",
  "high cost of living": "Chi phí sinh hoạt cao ở thành phố gây ra áp lực tài chính cho nhiều gia đình trẻ.",
  "traffic congestion / traffic jams": "Auu tình trạng tắc nghẽn giao thông giờ cao điểm làm mất rất nhiều thời gian của người đi đường.",

  // === Countryside ===
  "rice fields": "Miền quê Việt Nam nổi tiếng với những cánh đồng lúa xanh mướt bao la.",
  "rivers": "Dòng sông êm đềm chảy qua làng quê mang lại cảm giác vô cùng bình yên.",
  "mountains": "Những ngọn núi hùng vĩ bao bọc xung quanh giúp không khí ở làng quê luôn mát mẻ.",
  "bring me a clean environment": "Sống ở nông thôn mang lại một môi trường trong sạch, không khói bụi độc hại.",
  "feel comfortable, relax, happy": "Không gian yên bình giúp tôi cảm thấy thoải mái, thư giãn và xóa tan mệt mỏi.",
  "fresher air": "Bầu không khí tươi mát ở miền quê rất tốt cho sức khỏe thể chất và tinh thần.",
  "friendly & hospitable people": "Người dân quê tôi rất thân thiện, hiếu khách và luôn sẵn sàng giúp đỡ hàng xóm.",
  "peaceful & quiet atmosphere": "Bầu không khí yên bình và tĩnh lặng ở vùng quê giúp con người tĩnh tâm.",
  "lower cost of living": "Chi phí sinh hoạt thấp hơn ở nông thôn giúp giảm bớt gánh nặng tài chính hàng ngày.",
  "lack of modern entertainment": "Việc thiếu các khu giải trí hiện đại khiến giới trẻ ở quê đôi khi cảm thấy nhàm chán.",
  "poor educational & medical facilities": "Cơ sở y tế và giáo dục ở nông thôn vẫn còn nhiều hạn chế so với thành thị.",
  "fewer job opportunities": "Cơ hội việc làm ít hơn khiến nhiều bạn trẻ ở quê phải lên thành phố lập nghiệp.",

  // === Job / Study ===
  "work overtime": "Một nhược điểm của công việc này là tôi phải làm việc ngoài giờ, dẫn đến việc có ít thời gian dành cho gia đình.",
  "third-year university student": "Tôi hiện là sinh viên năm thứ ba đại học ngành Tài chính ngân hàng.",
  "work as an accountant": "Anh ấy làm nhân viên kế toán cho một công ty truyền thông lớn tại Hà Nội.",
  "do homework": "Học sinh cần làm bài tập về nhà đầy đủ trước khi đến lớp.",
  "make presentations": "Kỹ năng thuyết trình trước đám đông đóng vai trò rất quan trọng trong môi trường làm việc hiện đại.",
  "join student clubs": "Tham gia các câu lạc bộ sinh viên giúp bạn tích lũy nhiều kinh nghiệm sống thực tế.",
  "do part-time jobs at weekends": "Nhiều sinh viên đi làm thêm vào cuối tuần để trang trải chi phí sinh hoạt.",
  "be in charge of main tasks": "Tôi chịu trách nhiệm quản lý công việc chính và phân công nhiệm vụ cho đồng nghiệp.",
  "work with clients": "Làm việc trực tiếp với khách hàng đòi hỏi sự kiên nhẫn và giao tiếp khéo léo.",
  "solve client problems": "Giải quyết các vấn đề của khách hàng nhanh chóng giúp nâng cao uy tín của công ty.",
  "contact business partners": "Chúng tôi thường xuyên liên hệ đối tác nước ngoài để mở rộng thị trường kinh doanh.",
  "collaborate with other departments": "Phối hợp hiệu quả với các phòng ban khác giúp dự án hoàn thành đúng tiến độ.",
  "apply learned knowledge and skills": "Công việc này cho phép tôi áp dụng những kiến thức và kỹ năng đã học tại trường.",
  "skills development environment": "Môi trường làm việc năng động tạo điều kiện tốt nhất để phát triển kỹ năng cá nhân.",
  "promotion opportunities": "Nỗ lực làm việc chăm chỉ sẽ mang lại nhiều cơ hội thăng tiến trong sự nghiệp.",
  "friendly and supportive co-workers": "Đồng nghiệp thân thiện và luôn hỗ trợ lẫn nhau là lý do tôi yêu thích công ty này.",
  "spend less time with family": "Làm việc quá bận rộn khiến tôi dành ít thời gian cho gia đình.",
  "long distance from home to company": "Khoảng cách từ nhà đến công ty khá xa nên tôi mất hơn một tiếng di chuyển mỗi ngày.",
  "heavy workload causes exhaustion": "Khối lượng công việc lớn và áp lực tiến độ đôi khi gây mệt mỏi và quá tải.",

  // === Crime ===
  "lack love, care and support": "Trẻ em thiếu sự chăm sóc và tình thương của gia đình dễ bị lôi kéo vào các hành vi sai trái.",
  "parents busy with work": "Cha mẹ quá bận rộn với công việc nên không có nhiều thời gian quản lý con cái.",
  "access violent games": "Tiếp cận các trò chơi bạo lực từ sớm có thể ảnh hưởng tiêu cực đến tâm lý của trẻ.",
  "copy bad internet behaviors": "Nhiều thanh thiếu niên có xu hướng bắt chước các hành vi xấu trên mạng xã hội.",
  "school violence": "Bạo lực học đường đang là vấn đề nhọn nhằn cần sự phối hợp giữa gia đình và nhà trường.",
  "bullying & shoving": "Hành vi bắt nạt và xô xát giữa các học sinh cần được phát hiện và xử lý kịp thời.",
  "threatening others": "Đe dọa người khác là hành vi vi phạm đạo đức và có thể dẫn đến hậu quả pháp lý nghiêm trọng.",
  "lack means to secure a living": "Nhiều người rơi vào con đường phạm tội vì thiếu phương tiện mưu sinh cơ bản.",
  "commit crimes for money": "Một số đối tượng chấp nhận phạm tội để kiếm tiền nhanh chóng.",
  "spend more time with children": "Cha mẹ nên dành nhiều thời gian hơn cho con cái để lắng nghe và chia sẻ.",
  "monitor activities & behaviors": "Giám sát các hoạt động và hành vi của con giúp phát hiện sớm các dấu hiệu bất thường.",
  "give useful advice": "Đưa ra những lời khuyên hữu ích giúp định hướng đúng đắn cho sự phát triển của trẻ.",
  "prevent mistakes early": "Ngăn ngừa sai lầm từ sớm là cách tốt nhất để bảo vệ thế hệ trẻ khỏi tệ nạn.",
  "punish offenders fairly": "Trừng phạt người phạm tội công bằng và nghiêm minh giúp duy trì kỷ cương xã hội.",
  "send to rehabilitation centers": "Đưa người vi phạm đến các trung tâm cải tạo giúp họ nhận thức lại hành vi của mình.",
  "learn good behaviors": "Trong môi trường cải tạo, phạm nhân được học cách cư xử tốt và rèn luyện đạo đức.",
  "get vocational training": "Đào tạo nghề cho người mãn hạn tù giúp họ dễ dàng hòa nhập lại với cộng đồng.",
  "find a job after release": "Tìm kiếm công việc ổn định sau khi ra tù giúp họ không tái phạm tội.",

  // === Health ===
  "eat fruits & fish": "Ăn hoa quả và cá hàng ngày giúp duy trì một cơ thể khỏe mạnh và tăng cường hệ miễn dịch.",
  "do exercise & play sports": "Tập thể dục và chơi thể thao đều đặn là phương pháp tốt nhất để rèn luyện sức khỏe.",
  "have a balanced diet": "Chế độ ăn uống cân bằng đóng vai trò quyết định đối với sức khỏe vóc dáng.",
  "drink enough water": "Uống đủ nước mỗi ngày giúp cơ thể đào thải độc tố và giữ làn da tươi trẻ.",
  "get enough sleep": "Ngủ đủ 8 tiếng mỗi đêm giúp não bộ phục hồi và làm việc hiệu quả vào ngày hôm sau.",
  "fast food & junk food": "Tiêu thụ quá nhiều thức ăn nhanh có thể dẫn đến nguy cơ béo phì và bệnh tim mạch.",
  "stay up late": "Thức khuya thường xuyên suy giảm hệ miễn dịch và gây mệt mỏi mạn tính.",
  "sedentary lifestyle": "Lối sống thụ động ít vận động là nguyên nhân hàng đầu gây ra nhiều bệnh tật hiện đại.",

  // === Machine ===
  "read newspapers online": "Đọc báo trực tuyến giúp tôi cập nhật tin tức thời sự nhanh chóng hàng ngày.",
  "download information": "Máy tính kết nối internet cho phép chúng ta tải nhiều tài liệu phục vụ cho học tập.",
  "learn online & self-study": "Các khóa học trực tuyến tạo điều kiện thuận lợi cho việc tự học mọi lúc mọi nơi.",
  "educational tool": "Máy tính là một công cụ giáo dục tuyệt vời hỗ trợ giảng dạy và truyền đạt kiến thức.",
  "work faster and more efficiently": "Sử dụng phần mềm chuyên nghiệp giúp nhân viên làm việc nhanh và hiệu quả hơn.",
  "typing": "Kỹ năng đánh máy văn bản thành thạo giúp tiết kiệm rất nhiều thời gian làm việc.",
  "printing documents": "Máy in hỗ trợ việc in ấn tài liệu phục vụ cho các cuộc họp quan trọng.",
  "storing data": "Lưu trữ dữ liệu trên máy tính giúp quản lý thông tin an toàn và dễ tra cứu.",
  "save time": "Ứng dụng công nghệ giúp tiết kiệm đáng kể thời gian và công sức lao động.",
  "play games": "Chơi game giải trí điều độ giúp giảm căng thẳng sau những giờ làm việc căng thẳng.",
  "listen to music": "Nghe nhạc thư giãn giúp tinh thần cảm thấy thoải mái và yêu đời hơn.",
  "watch movies": "Xem phim cùng gia đình vào cuối tuần là thói quen giải trí vô cùng ấm áp.",
  "join social forums to share ideas": "Tham gia các diễn đàn mạng xã hội giúp trao đổi kinh nghiệm và chia sẻ ý tưởng mới.",
  "eye strain & shortsightedness": "Nhìn vào màn hình máy tính quá lâu gây mỏi mắt và tăng nguy cơ cận thị.",
  "backache & neck pain": "Sit làm việc sai tư thế trước máy tính dẫn đến đau lưng và đau mỏi vai cổ.",
  "increase risk of obesity": "Lười vận động do dành nhiều thời gian xem TV làm tăng nguy cơ béo phì.",
  "lack of physical exercise": "Sử dụng thiết bị điện tử quá mức khiến trẻ em thiếu vận động thể chất.",
  "waste time on screen": "Dành quá nhiều thời gian trước màn hình làm lãng phí quỹ thời gian quý báu.",
  "computer & game addiction": "Nghiện trò chơi điện tử ảnh hưởng nghiêm trọng đến kết quả học tập của học sinh.",
  "less face-to-face communication": "Lệ thuộc vào mạng xã hội làm giảm sự tương tác và giao tiếp trực tiếp giữa con người.",
  "become passive and isolated": "Sử dụng thiết bị điện tử quá nhiều khiến trẻ trở nên thụ động và cô lập với thế giới xung quanh.",
  "ignore family and friends": "Thói quen dán mắt vào điện thoại khiến nhiều người bỏ mặc gia đình và bạn bè.",
  "limit daily screen time": "Chúng ta nên giới hạn thời gian sử dụng thiết bị điện tử hàng ngày.",
  "take short breaks every 45 minutes": "Nghỉ ngơi ngắn mỗi 45 phút giúp mắt thư giãn và giảm mệt mỏi.",
  "rest eyes frequently": "Chăm sóc và nghỉ ngơi mắt thường xuyên là việc làm cần thiết đối với người làm văn phòng.",
  "play sports & outdoor games": "Tăng cường chơi thể thao ngoài trời giúp cơ thể phát triển khỏe mạnh toàn diện.",
  "hang out with friends": "Đi chơi cùng bạn bè vào cuối tuần giúp gắn kết tình cảm và giải tỏa áp lực.",
  "do physical exercise": "Rèn luyện thể chất thường xuyên giúp nâng cao sức đề kháng chống lại bệnh tật.",
  "control screen time for children": "Cha mẹ cần kiểm soát nghiêm ngặt thời gian sử dụng màn hình của con trẻ.",
  "guide kids to healthy educational content": "Hướng dẫn trẻ em tiếp cận nội dung giáo dục lành mạnh trên internet.",
  "ban devices during meals & bedtime": "Cấm sử dụng thiết bị điện tử trong bữa ăn và trước khi đi ngủ.",

  // === Technology ===
  "stay connected with people around the world": "Công nghệ hiện đại giúp chúng ta giữ liên lạc với mọi người trên khắp thế giới một cách dễ dàng.",
  "keep in touch with friends and family through social media": "Thật tiện lợi khi có thể giữ liên lạc với bạn bè và gia đình thông qua mạng xã hội dù ở xa.",
  "communicate instantly with people far away through phones and the internet": "Chúng ta có thể giao tiếp ngay lập tức với những người ở xa thông qua điện thoại và internet.",
  "get instant access to information": "Người dùng nhận quyền truy cập thông tin ngay lập tức chỉ với vài thao tác tìm kiếm trên mạng.",
  "learn anything, anytime, anywhere with smartphones and computers": "Học sinh có thể học bất cứ điều gì, bất cứ lúc nào, ở bất cứ đâu bằng điện thoại thông minh và máy tính.",
  "complete tasks faster and more efficiently": "Ứng dụng các công cụ kỹ thuật số giúp nhân viên hoàn thành công việc nhanh hơn và hiệu quả hơn.",
  "have many entertainment options": "Sau giờ làm việc, mọi người có nhiều lựa chọn giải trí như xem phim trực tuyến hay chơi trò chơi điện tử.",
  "reduce face-to-face interactions": "Dành quá nhiều thời gian dùng thiết bị điện tử có thể làm giảm tương tác trực tiếp giữa các thành viên.",
  "make us feel lonely and disconnected": "Lạm dụng mạng xã hội đôi khi khiến chúng ta cảm thấy cô đơn và mất kết nối với thế giới thực.",
  "rely too much on technology": "Nhiều người trẻ có xu hướng phụ thuộc quá nhiều vào công nghệ trong các sinh hoạt thường ngày.",
  "avoid doing things manually": "Sự tiện lợi của máy móc khiến con người tránh làm mọi việc theo cách thủ công và trở nên thụ động.",
  "cause distractions": "Các thông báo liên tục từ điện thoại thông minh thường gây mất tập trung trong giờ học và làm việc.",
  "lose focus on important tasks": "Lướt mạng xã hội thường xuyên khiến nhân viên mất tập trung vào các nhiệm vụ quan trọng.",
  "staring at screens for long periods": "Việc nhìn chằm chằm vào màn hình trong thời gian dài mà không nghỉ ngơi có hại cho sức khỏe.",
  "lead to eye strain": "Làm việc quá khuya trước màn hình máy tính có thể dẫn đến mỏi mắt và đau đầu dữ dội.",
  "increase the unemployment rate": "Việc áp dụng dây chuyền tự động hóa có thể làm tăng tỷ lệ thất nghiệp của lao động phổ thông.",
  "ai can replace human workers in certain jobs": "Trí tuệ nhân tạo (AI) có thể thay thế con người trong một số công việc lặp đi lặp lại như nhập dữ liệu.",
  "privacy concerns": "Việc các ứng dụng thu thập dữ liệu cá nhân gây ra nhiều lo ngại về quyền riêng tư đối với người dùng.",
  "personal data can be accessed or shared without consent": "Nếu không được bảo mật tốt, dữ liệu cá nhân có thể bị truy cập hoặc chia sẻ mà không có sự đồng ý.",
  "learn how to use technology wisely": "Mỗi người cần học cách sử dụng công nghệ một cách thông minh để phục vụ tốt cho công việc và cuộc sống.",
  "limit screen time": "Cha mẹ nên đặt ra quy định rõ ràng nhằm hạn chế thời gian sử dụng màn hình của trẻ nhỏ.",
  "protect personal information": "Người dùng cần chủ động bảo vệ thông tin cá nhân khi tham gia các diễn đàn và mạng xã hội.",
  "create strong passwords": "Chuyên gia an ninh mạng khuyến nghị người dùng nên tạo mật khẩu mạnh kết hợp nhiều ký tự phức tạp.",
  "install antivirus software": "Bạn nên cài đặt phần mềm diệt virus trên máy tính để ngăn ngừa các cuộc tấn công mã độc.",
  "be cautious of suspicious links": "Người dùng internet luôn phải cẩn thận với các liên kết đáng ngờ để tránh bị lừa đảo trực tuyến.",

  // === Job / Study ===
  "gain real-world experience": "Đi làm thêm hoặc tham gia dự án thực tế giúp sinh viên có được kinh nghiệm thực tế trước khi tốt nghiệp.",
  "open the mind to new ideas": "Tiếp xúc với môi trường mới và nhiều người khác nhau giúp mở mang đầu óc với những ý tưởng mới.",
  "improve important soft skills": "Các hoạt động nhóm và thuyết trình giúp học sinh cải thiện các kỹ năng mềm quan trọng như giao tiếp và làm việc nhóm.",
  "choose the right future career": "Trải nghiệm nhiều công việc thực tập khác nhau giúp người trẻ chọn đúng nghề nghiệp tương lai phù hợp.",
  "make the CV look better": "Tích cực tham gia hoạt động tình nguyện và các chứng chỉ kỹ năng sẽ làm cho hồ sơ xin việc đẹp hơn trong mắt nhà tuyển dụng.",
  "find study materials easily online": "Nhờ có mạng internet tốc độ cao, sinh viên có thể tìm tài liệu học tập dễ dàng trên mạng cho bài tập và nghiên cứu.",
  "learn how to study independently": "Các khóa học trực tuyến khuyến khích người học học cách tự học một mình và nâng cao tính tự giác.",
  "make friends and meet helpful people": "Tham gia câu lạc bộ học thuật là cơ hội tốt để kết bạn và gặp gỡ những người có ích trong cuộc sống.",
  "feel refreshed and ready to study": "Nghỉ ngơi và vận động thể chất điều độ giúp bạn cảm thấy sảng khoái và sẵn sàng học tập với năng lượng cao.",
  "improve problem-solving skills": "Đối mặt với các tình huống thực tế trong công việc giúp bạn cải thiện kỹ năng giải quyết vấn đề hiệu quả.",
  "fall behind in school": "Nhận quá nhiều ca làm thêm buổi tối có thể khiến sinh viên bị tụt lại phía sau trong việc học ở trường.",
  "get distracted by social media and phones": "Thông báo liên tục dễ làm người học bị phân tâm bởi mạng xã hội và điện thoại trong giờ tự học.",
  "have difficulty catching up with lessons": "Nghỉ học quá nhiều buổi sẽ khiến học sinh gặp khó khăn khi theo kịp bài học trên lớp.",
  "feel tired and stressed from too much work": "Cố gắng hoàn thành quá nhiều nhiệm vụ cùng lúc khiến người trẻ cảm thấy mệt mỏi và căng thẳng vì quá nhiều việc.",
  "find it hard to manage time": "Nhiều bạn trẻ thấy khó quản lý thời gian giữa việc học tập, làm thêm và sinh hoạt cá nhân.",
  "lose interest in going back to school": "Kiếm được thu nhập sớm đôi khi khiến một số bạn trẻ mất hứng thú với việc quay lại trường học.",
  "cheat more easily on tests": "Việc lạm dụng công cụ trực tuyến khiến một số học sinh gian lận bài kiểm tra dễ dàng hơn.",
  "rely too much on the internet and apps": "Học sinh phụ thuộc quá nhiều vào internet và ứng dụng giải bài tập có nguy cơ giảm khả năng tư duy độc lập.",
  "spend too much money": "Tham gia các hoạt động vui chơi giải trí không có kế hoạch khiến sinh viên tiêu tốn quá nhiều tiền.",
  "forget basic knowledge": "Nếu không ôn tập kiến thức thường xuyên, người học rất dễ quên kiến thức cơ bản của các môn học nền tảng."
};

/**
 * Cleanly extracts Vietnamese meaning from mindmap structure or notes
 */
function extractCoreVietnameseMeaning(item: VocabPromptItem): string {
  let coreVi = "";
  if (item.meaning && item.meaning.includes("→")) {
    const parts = item.meaning.split("→");
    coreVi = parts[parts.length - 1].trim();
  } else if (item.meaning) {
    coreVi = item.meaning.trim();
  }

  // Remove parentheses contents like (làm việc ngoài giờ) or (sinh viên)
  coreVi = coreVi.replace(/\([^)]*\)/g, "").trim();
  
  if (!coreVi || coreVi === "Cụm từ chủ điểm") {
    if (item.notes) {
      const match = item.notes.match(/\(([^)]+)\)/);
      if (match) coreVi = match[1].trim();
      else coreVi = item.notes.split(",")[0].trim();
    }
  }

  if (!coreVi) coreVi = item.word;
  return coreVi;
}

/**
 * Smart generator that crafts natural, grammatically correct Vietnamese translation prompts for ANY vocabulary item.
 * Guarantee: NEVER returns generic phrases like "Hãy đặt 1 câu...".
 */
export function getSmartVietnamesePrompt(item: VocabPromptItem): string {
  if (!item || !item.word) {
    return "Hãy dịch câu tiếng Anh sau đây sang tiếng Việt để chuẩn bị luyện viết.";
  }

  const wordKey = item.word.trim();
  const lowerKey = wordKey.toLowerCase();

  // 1. Check exact or lower case match in static dictionary
  if (vietnamesePromptMap[wordKey]) return vietnamesePromptMap[wordKey];
  if (vietnamesePromptMap[lowerKey]) return vietnamesePromptMap[lowerKey];
  if (item.id && vietnamesePromptMap[item.id]) return vietnamesePromptMap[item.id];

  // 2. Extract core Vietnamese meaning
  const coreVi = extractCoreVietnameseMeaning(item);
  const lowerCore = coreVi.charAt(0).toLowerCase() + coreVi.slice(1);
  const contextText = `${item.meaning || ''} ${item.notes || ''} ${item.word}`.toLowerCase();

  // 3. Category/Context-based sentence templates
  if (
    contextText.includes("không thích") || 
    contextText.includes("bất lợi") || 
    contextText.includes("tác hại") || 
    contextText.includes("nhược điểm") || 
    contextText.includes("disadvantage") || 
    contextText.includes("drawback") || 
    contextText.includes("xấu") || 
    contextText.includes("nguy cơ") || 
    contextText.includes("vấn đề") || 
    contextText.includes("tội phạm") || 
    contextText.includes("ô nhiễm")
  ) {
    return `Một bất lợi lớn là ${lowerCore}, gây ra nhiều ảnh hưởng không tốt đến cuộc sống.`;
  }

  if (
    contextText.includes("yêu thích") || 
    contextText.includes("ưu điểm") || 
    contextText.includes("lợi ích") || 
    contextText.includes("advantage") || 
    contextText.includes("benefit") || 
    contextText.includes("tốt") || 
    contextText.includes("thuận lợi") || 
    contextText.includes("tự hào")
  ) {
    return `Một ưu điểm nổi bật là ${lowerCore}, giúp mang lại nhiều trải nghiệm tích cực.`;
  }

  if (
    contextText.includes("giải pháp") || 
    contextText.includes("biện pháp") || 
    contextText.includes("solution") || 
    contextText.includes("cách")
  ) {
    return `Chúng ta nên áp dụng giải pháp ${lowerCore} để khắc phục tình trạng này hiệu quả.`;
  }

  if (
    contextText.includes("hoạt động") || 
    contextText.includes("activity") || 
    contextText.includes("thói quen") || 
    contextText.includes("sở thích")
  ) {
    return `Vào thời gian rảnh rỗi, tôi rất thích ${lowerCore} cùng gia đình và bạn bè.`;
  }

  if (
    contextText.includes("ngoại hình") || 
    contextText.includes("tính cách") || 
    contextText.includes("con người") || 
    contextText.includes("đặc điểm")
  ) {
    return `Người bạn của tôi có đặc điểm nổi bật là ${lowerCore}, luôn tạo cảm giác dễ chịu cho người xung quanh.`;
  }

  if (
    contextText.includes("địa điểm") || 
    contextText.includes("phòng") || 
    contextText.includes("thiết bị") || 
    contextText.includes("phương tiện") || 
    contextText.includes("dụng cụ") || 
    contextText.includes("máy")
  ) {
    return `Sử dụng ${lowerCore} mang lại sự thuận tiện rất lớn cho công việc và sinh hoạt hàng ngày.`;
  }

  // Fallback sentence prompt
  return `Trong đời sống hàng ngày, việc ${lowerCore} đóng vai trò quan trọng và có ý nghĩa thực tế.`;
}
