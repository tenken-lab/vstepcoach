export interface MindmapNode {
  id: string;
  label: string;
  labelVi?: string;
  notes?: string;
  example?: string;
  children?: MindmapNode[];
}

export interface VstepTopic {
  id: string;
  title: string;
  titleVi: string;
  icon: string; // Lucide icon name
  description: string;
  mindmap: MindmapNode;
  prompts: {
    writing: string;
    speaking: string;
  };
}

export function cleanLabelAndExtractVietnamese(label: string): { cleanLabel: string; extractedVi?: string } {
  const vnParenthesesRegex = /\s*[(（]([^)）]*[^\x00-\x7F][^)）]*)[)）]/gi;
  
  let cleanLabel = label;
  let extractedVi: string | undefined = undefined;
  
  const match = label.match(vnParenthesesRegex);
  if (match) {
    const innerMatch = match[0].match(/[(（](.*?)[)）]/);
    if (innerMatch) {
      extractedVi = innerMatch[1].trim();
    }
    cleanLabel = label.replace(vnParenthesesRegex, "").trim();
  }
  
  return { cleanLabel, extractedVi };
}

export function parseNotesToList(notes: string): { label: string; labelVi?: string }[] {
  if (!notes) return [];
  
  const trimmed = notes.trim();
  const lowercaseNotes = trimmed.toLowerCase();
  if (
    lowercaseNotes.startsWith("to be downgraded") || 
    lowercaseNotes.startsWith("học sinh, sinh viên") ||
    lowercaseNotes.startsWith("sound sleep") ||
    lowercaseNotes.startsWith("nhỏ hơn") ||
    lowercaseNotes.startsWith("tỉ lệ tội phạm") ||
    lowercaseNotes.startsWith("trường học") ||
    lowercaseNotes.startsWith("cha mẹ") ||
    lowercaseNotes.startsWith("bão, tối") ||
    lowercaseNotes.includes("many scientific papers") ||
    lowercaseNotes.includes("should spend more time")
  ) {
    return [];
  }
  
  const items: string[] = [];
  let current = "";
  let parenDepth = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === "(" || char === "（") parenDepth++;
    else if (char === ")" || char === "）") parenDepth--;
    
    if (char === "," && parenDepth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    items.push(current.trim());
  }
  
  if (items.length <= 1 && trimmed.length > 35) {
    return [];
  }
  
  const parsedItems: { label: string; labelVi?: string }[] = [];
  for (const item of items) {
    const cleanItem = item.trim();
    if (!cleanItem) continue;
    
    const parenRegex = /^(.*?)\s*[(（]([^)）]*)[)）]$/;
    const match = cleanItem.match(parenRegex);
    if (match) {
      const label = match[1].trim();
      const labelVi = match[2].trim();
      if (label && label.split(/\s+/).length <= 12 && labelVi.length <= 60) {
        parsedItems.push({ label, labelVi });
      }
    } else {
      if (cleanItem.split(/\s+/).length <= 12 && cleanItem.length < 100) {
        parsedItems.push({ label: cleanItem });
      }
    }
  }
  
  return parsedItems;
}

export function enrichMindmapTree(node: MindmapNode): MindmapNode {
  const { cleanLabel, extractedVi } = cleanLabelAndExtractVietnamese(node.label);
  
  let currentLabelVi = node.labelVi || "";
  if (extractedVi) {
    if (currentLabelVi) {
      currentLabelVi = `${currentLabelVi} (${extractedVi})`;
    } else {
      currentLabelVi = extractedVi;
    }
  }
  
  const parsedItems = parseNotesToList(node.notes || "");
  let newChildren = node.children ? node.children.map(enrichMindmapTree) : [];
  
  if (parsedItems.length > 0) {
    const parsedNodes: MindmapNode[] = parsedItems.map((item, index) => ({
      id: `${node.id}-parsed-${index}`,
      label: item.label,
      labelVi: item.labelVi,
      notes: "",
    }));
    
    newChildren = [...newChildren, ...parsedNodes];
  }
  
  return {
    ...node,
    label: cleanLabel,
    labelVi: currentLabelVi || undefined,
    children: newChildren.length > 0 ? newChildren : undefined,
  };
}

const rawVstepTopics: VstepTopic[] = [
  {
    id: "transport",
    title: "Transport",
    titleVi: "Giao thông",
    icon: "Car",
    description: "Các cụm từ chủ đề Giao thông, so sánh phương tiện cá nhân và công cộng, ưu/nhược điểm.",
    mindmap: {
      id: "transport-root",
      label: "Public transport",
      labelVi: "Phương tiện công cộng",
      children: [
        {
          id: "transport-vehicles",
          label: "Vehicles",
          labelVi: "Các loại phương tiện",
          children: [
            {
              id: "transport-v-bus",
              label: "Bus",
              labelVi: "Xe buýt",
              example: "The bus is the most common and affordable public vehicle in cities."
            },
            {
              id: "transport-v-train",
              label: "Train",
              labelVi: "Tàu hỏa / Tàu điện",
              example: "Travelling by train is fast and helps avoid traffic jams."
            },
            {
              id: "transport-v-coach",
              label: "Coach",
              labelVi: "Xe khách",
              example: "Taking the coach allows me to take a nap after a tiring workday."
            },
            {
              id: "transport-v-airplane",
              label: "Airplane",
              labelVi: "Máy bay",
              example: "Airplanes are ideal when travelling long distances or going abroad."
            }
          ]
        },
        {
          id: "transport-advantages",
          label: "Advantages (Thuận lợi)",
          labelVi: "Lợi ích của phương tiện công cộng",
          children: [
            {
              id: "transport-adv-safer",
              label: "Be safer",
              labelVi: "An toàn hơn",
              notes: "have fewer accidents (ít tai nạn hơn)",
              example: "Using the train is generally considered to be safer because railways have fewer accidents."
            },
            {
              id: "transport-adv-weather",
              label: "Never think about the weather",
              labelVi: "Không lo thời tiết xấu",
              notes: "Bão, tối (rain, storm, sun, dark at night)",
              children: [
                {
                  id: "transport-adv-weather-avoid",
                  label: "Avoid getting wet, dust",
                  labelVi: "Tránh bị ướt, bụi bẩn",
                  example: "Commuting by bus helps me avoid getting wet during heavy storms."
                }
              ]
            },
            {
              id: "transport-adv-comfort",
              label: "Feel comfortable and relaxed",
              labelVi: "Cảm giác thoải mái, thư giãn",
              children: [
                {
                  id: "transport-adv-comfort-listen",
                  label: "Listen to music & read books",
                  labelVi: "Nghe nhạc và đọc sách",
                  example: "I can listen to music or read books while riding the subway."
                },
                {
                  id: "transport-adv-comfort-nap",
                  label: "Take a nap",
                  labelVi: "Chợp mắt một lúc",
                  example: "Taking the coach allows me to take a nap after a tiring workday."
                },
                {
                  id: "transport-adv-comfort-view",
                  label: "Enjoy the roadside view",
                  labelVi: "Ngắm cảnh ven đường",
                  notes: "observe daily activities (quan sát sinh hoạt của mọi người)",
                  example: "It is interesting to enjoy the roadside view and watch daily activities of people."
                }
              ]
            },
            {
              id: "transport-adv-convenient",
              label: "Be convenient and fast",
              labelVi: "Tiện lợi và nhanh chóng",
              notes: "when travel abroad/far: airplane (khi đi xa/ra nước ngoài: máy bay)",
              children: [
                {
                  id: "transport-adv-convenient-wherever",
                  label: "Travel wherever I want and whenever I want",
                  labelVi: "Đi bất cứ nơi nào, bất kỳ lúc nào"
                }
              ]
            },
            {
              id: "transport-adv-cheap",
              label: "Cheap (bus)",
              labelVi: "Giá rẻ (xe buýt)",
              notes: "student ticket discount (thẻ học sinh/sinh viên được giảm giá vé)",
              example: "Bus fare is very cheap, and students can get a discount with their student ID card."
            }
          ]
        },
        {
          id: "transport-disadvantages",
          label: "Disadvantages (Bất lợi)",
          labelVi: "Hạn chế của phương tiện công cộng",
          children: [
            {
              id: "transport-dis-inconvenient",
              label: "Be inconvenient",
              labelVi: "Bất tiện",
              children: [
                {
                  id: "transport-dis-slow",
                  label: "Run slowly",
                  labelVi: "Chạy chậm",
                  notes: "transport infrastructure is in bad conditions (Cơ sở hạ tầng kém)"
                },
                {
                  id: "transport-dis-waiting",
                  label: "Or have long waiting times",
                  labelVi: "Chờ đợi lâu (it takes 5-10 mins/ wait such a long time for the bus)"
                }
              ]
            },
            {
              id: "transport-dis-disease",
              label: "Have a higher chance of getting diseases",
              labelVi: "Nguy cơ mắc bệnh truyền nhiễm cao",
              notes: "Especially during Covid-19 pandemic in the last 2 years",
              example: "Passengers face a higher chance of getting infectious diseases in packed carriages."
            },
            {
              id: "transport-dis-crowded",
              label: "Be pretty crowded at rush hours",
              labelVi: "Khá đông đúc vào giờ cao điểm",
              notes: "Traffic jams (Tầm 6 giờ khi người lao động, học sinh tan tầm)",
              example: "Public buses are usually pretty crowded at rush hours."
            },
            {
              id: "transport-dis-downgraded",
              label: "Public transport systems are quite bad",
              labelVi: "Hệ thống xuống cấp",
              notes: "To be downgraded = be going to pot = degrade = fall apart = go down",
              children: [
                {
                  id: "transport-dis-ac",
                  label: "Air conditioner is broken down / Xe xuống cấp",
                  labelVi: "Điều hòa hỏng, xe chạy chậm",
                  example: "Many public transport systems are going to pot with broken down air conditioners."
                }
              ]
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the advantages and disadvantages of using public transport in big cities.",
      speaking: "VSTEP Speaking Part 2: Some people prefer using public transport like buses or trains, while others prefer private vehicles like motorbikes. Which one do you prefer and why? Use vocabulary from the mindmap."
    }
  },
  {
    id: "city",
    title: "City Life",
    titleVi: "Cuộc sống thành thị",
    icon: "Building2",
    description: "Đời sống ở thành phố lớn, các địa điểm nổi tiếng, ưu và nhược điểm của việc sống ở thành thị.",
    mindmap: {
      id: "city-root",
      label: "City Life",
      labelVi: "Cuộc sống Thành Phố",
      children: [
        {
          id: "city-places",
          label: "Places (Địa điểm)",
          labelVi: "Các địa điểm trong thành phố",
          notes: "restaurants (nhà hàng), cinemas (rạp chiếu phim), shopping malls (trung tâm thương mại), skyscrapers (tòa nhà chọc trời)",
          example: "Big cities are full of towering skyscrapers, high-end shopping malls, and fancy restaurants."
        },
        {
          id: "city-advantages",
          label: "Advantages (Thuận lợi)",
          labelVi: "Ưu điểm của cuộc sống thành phố",
          children: [
            {
              id: "city-adv-interesting",
              label: "City life is interesting",
              labelVi: "Cuộc sống thú vị, sôi nổi",
              notes: "have many entertainments (nhiều khu giải trí), restaurants (nhà hàng), parks (công viên), cinemas (rạp chiếu phim)",
              example: "City life is highly interesting because we have access to many places of entertainment."
            },
            {
              id: "city-adv-convenient",
              label: "City life is more convenient",
              labelVi: "Tiện lợi hơn",
              notes: "live near hospitals (sống gần bệnh viện), live near schools (sống gần trường học), live near supermarkets (sống gần siêu thị)",
              example: "Living in the city is very convenient since you are always near major hospitals and schools."
            },
            {
              id: "city-adv-income",
              label: "Have higher incomes",
              labelVi: "Thu nhập cao hơn",
              notes: "save more money (tiết kiệm nhiều tiền hơn), buy what I like (mua những gì mình thích)",
              example: "Many people move to the city to secure a higher income and save more money for their families."
            },
            {
              id: "city-adv-jobs",
              label: "Have more career opportunities",
              labelVi: "Nhiều cơ hội nghề nghiệp",
              notes: "diversity of fields (đa dạng lĩnh vực), lots of choices (nhiều sự lựa chọn), better salary (mức lương tốt hơn), advance experiences & skills (nâng cao kinh nghiệm & kỹ năng), enrich knowledge (trau dồi kiến thức)",
              example: "Cities offer more career opportunities with better salaries and chances to advance your skills."
            }
          ]
        },
        {
          id: "city-disadvantages",
          label: "Disadvantages (Bất lợi)",
          labelVi: "Nhược điểm của cuộc sống thành phố",
          children: [
            {
              id: "city-dis-polluted",
              label: "It has polluted environment",
              labelVi: "Môi trường bị ô nhiễm",
              notes: "have polluted air (không khí ô nhiễm), fewer trees (ít cây xanh), rivers & mountains (sông núi), heavy traffic (giao thông đông đúc)",
              example: "The metropolitan area has a polluted environment with heavy traffic and scarce trees."
            },
            {
              id: "city-dis-expensive",
              label: "The cost of living in the city is expensive",
              labelVi: "Chi phí sinh hoạt đắt đỏ",
              notes: "spend more money (tốn nhiều tiền hơn)",
              example: "The cost of living in the city is expensive, forcing citizens to spend more money on daily items."
            },
            {
              id: "city-dis-dangerous",
              label: "City life is more dangerous",
              labelVi: "Cuộc sống nguy hiểm hơn",
              notes: "higher crime rate (tỉ lệ tội phạm cao hơn), easy to be lured into social evils (dễ sa vào tệ nạn xã hội), drinking (nhậu nhẹt), drugs (ma túy), gambling (cờ bạc)",
              example: "City life can be dangerous as residents are easily attracted by social evils like drugs and gambling."
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the advantages and disadvantages of living in a big city.",
      speaking: "VSTEP Speaking Part 3: Discuss the statement: 'City life is more advantageous than countryside life.' Provide arguments supporting and opposing this statement."
    }
  },
  {
    id: "countryside",
    title: "Countryside",
    titleVi: "Nông thôn",
    icon: "Trees",
    description: "Đặc điểm cuộc sống miền quê, không khí trong lành, lối sống cộng đồng, những mặt hạn chế.",
    mindmap: {
      id: "countryside-root",
      label: "Countryside = rural area",
      labelVi: "Cuộc sống miền quê",
      children: [
        {
          id: "country-places",
          label: "Places (Đặc trưng)",
          labelVi: "Hình ảnh đồng quê, thiên nhiên",
          notes: "rice fields (cánh đồng lúa), rivers (dòng sông), mountains (ngọn núi)",
          example: "The countryside is characterized by endless rice fields, winding rivers, and green mountains."
        },
        {
          id: "country-benefits",
          label: "Benefits / Advantages (Lợi ích)",
          labelVi: "Lợi ích của cuộc sống thôn quê",
          children: [
            {
              id: "country-ben-environment",
              label: "Bring me a clean environment",
              labelVi: "Môi trường trong sạch",
              notes: "fresher air (không khí trong lành hơn), enjoy clean air (thưởng thức không khí sạch), many trees (nhiều cây xanh), rivers & mountains (sông núi)",
              children: [
                {
                  id: "country-ben-env-feel",
                  label: "Feel comfortable, relax, happy",
                  labelVi: "Thoải mái, thư giãn (good for mental health)",
                  example: "The fresh air and beautiful landscape in rural areas help me feel comfortable and happy."
                }
              ]
            },
            {
              id: "country-ben-cheap",
              label: "The cost of living is cheap",
              labelVi: "Chi phí sinh hoạt rẻ",
              notes: "save a lot of money (tiết kiệm được nhiều tiền)",
              example: "Since the cost of living is cheap, you can easily save a lot of money in the countryside."
            },
            {
              id: "country-ben-friendly",
              label: "People are more friendly, opener",
              labelVi: "Con người thân thiện, cởi mở",
              notes: "hospitable residents (mến khách), welcome new neighbors (chào đón hàng xóm mới), live near each other (sống gần gũi hỗ trợ lẫn nhau)",
              example: "Rural residents are very hospitable; they live near each other and always offer help."
            }
          ]
        },
        {
          id: "country-drawbacks",
          label: "Drawbacks / Disadvantages (Hạn chế)",
          labelVi: "Bất lợi của cuộc sống nông thôn",
          children: [
            {
              id: "country-draw-income",
              label: "Have lower incomes",
              labelVi: "Thu nhập thấp hơn",
              notes: "lower income than in the city (thu nhập thấp hơn so với thành phố)",
              example: "Country people generally have lower incomes due to fewer industrial jobs."
            },
            {
              id: "country-draw-boring",
              label: "Life is boring",
              labelVi: "Cuộc sống tẻ nhạt, nhàm chán",
              notes: "lack places of entertainment (thiếu khu giải trí), restaurants (nhà hàng), public parks (công viên công cộng), cinemas (rạp chiếu phim), downtown boutiques (cửa hàng thời trang trung tâm)",
              example: "Life is somewhat boring because there are no shopping malls or downtown boutiques."
            },
            {
              id: "country-draw-education",
              label: "Get access to education & technology - more difficult",
              labelVi: "Khó tiếp cận giáo dục & công nghệ",
              notes: "slower development in education and technology (trường học, internet, công nghệ phát triển chậm hơn)",
              example: "Getting access to high-quality education and modern technology is much more difficult here."
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the advantages and disadvantages of living in the countryside.",
      speaking: "VSTEP Speaking Part 2: Your friend wants to move to the countryside to live a peaceful life but is worried about the boring environment. What advice would you give her?"
    }
  },
  {
    id: "health",
    title: "Health",
    titleVi: "Sức khỏe",
    icon: "HeartPulse",
    description: "Thói quen tốt/xấu, các bệnh thường gặp trong thời đại số và cách duy trì lối sống lành mạnh.",
    mindmap: {
      id: "health-root",
      label: "Health (Sức khoẻ)",
      labelVi: "Thói quen tốt, xấu và bệnh tật",
      children: [
        {
          id: "health-good-habits",
          label: "Good habits for healthy lifestyle",
          labelVi: "Thói quen tốt",
          children: [
            {
              id: "health-good-food",
              label: "Eat healthy food",
              labelVi: "Ăn thực phẩm lành mạnh",
              notes: "eat fruits & fish (ăn hoa quả và cá), eat vegetables (ăn rau củ), drink 2 liters of water everyday (uống 2 lít nước mỗi ngày)",
              example: "Eating healthy food such as fruits and fish, and drinking plenty of water, is highly recommended."
            },
            {
              id: "health-good-less",
              label: "Eat less meat, fast food & junk food",
              labelVi: "Ăn ít thịt, đồ ăn nhiều dầu mỡ & đồ ăn nhanh",
              example: "Reducing intake of fast food and junk food is crucial for a healthy heart."
            },
            {
              id: "health-good-exercise",
              label: "Exercise everyday",
              labelVi: "Tập thể dục hàng ngày",
              notes: "manage weight (quản lý cân nặng), strengthen muscles and bones (tăng cường cơ và xương), reduce the risk of disease (giảm nguy cơ mắc bệnh)",
              example: "Scientific research shows that regular exercise everyday can strengthen muscles and reduce disease risk."
            },
            {
              id: "health-good-checkup",
              label: "Have a regular health check-up",
              labelVi: "Khám sức khỏe định kỳ",
              notes: "visit a doctor regularly (khám bác sĩ định kỳ), find out diseases early (phát hiện bệnh sớm), relieve mental stress (giảm căng thẳng tinh thần)",
              example: "Having a regular health check-up helps you find out any diseases soon and stay safe."
            },
            {
              id: "health-good-mental",
              label: "Control emotion & avoid stress",
              labelVi: "Kiểm soát cảm xúc, tránh áp lực",
              notes: "sound sleep (ngủ sâu giấc), limit alcohol intake (hạn chế thức uống có cồn), stop smoking (bỏ hút thuốc)"
            },
            {
              id: "health-good-benefits",
              label: "Benefits: stay healthy, keep fit, better immune system",
              labelVi: "Lợi ích: Khỏe mạnh, giữ dáng, hệ miễn dịch tốt hơn",
              notes: "make us strong and relaxed (giúp cơ thể khỏe mạnh và thư thái), maintain good health (duy trì sức khỏe tốt), improve social life (cải thiện đời sống xã hội)"
            }
          ]
        },
        {
          id: "health-bad-habits",
          label: "Bad habits & Problems",
          labelVi: "Thói quen xấu & Các vấn đề sức khỏe",
          children: [
            {
              id: "health-bad-list",
              label: "Negative habits",
              labelVi: "Các thói quen xấu",
              notes: "eat unhealthy food (ăn đồ ăn không lành mạnh), lack of sleep (thiếu ngủ), worry too much (lo lắng quá nhiều), lack of regular exercise (thiếu luyện tập), skip health checkups (bỏ qua khám sức khỏe)",
              example: "Lack of sleep and worrying too much can be major causes of physical and mental illnesses."
            },
            {
              id: "health-bad-problems",
              label: "Problems & Diseases",
              labelVi: "Bệnh tật và triệu chứng",
              notes: "increase health risks (tăng rủi ro sức khỏe), high cholesterol level (lượng cholesterol cao), inability to focus on work (không thể tập trung công việc), easy to get tired and ill (dễ mệt mỏi và ốm)",
              children: [
                {
                  id: "health-bad-disease-list",
                  label: "Common Diseases",
                  labelVi: "Các bệnh thường gặp",
                  notes: "obesity (béo phì), diabetes (tiểu đường), heart disease (bệnh tim mạch), sleep disturbance (rối loạn giấc ngủ), high blood pressure (cao huyết áp)"
                }
              ]
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the causes of obesity among young people today and suggesting some solutions.",
      speaking: "VSTEP Speaking Part 3: Discuss the importance of regular exercise and a balanced diet in modern life. How do these habits affect physical and mental health?"
    }
  },
  {
    id: "environment",
    title: "Environment",
    titleVi: "Môi trường",
    icon: "Leaf",
    description: "Thói quen bảo vệ môi trường, hậu quả của biến đổi khí hậu và các giải pháp thực tế.",
    mindmap: {
      id: "environment-root",
      label: "Environment (Môi trường)",
      labelVi: "Thói quen và tác động tới môi trường",
      children: [
        {
          id: "env-good-habits",
          label: "Good habits (Thói quen tốt)",
          labelVi: "Thói quen bảo vệ môi trường",
          children: [
            {
              id: "env-good-reuse",
              label: "Reuse and recycle products",
              labelVi: "Tái sử dụng và tái chế sản phẩm",
              notes: "plastic bottles (chai nhựa), plastic bags (túi nilon), glass jars (chai lọ thủy tinh)",
              example: "We should reuse and recycle plastic products to keep our oceans clean."
            },
            {
              id: "env-good-energy",
              label: "Consume less energy / save energy",
              labelVi: "Tiêu thụ ít năng lượng / tiết kiệm năng lượng",
              notes: "save electricity and water (tiết kiệm điện và nước sinh hoạt)",
              example: "Consuming less energy in our households is a simple way to protect natural resources."
            },
            {
              id: "env-good-trash",
              label: "Sort trash (phân loại rác thải)",
              labelVi: "Phân loại rác tại nguồn",
              example: "Sorting trash into organic and inorganic bins makes recycling much more effective."
            },
            {
              id: "env-good-reusable",
              label: "Use more reusable products",
              labelVi: "Sử dụng sản phẩm tái sử dụng nhiều lần",
              example: "Switching from plastic cups to reusable ones helps minimize land waste."
            }
          ]
        },
        {
          id: "env-benefits",
          label: "Benefits of protecting environment",
          labelVi: "Lợi ích khi bảo vệ môi trường",
          notes: "long-term environmental protection (bảo vệ môi trường lâu dài)",
          children: [
            {
              id: "env-ben-resources",
              label: "Conserve natural resources",
              labelVi: "Bảo tồn tài nguyên thiên nhiên"
            },
            {
              id: "env-ben-pollution",
              label: "Reduce levels of pollution",
              labelVi: "Giảm thiểu mức độ ô nhiễm"
            },
            {
              id: "env-ben-global",
              label: "Tackle some causes of global warming",
              labelVi: "Giải quyết nguyên nhân gây nóng lên toàn cầu",
              example: "By planting more trees, we can tackle some causes of global warming."
            }
          ]
        },
        {
          id: "env-drawbacks",
          label: "Drawbacks / Bad habits",
          labelVi: "Thói quen xấu & Hậu quả",
          notes: "do not reuse products (không tái sử dụng sản phẩm), consume more energy (tiêu thụ nhiều năng lượng), do not sort trash (không phân loại rác), rarely use reusable items (ít dùng đồ tái sử dụng)",
          children: [
            {
              id: "env-draw-warming",
              label: "Cause global warming / climate change",
              labelVi: "Gây nóng lên toàn cầu / biến đổi khí hậu"
            },
            {
              id: "env-draw-pollution",
              label: "Make the environment polluted",
              labelVi: "Làm ô nhiễm môi trường (pollution: sự ô nhiễm, pollute: làm ô nhiễm)"
            },
            {
              id: "env-draw-exploit",
              label: "Exploit natural resources",
              labelVi: "Khai thác triệt để tài nguyên thiên nhiên",
              example: "Exploiting natural resources excessively will lead to ecological imbalances."
            },
            {
              id: "env-draw-emissions",
              label: "Increase greenhouse gas emissions",
              labelVi: "Gia tăng lượng khí thải nhà kính"
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the actions that governments and citizens can take to reduce environmental pollution.",
      speaking: "VSTEP Speaking Part 2: There are several ways to reduce plastic waste, such as banning plastic bags, charging high taxes on plastic, or educating the public. Which one do you think is the most effective?"
    }
  },
  {
    id: "hobbies",
    title: "Hobbies",
    titleVi: "Sở thích",
    icon: "Music",
    description: "Các loại hình sở thích, lợi ích giải trí, rủi ro nghiện game/mạng xã hội và giải pháp kiểm soát.",
    mindmap: {
      id: "hobbies-root",
      label: "Hobbies / Leisure activities",
      labelVi: "Sở thích & Hoạt động giải trí",
      notes: "hobby = pastime (sở thích / trò tiêu khiển), interest (sự hứng thú), recreational activity (hoạt động giải trí), leisure pursuit (mục tiêu giải trí lúc rảnh)",
      children: [
        {
          id: "hob-types",
          label: "Types (Các loại sở thích)",
          labelVi: "Các hoạt động giải trí phổ biến",
          notes: "listen to music (nghe nhạc), read books (đọc sách), watch films (xem phim), go shopping (đi mua sắm), play sports (tập thể thao), swimming (bơi lội), tennis & table tennis (quần vợt & bóng bàn), football (bóng đá), go jogging (đi chạy bộ)",
          example: "Playing sports like table tennis or going jogging are excellent free-time activities."
        },
        {
          id: "hob-advantages",
          label: "Advantages (Lợi ích)",
          labelVi: "Tác động tích cực",
          children: [
            {
              id: "hob-adv-happy",
              label: "Bring happiness to me and my family",
              labelVi: "Mang lại hạnh phúc",
              notes: "make me relaxed (giúp tôi thư giãn), feel much happier (cảm thấy hạnh phúc hơn), talk and share joy with others (trò chuyện và chia sẻ niềm vui)",
              example: "My pastime brings happiness to my life and makes me feel much happier."
            },
            {
              id: "hob-adv-stress",
              label: "Reduce the stress of everyday hard work and study",
              labelVi: "Giảm căng thẳng mệt mỏi từ công việc, học tập",
              example: "Listening to instrumental music is a great way to reduce the stress of everyday hard work."
            },
            {
              id: "hob-adv-creativity",
              label: "Develop imagination and creativity",
              labelVi: "Phát triển trí tưởng tượng & sự sáng tạo"
            },
            {
              id: "hob-adv-cognitive",
              label: "Broaden knowledge & develop cognitive skills",
              labelVi: "Mở rộng kiến thức & phát triển kỹ năng nhận thức",
              notes: "enhance brainpower (nâng cao trí tuệ), develop logical thinking (phát triển tư duy logic), analyze and solve problems (phân tích và giải quyết vấn đề)"
            }
          ]
        },
        {
          id: "hob-disadvantages",
          label: "Disadvantages & Solutions",
          labelVi: "Tác hại (game bạo lực) & Giải pháp",
          children: [
            {
              id: "hob-dis-violence",
              label: "Games contain a great deal of violence",
              labelVi: "Game chứa nhiều yếu tố bạo lực",
              notes: "increase aggressive feelings (tăng cảm giác hung hăng), violent thoughts & behaviors (suy nghĩ và hành vi bạo lực)",
              example: "Many computer games contain a great deal of violence, leading to aggressive behaviors in teenagers."
            },
            {
              id: "hob-dis-neglect",
              label: "Not focus on their duties and study",
              labelVi: "Sao nhãng nghĩa vụ và học tập",
              notes: "perform worse at school (kết quả học tập ngày càng sút kém)"
            },
            {
              id: "hob-sol-list",
              label: "Solutions (Giải pháp)",
              labelVi: "Cách khắc phục",
              notes: "choose suitable computer games (chọn game phù hợp), ban violent video games (cấm chơi game bạo lực), set limits on playing time (giới hạn thời gian chơi game)"
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the benefits of having a hobby, and the negative effects when someone spends too much time on it.",
      speaking: "VSTEP Speaking Part 2: Some parents argue that playing video games is purely harmful to children. To what extent do you agree or disagree? Suggest how to play games productively."
    }
  },
  {
    id: "job-study",
    title: "Job / Study",
    titleVi: "Công việc & Học tập",
    icon: "Briefcase",
    description: "Nhiệm vụ học tập và công việc, cùng các tác động tích cực và tiêu cực của các hoạt động khác tới việc học tập.",
    mindmap: {
      id: "job-study-root",
      label: "Job & Study in Daily Life",
      labelVi: "Công việc & Học tập trong đời sống",
      children: [
        {
          id: "job-intro-duties",
          label: "Introduction & Daily Duties",
          labelVi: "Giới thiệu & Nhiệm vụ hàng ngày",
          children: [
            {
              id: "job-intro",
              label: "Introduction (Giới thiệu bản thân)",
              labelVi: "Giới thiệu công việc/học hành",
              notes: "third-year university student (sinh viên năm 3 đại học), work as an accountant (làm nhân viên kế toán)",
              example: "I am currently a third-year student majoring in Finance, and I also work as a part-time accountant."
            },
            {
              id: "job-duties-study",
              label: "Study duties",
              labelVi: "Nhiệm vụ học tập",
              notes: "do homework (làm bài tập về nhà), make presentations (thuyết trình), join student clubs (tham gia câu lạc bộ), do part-time jobs at weekends (làm thêm vào cuối tuần)"
            },
            {
              id: "job-duties-work",
              label: "Work duties",
              labelVi: "Nhiệm vụ công việc",
              notes: "be in charge of main tasks (chịu trách nhiệm công việc chính), work with clients (làm việc với khách hàng), solve client problems (giải quyết vấn đề cho khách hàng), contact business partners (liên hệ đối tác), collaborate with other departments (phối hợp với các phòng ban)"
            }
          ]
        },
        {
          id: "job-positive-impacts",
          label: "Positive Impacts & Benefits (Tác động tích cực)",
          labelVi: "Tác động tích cực của các hoạt động tới việc học & phát triển",
          children: [
            {
              id: "job-pos-experience-career",
              label: "Experience & Future Career",
              labelVi: "Kinh nghiệm thực tế & Định hướng nghề nghiệp",
              children: [
                {
                  id: "job-pos-gain-exp",
                  label: "gain real-world experience",
                  labelVi: "có được kinh nghiệm thực tế",
                  example: "Doing part-time jobs helps students gain real-world experience before graduating."
                },
                {
                  id: "job-pos-choose-career",
                  label: "choose the right future career",
                  labelVi: "chọn đúng nghề nghiệp tương lai",
                  example: "Trying different internships allows young adults to choose the right future career."
                },
                {
                  id: "job-pos-better-cv",
                  label: "make the CV look better",
                  labelVi: "làm cho hồ sơ xin việc đẹp hơn",
                  example: "Volunteering activities and certificates make the CV look better to recruiters."
                },
                {
                  id: "job-pos-open-mind",
                  label: "open the mind to new ideas",
                  labelVi: "mở mang đầu óc với những ý tưởng mới",
                  example: "Interacting with different people helps open the mind to new ideas and perspectives."
                }
              ]
            },
            {
              id: "job-pos-skills-learning",
              label: "Soft Skills & Independent Learning",
              labelVi: "Kỹ năng mềm & Phương pháp tự học",
              children: [
                {
                  id: "job-pos-soft-skills",
                  label: "improve important soft skills",
                  labelVi: "cải thiện các kỹ năng mềm quan trọng",
                  example: "Group projects help undergraduates improve important soft skills like teamwork and negotiation."
                },
                {
                  id: "job-pos-problem-solving",
                  label: "improve problem-solving skills",
                  labelVi: "cải thiện kỹ năng giải quyết vấn đề",
                  example: "Overcoming workplace challenges will improve problem-solving skills remarkably."
                },
                {
                  id: "job-pos-study-independently",
                  label: "learn how to study independently",
                  labelVi: "học cách tự học một mình",
                  example: "Self-paced online courses encourage learners to learn how to study independently."
                },
                {
                  id: "job-pos-materials-online",
                  label: "find study materials easily online",
                  labelVi: "tìm tài liệu học tập dễ dàng trên mạng",
                  example: "With high-speed internet, students can find study materials easily online for their assignments."
                }
              ]
            },
            {
              id: "job-pos-networking-mindset",
              label: "Networking & Study Motivation",
              labelVi: "Mở rộng quan hệ & Động lực học tập",
              children: [
                {
                  id: "job-pos-make-friends",
                  label: "make friends and meet helpful people",
                  labelVi: "kết bạn và gặp gỡ những người có ích",
                  example: "Joining academic clubs allows you to make friends and meet helpful people."
                },
                {
                  id: "job-pos-feel-refreshed",
                  label: "feel refreshed and ready to study",
                  labelVi: "cảm thấy sảng khoái và sẵn sàng học tập",
                  example: "Taking active breaks makes you feel refreshed and ready to study with high energy."
                }
              ]
            }
          ]
        },
        {
          id: "job-negative-impacts",
          label: "Negative Impacts & Drawbacks (Tác động tiêu cực)",
          labelVi: "Tác động tiêu cực tới việc học tập & sinh hoạt",
          children: [
            {
              id: "job-neg-academic-decline",
              label: "Academic Setbacks & Distractions",
              labelVi: "Sa sút học tập & Mất tập trung",
              children: [
                {
                  id: "job-neg-fall-behind",
                  label: "fall behind in school",
                  labelVi: "bị tụt lại phía sau trong việc học",
                  example: "Working too many evening shifts can cause students to fall behind in school."
                },
                {
                  id: "job-neg-catching-up",
                  label: "have difficulty catching up with lessons",
                  labelVi: "gặp khó khăn khi theo kịp bài học",
                  example: "Missing lectures often leads to having difficulty catching up with lessons."
                },
                {
                  id: "job-neg-distracted",
                  label: "get distracted by social media and phones",
                  labelVi: "bị phân tâm bởi mạng xã hội và điện thoại",
                  example: "Constant notifications make students get distracted by social media and phones during self-study."
                },
                {
                  id: "job-neg-forget-basic",
                  label: "forget basic knowledge",
                  labelVi: "quên kiến thức cơ bản",
                  example: "Without continuous practice, learners easily forget basic knowledge of foundation subjects."
                }
              ]
            },
            {
              id: "job-neg-stress-time",
              label: "Stress, Exhaustion & Poor Time Management",
              labelVi: "Căng thẳng, Kiệt sức & Khó quản lý thời gian",
              children: [
                {
                  id: "job-neg-tired-stressed",
                  label: "feel tired and stressed from too much work",
                  labelVi: "cảm thấy mệt mỏi và căng thẳng vì quá nhiều việc",
                  example: "Balancing multiple tasks makes young people feel tired and stressed from too much work."
                },
                {
                  id: "job-neg-manage-time",
                  label: "find it hard to manage time",
                  labelVi: "thấy khó quản lý thời gian",
                  example: "Many freshmen find it hard to manage time between study and personal hobbies."
                },
                {
                  id: "job-neg-lose-interest",
                  label: "lose interest in going back to school",
                  labelVi: "mất hứng thú với việc quay lại trường học",
                  example: "Earning money early may cause some youth to lose interest in going back to school."
                }
              ]
            },
            {
              id: "job-neg-dependence-cheating",
              label: "Over-dependence, Cheating & Financial Burden",
              labelVi: "Lệ thuộc, Gian lận thi cử & Tiêu tốn tiền bạc",
              children: [
                {
                  id: "job-neg-rely-internet",
                  label: "rely too much on the internet and apps",
                  labelVi: "phụ thuộc quá nhiều vào internet và ứng dụng",
                  example: "Students who rely too much on the internet and apps may lose critical thinking ability."
                },
                {
                  id: "job-neg-cheat-tests",
                  label: "cheat more easily on tests",
                  labelVi: "gian lận bài kiểm tra dễ dàng hơn",
                  example: "Using online shortcuts allows dishonest pupils to cheat more easily on tests."
                },
                {
                  id: "job-neg-spend-money",
                  label: "spend too much money",
                  labelVi: "tiêu tốn quá nhiều tiền",
                  example: "Unplanned leisure activities make college students spend too much money."
                }
              ]
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the positive and negative impacts of doing a part-time job or extra activities on students' academic performance.",
      speaking: "VSTEP Speaking Part 3: Discuss how extracurricular activities and part-time jobs affect students' study habits. Are the real-world experiences worth the potential distractions?"
    }
  },
  {
    id: "crime",
    title: "Crime",
    titleVi: "Tội phạm & Tệ nạn",
    icon: "ShieldAlert",
    description: "Nguyên nhân gia tăng tỉ lệ tội phạm, tệ nạn xã hội và các biện pháp răn đe, giáo dục.",
    mindmap: {
      id: "crime-root",
      label: "Crime & Social Evils",
      labelVi: "Tội phạm và Tệ nạn xã hội",
      notes: "crime & law-breakers (tội phạm và kẻ vi phạm pháp luật), social evils (tệ nạn xã hội), violate the law (vi phạm pháp luật), go to prison (đi tù / chấp hành án phạt), victim (nạn nhân)",
      children: [
        {
          id: "crime-causes",
          label: "Causes of Crime (Nguyên nhân)",
          labelVi: "Tại sao tỉ lệ tội phạm gia tăng",
          children: [
            {
              id: "crime-cause-family",
              label: "Lack of parental care",
              labelVi: "Thiếu thốn tình cảm, giáo dục gia đình",
              notes: "lack love, care and support (thiếu sự nuôi dưỡng tình thương và chăm sóc), parents busy with work (cha mẹ quá bận rộn công việc)",
              example: "Children who are not nurtured with love and care are more prone to copying bad habits."
            },
            {
              id: "crime-cause-media",
              label: "Exposure to violent media",
              labelVi: "Tiếp cận game, nội dung bạo lực",
              notes: "access violent games (tiếp cận game bạo lực), copy bad internet behaviors (bắt chước điều xấu trên mạng), school violence (bạo lực học đường), bullying & shoving (bắt nạt và xô xát), threatening others (đe dọa người khác)",
              example: "Kids who get access to many violent games tend to copy bad behaviors and apply them in school."
            },
            {
              id: "crime-cause-poverty",
              label: "Poverty (Nghèo đói)",
              labelVi: "Nghèo đói dẫn đến phạm pháp",
              notes: "lack means to secure a living (thiếu phương tiện mưu sinh), commit crimes for money (phạm tội để kiếm tiền nhanh)",
              example: "Due to deep poverty, some people commit crimes because it seems like the easiest way to secure a living."
            }
          ]
        },
        {
          id: "crime-solutions",
          label: "Solutions (Giải pháp)",
          labelVi: "Biện pháp giảm tỉ lệ tội phạm",
          children: [
            {
              id: "crime-sol-parents",
              label: "Parental responsibility",
              labelVi: "Vai trò của cha mẹ",
              notes: "spend more time with children (dành nhiều thời gian hơn cho con), monitor activities & behaviors (giám sát hoạt động và hành vi), give useful advice (đưa ra lời khuyên hữu ích), prevent mistakes early (ngăn ngừa phạm sai lầm)",
              example: "Parents should spend more time with children to control their behaviors and avoid electronic devices."
            },
            {
              id: "crime-sol-punish",
              label: "Rehabilitation and punishment",
              labelVi: "Trừng phạt và cải tạo",
              notes: "punish offenders fairly (trừng phạt người phạm tội), send to rehabilitation centers (đưa tới trung tâm cải tạo), learn good behaviors (học cách cư xử tốt), get vocational training (đào tạo học nghề), find a job after release (tìm việc làm sau khi ra tù)",
              example: "Instead of just locking them up, we should send criminals to a rehabilitation center to get vocational training."
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the causes of juvenile delinquency and suggesting practical solutions.",
      speaking: "VSTEP Speaking Part 3: Talk about the statement: 'Stricter prison sentences are the only effective way to reduce crime rates.' Do you agree or disagree?"
    }
  },
  {
    id: "house-flat",
    title: "House / Flat",
    titleVi: "Nhà cửa & Nơi ở",
    icon: "Home",
    description: "Mô tả nhà ở, các phòng, đồ đạc trong nhà bằng tính từ nâng cao và hoạt động thường nhật.",
    mindmap: {
      id: "house-root",
      label: "House / Flat (Accommodation / Place of living)",
      labelVi: "Nơi bạn sinh sống",
      children: [
        {
          id: "house-rooms",
          label: "Rooms (Cấu trúc phòng)",
          labelVi: "Các phòng & Không gian",
          notes: "living room (phòng khách), bedroom (phòng ngủ), bathroom (phòng tắm), garden (sân vườn), garage (gara để xe), balcony (ban công), toilet (nhà vệ sinh)",
          example: "My house is spacious with three bedrooms, a large living room, and a small garden."
        },
        {
          id: "house-adjectives",
          label: "Descriptive Adjectives",
          labelVi: "Tính từ miêu tả không gian",
          children: [
            {
              id: "house-adj-positive",
              label: "Positive atmosphere",
              labelVi: "Không gian dễ chịu",
              notes: "large & big (rộng lớn), spacious & airy (rộng rãi và thoáng mát), quiet & peaceful (yên tĩnh và thanh bình), pretty & beautiful (đẹp đẽ)",
              example: "I love our living room because it is extremely spacious and peaceful."
            },
            {
              id: "house-adj-negative",
              label: "Negative atmosphere",
              labelVi: "Không gian bí bách",
              notes: "stuffy (ngột ngạt), drafty (nhiều gió lùa), cramped (chật chội)",
              example: "My old studio apartment was cramped and stuffy, with almost no sunlight."
            }
          ]
        },
        {
          id: "house-furniture",
          label: "Furniture & Decor (Trang thiết bị)",
          labelVi: "Đồ đạc và trang trí",
          notes: "table (bàn), TV (tivi), sofa (ghế sofa), bookshelf (kệ sách), bed (giường ngủ), wardrobe (tủ quần áo)",
          children: [
            {
              id: "house-furn-adj",
              label: "Adjectives for furniture",
              labelVi: "Tính từ mô tả đồ nội thất",
              notes: "new & bright (mới & sáng sủa), ancient & modern (cổ kính & hiện đại), basic & cheap (đơn giản & giá rẻ), luxurious & stylish (sang trọng & hợp thời trang), sophisticated wooden (nội thất gỗ tinh tế), comfortable & cozy (thoải mái & ấm cúng), delightful & dazzling (tuyệt vời & lộng lẫy), drop-dead gorgeous (tuyệt đẹp)",
              example: "In the bedroom, there is a drop-dead gorgeous wooden wardrobe that makes the room feel cozy."
            }
          ]
        },
        {
          id: "house-activities",
          label: "Activities (Hoạt động tại nhà)",
          labelVi: "Các hoạt động thường ngày",
          notes: "grow plants and flowers (trồng cây và hoa trong vườn), read books (đọc sách), watch TV (xem tivi), welcome guests (đón khách), cook food (nấu ăn), study (học tập), relax and unwind (thư giãn nghỉ ngơi), do housework (làm việc nhà), play card games (chơi đánh bài ngày Tết)",
          example: "In the evenings, I usually relax and unwind by growing plants and flowers in my garden."
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the advantages and disadvantages of living in a modern apartment flat.",
      speaking: "VSTEP Speaking Part 2: Describe your favorite room in your house. What is it? How is it decorated? What do you usually do in that room?"
    }
  },
  {
    id: "technology",
    title: "Technology",
    titleVi: "Công nghệ trong đời sống",
    icon: "Cpu",
    description: "Lợi ích kết nối, học tập và hiệu suất của công nghệ, cùng các tác hại (cô lập, mất tập trung, thất nghiệp, bảo mật) và giải pháp sử dụng an toàn.",
    mindmap: {
      id: "tech-root",
      label: "Technology in Daily Life",
      labelVi: "Công nghệ trong đời sống hiện đại",
      children: [
        {
          id: "tech-advantages",
          label: "Advantages / Benefits (Ưu điểm & Lợi ích)",
          labelVi: "Lợi ích đối với kết nối, học tập & công việc",
          children: [
            {
              id: "tech-adv-connection",
              label: "Global Communication & Connection",
              labelVi: "Giao tiếp toàn cầu & Giữ liên lạc",
              children: [
                {
                  id: "tech-adv-stay-connected",
                  label: "stay connected with people around the world",
                  labelVi: "giữ liên lạc với mọi người trên khắp thế giới",
                  example: "Modern technology helps us stay connected with people around the world effortlessly."
                },
                {
                  id: "tech-adv-keep-touch",
                  label: "keep in touch with friends and family through social media",
                  labelVi: "giữ liên lạc với bạn bè và gia đình thông qua mạng xã hội",
                  example: "It is easy to keep in touch with friends and family through social media even when living abroad."
                },
                {
                  id: "tech-adv-communicate-instantly",
                  label: "communicate instantly with people far away through phones and the internet",
                  labelVi: "giao tiếp ngay lập tức với những người ở xa thông qua điện thoại và internet",
                  example: "We can communicate instantly with people far away through phones and the internet without delay."
                }
              ]
            },
            {
              id: "tech-adv-learning-info",
              label: "Information Access & Online Learning",
              labelVi: "Tiếp cận thông tin & Học tập trực tuyến",
              children: [
                {
                  id: "tech-adv-instant-access",
                  label: "get instant access to information",
                  labelVi: "nhận quyền truy cập thông tin ngay lập tức",
                  example: "Search engines allow students to get instant access to information for their research."
                },
                {
                  id: "tech-adv-learn-anywhere",
                  label: "learn anything, anytime, anywhere with smartphones and computers",
                  labelVi: "học bất cứ điều gì, bất cứ lúc nào, ở bất cứ đâu bằng điện thoại thông minh và máy tính",
                  example: "Digital platforms enable people to learn anything, anytime, anywhere with smartphones and computers."
                }
              ]
            },
            {
              id: "tech-adv-productivity-fun",
              label: "Work Productivity & Entertainment",
              labelVi: "Năng suất công việc & Lựa chọn giải trí",
              children: [
                {
                  id: "tech-adv-complete-tasks",
                  label: "complete tasks faster and more efficiently",
                  labelVi: "hoàn thành công việc nhanh hơn và hiệu quả hơn",
                  example: "Modern software tools help employees complete tasks faster and more efficiently."
                },
                {
                  id: "tech-adv-entertainment-options",
                  label: "have many entertainment options",
                  labelVi: "có nhiều lựa chọn giải trí",
                  example: "Smart devices ensure that users have many entertainment options after a busy working day."
                }
              ]
            }
          ]
        },
        {
          id: "tech-disadvantages",
          label: "Disadvantages / Drawbacks (Nhược điểm & Tác hại)",
          labelVi: "Tác hại đối với giao tiếp, sức khỏe, việc làm & bảo mật",
          children: [
            {
              id: "tech-dis-social-isolation",
              label: "Social Isolation & Over-dependence",
              labelVi: "Cô lập xã hội & Sự phụ thuộc quá mức",
              children: [
                {
                  id: "tech-dis-reduce-interaction",
                  label: "reduce face-to-face interactions",
                  labelVi: "giảm tương tác trực tiếp",
                  example: "Spending too much time on digital devices can reduce face-to-face interactions with relatives."
                },
                {
                  id: "tech-dis-lonely-disconnected",
                  label: "make us feel lonely and disconnected",
                  labelVi: "khiến chúng ta cảm thấy cô đơn và mất kết nối",
                  example: "Excessive time spent in virtual worlds can make us feel lonely and disconnected from reality."
                },
                {
                  id: "tech-dis-rely-too-much",
                  label: "rely too much on technology",
                  labelVi: "phụ thuộc quá nhiều vào công nghệ",
                  example: "People who rely too much on technology often struggle to perform everyday tasks independently."
                },
                {
                  id: "tech-dis-avoid-manually",
                  label: "avoid doing things manually",
                  labelVi: "tránh làm mọi việc theo cách thủ công",
                  example: "Automated systems make young people avoid doing things manually and become inactive."
                }
              ]
            },
            {
              id: "tech-dis-distraction-health",
              label: "Distractions & Physical Health",
              labelVi: "Mất tập trung & Tác hại sức khỏe",
              children: [
                {
                  id: "tech-dis-cause-distractions",
                  label: "cause distractions",
                  labelVi: "gây mất tập trung",
                  example: "Frequent smartphone notifications cause distractions during important study sessions."
                },
                {
                  id: "tech-dis-lose-focus",
                  label: "lose focus on important tasks",
                  labelVi: "mất tập trung vào các nhiệm vụ quan trọng",
                  example: "Checking social feeds causes employees to lose focus on important tasks."
                },
                {
                  id: "tech-dis-staring-screens",
                  label: "staring at screens for long periods",
                  labelVi: "nhìn chằm chằm vào màn hình trong thời gian dài",
                  example: "Staring at screens for long periods can harm your posture and cause severe headaches."
                },
                {
                  id: "tech-dis-eye-strain",
                  label: "lead to eye strain",
                  labelVi: "dẫn đến mỏi mắt",
                  example: "Working on bright monitors late into the night can lead to eye strain and blurred vision."
                }
              ]
            },
            {
              id: "tech-dis-job-privacy",
              label: "Unemployment & Privacy Risks",
              labelVi: "Nguy cơ thất nghiệp do AI & Rủi ro quyền riêng tư",
              children: [
                {
                  id: "tech-dis-unemployment-rate",
                  label: "increase the unemployment rate",
                  labelVi: "làm tăng tỷ lệ thất nghiệp",
                  example: "Rapid automation in manufacturing could increase the unemployment rate for manual workers."
                },
                {
                  id: "tech-dis-ai-replace",
                  label: "AI can replace human workers in certain jobs",
                  labelVi: "AI có thể thay thế con người trong một số công việc",
                  example: "Advanced AI can replace human workers in certain jobs like data processing and routine translation."
                },
                {
                  id: "tech-dis-privacy-concerns",
                  label: "privacy concerns",
                  labelVi: "lo ngại về quyền riêng tư",
                  example: "The collection of personal data online raises significant privacy concerns among netizens."
                },
                {
                  id: "tech-dis-personal-data-accessed",
                  label: "personal data can be accessed or shared without consent",
                  labelVi: "dữ liệu cá nhân có thể bị truy cập hoặc chia sẻ mà không có sự đồng ý",
                  example: "In insecure networks, personal data can be accessed or shared without consent."
                }
              ]
            }
          ]
        },
        {
          id: "tech-solutions",
          label: "Solutions (Biện pháp khắc phục & Giải pháp)",
          labelVi: "Giải pháp sử dụng công nghệ thông minh & An toàn",
          children: [
            {
              id: "tech-sol-balanced-usage",
              label: "Balanced & Mindful Usage",
              labelVi: "Sử dụng cân bằng & Có ý thức",
              children: [
                {
                  id: "tech-sol-use-wisely",
                  label: "learn how to use technology wisely",
                  labelVi: "học cách sử dụng công nghệ một cách thông minh",
                  example: "Students should learn how to use technology wisely to serve their educational goals."
                },
                {
                  id: "tech-sol-limit-screen-time",
                  label: "limit screen time",
                  labelVi: "hạn chế thời gian sử dụng màn hình",
                  example: "Parents ought to limit screen time for their children and encourage more physical exercise."
                }
              ]
            },
            {
              id: "tech-sol-security-protection",
              label: "Cybersecurity & Data Protection",
              labelVi: "Bảo mật thông tin & An toàn không gian mạng",
              children: [
                {
                  id: "tech-sol-protect-info",
                  label: "protect personal information",
                  labelVi: "bảo vệ thông tin cá nhân",
                  example: "It is crucial to protect personal information when creating online accounts."
                },
                {
                  id: "tech-sol-create-passwords",
                  label: "create strong passwords",
                  labelVi: "tạo mật khẩu mạnh",
                  example: "Security experts recommend users create strong passwords with complex characters."
                },
                {
                  id: "tech-sol-install-antivirus",
                  label: "install antivirus software",
                  labelVi: "cài đặt phần mềm diệt virus",
                  example: "Always install antivirus software to defend computers from harmful malware and spyware."
                },
                {
                  id: "tech-sol-cautious-links",
                  label: "be cautious of suspicious links",
                  labelVi: "cẩn thận với các liên kết đáng ngờ",
                  example: "Internet users must be cautious of suspicious links to avoid phishing scams and data theft."
                }
              ]
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the benefits and drawbacks of modern technology in daily life, and suggest solutions to use it safely and effectively.",
      speaking: "VSTEP Speaking Part 3: Discuss how technology influences our communication and work. Is it making people more isolated or more connected? Suggest some solutions."
    }
  },
  {
    id: "languages",
    title: "Foreign Languages",
    titleVi: "Học ngoại ngữ",
    icon: "Languages",
    description: "Lợi ích của việc học ngoại ngữ đối với học tập, du lịch, giao tiếp và mở rộng cơ hội việc làm toàn cầu.",
    mindmap: {
      id: "lang-root",
      label: "Learning foreign languages",
      labelVi: "Học ngoại ngữ (Tiếng Anh...)",
      children: [
        {
          id: "lang-benefits",
          label: "Benefits (Lợi ích)",
          labelVi: "Lợi ích tuyệt vời",
          children: [
            {
              id: "lang-ben-info",
              label: "Learn and get information in the world",
              labelVi: "Học và tiếp cận thông tin toàn cầu",
              notes: "broaden mind (mở rộng tầm mắt), enrich knowledge (trau dồi kiến thức), search for specialized documents (tìm kiếm tài liệu chuyên ngành)",
              example: "Since many scientific papers are written in English, learning languages helps me search for specialized documents easily."
            },
            {
              id: "lang-ben-travel",
              label: "Feel more confident when travelling abroad",
              labelVi: "Tự tin hơn khi đi du lịch nước ngoài",
              notes: "talk easily with foreigners (dễ dàng trò chuyện với người nước ngoài), do business without an interpreter (làm kinh doanh không cần phiên dịch viên)",
              example: "Being bilingual makes me feel more confident when travelling abroad as I can talk easily with foreigners."
            },
            {
              id: "lang-ben-culture",
              label: "Learn more about that country",
              labelVi: "Hiểu sâu hơn về quốc gia khác",
              notes: "culture (văn hóa), people (con người), society (xã hội), customs and traditions (phong tục và truyền thống)",
              example: "Learning Japanese allows me to understand more about their unique culture and customs."
            },
            {
              id: "lang-ben-friends",
              label: "Become friends with many people around the world",
              labelVi: "Kết bạn bốn phương",
              notes: "expand social relationships (mở rộng quan hệ xã hội), global job opportunities (cơ hội việc làm toàn cầu)",
              example: "Speaking English opens up social relationships, helping me become friends with people worldwide."
            },
            {
              id: "lang-ben-door",
              label: "Open a new door to the world",
              labelVi: "Mở ra cánh cửa mới ra thế giới"
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the main benefits of learning a foreign language in today's globalized world.",
      speaking: "VSTEP Speaking Part 2: Besides English, which foreign language do you think is the most useful to learn in Vietnam today? Choose between Chinese, Japanese, or French."
    }
  },
  {
    id: "machine",
    title: "Machine",
    titleVi: "Thiết bị & Máy móc",
    icon: "Laptop",
    description: "Ưu điểm của Máy tính/TV đối with công việc, học tập, giải trí cùng các tác hại (nghiện, mỏi mắt, thụ động) và giải pháp khắc phục.",
    mindmap: {
      id: "machine-root",
      label: "Machine (Computer / Television)",
      labelVi: "Thiết bị Máy tính & Ti vi",
      children: [
        {
          id: "mach-advantages",
          label: "Advantages / Benefits (Ưu điểm & Lợi ích)",
          labelVi: "Lợi ích đối với học tập, công việc & giải trí",
          children: [
            {
              id: "mach-learning",
              label: "Good way of learning & getting info",
              labelVi: "Công cụ học tập & tìm kiếm tin tức",
              notes: "read newspapers online (đọc báo trực tuyến), download information (tải nhiều thông tin), learn online & self-study (học trực tuyến & tự học), educational tool (công cụ giáo dục giảng dạy mọi thứ)",
              example: "The computer is an educational tool that can teach you anything that interests you through self-study."
            },
            {
              id: "mach-work",
              label: "Be convenient for work, study",
              labelVi: "Tiện lợi cho học tập và làm việc",
              notes: "work faster and more efficiently (làm việc nhanh và hiệu quả hơn), typing (đánh máy văn bản), printing documents (in ấn tài liệu), storing data (lưu trữ dữ liệu), save time (tiết kiệm thời gian)",
              example: "Computers help office workers work faster and more efficiently by easily storing massive data and saving time."
            },
            {
              id: "mach-entertainment",
              label: "Be a good way to entertain",
              labelVi: "Công cụ giải trí hiệu quả",
              notes: "play games (chơi game giải trí), listen to music (nghe nhạc), watch movies (xem phim), join social forums to share ideas (tham gia diễn đàn mạng xã hội chia sẻ ý tưởng)",
              example: "In my spare time, watching movies on television is a good way to entertain and relax."
            }
          ]
        },
        {
          id: "mach-disadvantages",
          label: "Disadvantages / Drawbacks (Nhược điểm & Tác hại)",
          labelVi: "Tác hại đối với sức khỏe và lối sống",
          children: [
            {
              id: "mach-dis-health",
              label: "Negative effects on physical health",
              labelVi: "Tác hại đối với sức khỏe thể chất",
              notes: "eye strain & shortsightedness (mỏi mắt & cận thị), backache & neck pain (đau lưng & đau cổ), increase risk of obesity (tăng rủi ro béo phì)",
              example: "Staring at screen for hours causes severe eye strain, shortsightedness, and backache."
            },
            {
              id: "mach-dis-sedentary",
              label: "Lead to a sedentary lifestyle & addiction",
              labelVi: "Lối sống thụ động & nguy cơ nghiện thiết bị",
              notes: "lack of physical exercise (thiếu vận động thể chất), waste time on screen (lãng phí thời gian xem màn hình), computer & game addiction (nghiện máy tính & trò chơi điện tử)",
              example: "Overusing computers leads to a sedentary lifestyle with a lack of physical exercise."
            },
            {
              id: "mach-dis-social",
              label: "Reduce real-life social interaction",
              labelVi: "Giảm tương tác xã hội trực tiếp",
              notes: "less face-to-face communication (ít giao tiếp trực tiếp), become passive and isolated (trở nên thụ động và cô lập), ignore family and friends (bỏ mặc gia đình và bạn bè)",
              example: "Excessive screen time reduces face-to-face communication and makes young people isolated."
            }
          ]
        },
        {
          id: "mach-solutions",
          label: "Solutions (Biện pháp khắc phục)",
          labelVi: "Giải pháp cân bằng việc sử dụng thiết bị",
          children: [
            {
              id: "mach-sol-limit",
              label: "Set screen time limits & take regular breaks",
              labelVi: "Giới hạn thời gian sử dụng & nghỉ ngơi định kỳ",
              notes: "limit daily screen time (giới hạn thời gian dùng màn hình hàng ngày), take short breaks every 45 minutes (nghỉ ngắn mỗi 45 phút), rest eyes frequently (cho mắt nghỉ ngơi thường xuyên)",
              example: "Users should limit daily screen time and take short breaks every 45 minutes to rest their eyes."
            },
            {
              id: "mach-sol-exercise",
              label: "Balance screen time with outdoor activities",
              labelVi: "Tăng cường vận động ngoài trời & thể thao",
              notes: "play sports & outdoor games (chơi thể thao & trò chơi ngoài trời), hang out with friends (đi chơi cùng bạn bè), do physical exercise (tập thể dục nâng cao sức khỏe)",
              example: "Balancing screen time with outdoor sports helps maintain good physical and mental health."
            },
            {
              id: "mach-sol-parental",
              label: "Parental guidance & house rules for kids",
              labelVi: "Sự quản lý & quy định của cha mẹ đối với con cái",
              notes: "control screen time for children (kiểm soát thời gian dùng thiết bị của trẻ), guide kids to healthy educational content (hướng dẫn con dùng nội dung giáo dục lành mạnh), ban devices during meals & bedtime (cấm dùng thiết bị trong bữa ăn & giờ ngủ)",
              example: "Parents ought to control screen time for children and ban electronic devices during bedtime."
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing both the advantages and disadvantages of using computers in daily life, and suggest effective solutions.",
      speaking: "VSTEP Speaking Part 3: Talk about the negative consequences of spending too much time on computers or watching television. Suggest some effective solutions."
    }
  },
  {
    id: "people",
    title: "Describe People",
    titleVi: "Mô tả con người",
    icon: "Users",
    description: "Các mẫu từ vựng miêu tả ngoại hình, tính cách tốt/xấu, mối quan hệ thân thiết và hoạt động chung.",
    mindmap: {
      id: "people-root",
      label: "Describe a person (Mô tả con người)",
      labelVi: "Ngoại hình, tính cách và mối quan hệ",
      children: [
        {
          id: "peop-appearance",
          label: "Appearance (Ngoại hình)",
          labelVi: "Chiều cao, tuổi tác, diện mạo",
          notes: "height descriptors (chiều cao), age descriptors (tuổi tác), attractive smile (nụ cười thu hút), overall look (diện mạo tổng thể)",
          children: [
            {
              id: "peop-app-descriptors",
              label: "Body & Age descriptors",
              labelVi: "Các đặc điểm hình thể",
              notes: "tall (cao), short (thấp / lùn), old (nhiều tuổi), young (trẻ trung), medium-height (chiều cao trung bình), middle-aged (trung niên)"
            },
            {
              id: "peop-app-face",
              label: "Face, hair & smile",
              labelVi: "Gương mặt, mái tóc & nụ cười",
              notes: "beautiful & pretty (xinh đẹp - nữ), handsome (đẹp trai - nam), good-looking (ưa nhìn - cả 2 giới), have short or long black hair (có mái tóc đen ngắn hoặc dài), have a sunny smile (nụ cười tỏa nắng)"
            }
          ]
        },
        {
          id: "peop-characters",
          label: "Characters (Tính cách)",
          labelVi: "Tính cách tốt và xấu",
          children: [
            {
              id: "peop-char-good",
              label: "Good traits (Tốt bụng)",
              labelVi: "Tính cách tốt",
              notes: "sincere and honest (chân thành và thật thà), helpful (hay giúp đỡ người khác), kind and nice (tốt bụng và tử tế), generous (hào phóng rộng lượng)",
              example: "She is a very sincere and helpful colleague who always shares her work experience."
            },
            {
              id: "peop-char-bad",
              label: "Bad traits (Xấu tính)",
              labelVi: "Tính cách xấu",
              notes: "talkative (nhiều chuyện), awful and terrible (tồi tệ), bad behavior (kém cỏi / xấu tính), selfish (ích kỷ)"
            }
          ]
        },
        {
          id: "peop-relationship",
          label: "Relationship & Activities",
          labelVi: "Mối quan hệ & Hoạt động chung",
          children: [
            {
              id: "peop-rel-know",
              label: "How we know each other",
              labelVi: "Quen biết nhau thế nào",
              notes: "known each other for 10 years (quen biết nhau được 10 năm), first met at high school or company (gặp nhau lần đầu ở trường cấp 3 hoặc công ty)"
            },
            {
              id: "peop-rel-act",
              label: "Common activities (Hoạt động thường gặp)",
              labelVi: "Hoạt động chung",
              notes: "meet at coffee shops (gặp nhau ở quán cà phê), go shopping together (cùng nhau đi mua sắm), talk and share about life (trò chuyện chia sẻ về cuộc sống), study and work together (cùng học tập và làm việc), share family stories (chia sẻ chuyện gia đình)",
              example: "We often meet at the coffee shop at weekends to talk and share about our careers."
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the qualities of a good friend and the importance of having strong social relationships.",
      speaking: "VSTEP Speaking Part 2: Describe a teacher who has had a significant impact on your life. Talk about their appearance, personality, and how they helped you."
    }
  },
  {
    id: "holiday",
    title: "Holiday / Vacation",
    titleVi: "Kì nghỉ & Du lịch",
    icon: "Compass",
    description: "Miêu tả phong cảnh hùng vĩ, ẩm thực địa phương hấp dẫn và các hoạt động thể thao, nghỉ dưỡng bãi biển.",
    mindmap: {
      id: "holiday-root",
      label: "Describe a holiday (Kì nghỉ)",
      labelVi: "Quang cảnh, con người và hoạt động",
      children: [
        {
          id: "hol-likes",
          label: "Likes & Interests (Điều thích thú)",
          labelVi: "Những điểm ấn tượng nhất",
          children: [
            {
              id: "hol-likes-scenery",
              label: "The scenery is magnificent",
              labelVi: "Phong cảnh hùng vĩ, hoành tráng",
              notes: "breathtaking views of mountains and rivers (cảnh đẹp ngoạn mục của sông núi), enjoy fresh and pure air (thưởng thức không khí trong lành)",
              example: "The scenery there is magnificent with breathtaking views of the mountains and rivers."
            },
            {
              id: "hol-likes-food",
              label: "The local cuisine is fresh & delicious",
              labelVi: "Ẩm thực địa phương tươi ngon và rẻ",
              notes: "delicious local food (đặc sản địa phương tươi ngon), reasonable prices (giá cả hợp lý), crabs (cua), lobsters (tôm hùm), seashells (sò và ốc)",
              example: "The local cuisine is fresh and delicious but not expensive; they serve a wonderful variety of seafood."
            },
            {
              id: "hol-likes-people",
              label: "People are friendly, sociable, polite",
              labelVi: "Con người thân thiện, lịch sự, hòa đồng"
            }
          ]
        },
        {
          id: "hol-activities",
          label: "Activities (Các hoạt động tham gia)",
          labelVi: "Hoạt động giải trí",
          notes: "swim in blue seawater (bơi ở biển xanh sạch), do sunbathing on soft sand (tắm nắng trên bãi cát mịn), visit famous tourist spots (tham quan các danh lam thắng cảnh), play football on the beach (chơi đá bóng trên bãi biển), build sandcastles (xây lâu đài cát), watch the sunrise and sunset (ngắm bình minh và hoàng hôn)",
          example: "I spent my mornings swimming in the blue, clear seawater and building sandcastles with my friends."
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the benefits of taking regular holidays for physical and mental health.",
      speaking: "VSTEP Speaking Part 2: Imagine you are planning a 3-day summer vacation. You are choosing between a seaside resort, a mountain retreat, or a historical city tour. Which one do you choose and why?"
    }
  }
];

export const vstepTopics = rawVstepTopics.map((topic) => ({
  ...topic,
  mindmap: enrichMindmapTree(topic.mindmap),
}));
