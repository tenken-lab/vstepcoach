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
      notes: "Bus, train, coach, airplane (xe khách)",
      children: [
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
                  notes: "Quan sát sinh hoạt của mọi người",
                  example: "It is interesting to enjoy the roadside view and watch daily activities of people."
                }
              ]
            },
            {
              id: "transport-adv-convenient",
              label: "Be convenient and fast",
              labelVi: "Tiện lợi và nhanh chóng",
              notes: "when travel abroad/ far: airplane",
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
              notes: "Học sinh, sinh viên được giảm giá vé khi mang theo thẻ",
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
          notes: "restaurants, cinemas, shopping malls, skyscrapers (tòa nhà chọc trời)",
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
              notes: "have many entertainments (nhiều khu vui chơi) -> restaurants, parks, cinemas",
              example: "City life is highly interesting because we have access to many places of entertainment."
            },
            {
              id: "city-adv-convenient",
              label: "City life is more convenient",
              labelVi: "Tiện lợi hơn",
              notes: "live near hospitals (health), schools (education), supermarkets (thuận lợi học tập, chăm sóc sức khỏe)",
              example: "Living in the city is very convenient since you are always near major hospitals and schools."
            },
            {
              id: "city-adv-income",
              label: "Have higher incomes",
              labelVi: "Thu nhập cao hơn",
              notes: "save more money (tiết kiệm gửi về gia đình) & buy what I like",
              example: "Many people move to the city to secure a higher income and save more money for their families."
            },
            {
              id: "city-adv-jobs",
              label: "Have more career opportunities",
              labelVi: "Nhiều cơ hội nghề nghiệp",
              notes: "Diversity of fields, lots of choices, better salary, advance experiences & skills, enrich knowledge",
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
              notes: "have polluted air, fewer trees, rivers, mountains. Traffic is heavy (crowded at rush hours)",
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
              notes: "Tỉ lệ tội phạm cao hơn (have more crimes). Dễ bị thu hút bởi tệ nạn xã hội (drinking, drug, gambling)",
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
          notes: "rice fields, rivers, mountains, cánh đồng lúa",
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
              notes: "have fresher air, enjoy the clean and fresh air, have many trees, rice fields, rivers",
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
              notes: "Hospitable: welcome new neighbors. Live near each other (hỗ trợ giúp đỡ nhau, gửi trẻ khi đi xa 1-2 ngày)",
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
              notes: "Thu thập thấp hơn so với thành phố",
              example: "Country people generally have lower incomes due to fewer industrial jobs."
            },
            {
              id: "country-draw-boring",
              label: "Life is boring",
              labelVi: "Cuộc sống tẻ nhạt, nhàm chán",
              notes: "not have many places of conveniences and pleasures (restaurants, public parks, cinemas, downtown boutiques)",
              example: "Life is somewhat boring because there are no shopping malls or downtown boutiques."
            },
            {
              id: "country-draw-education",
              label: "Get access to education & technology - more difficult",
              labelVi: "Khó tiếp cận giáo dục & công nghệ",
              notes: "Trường học, internet, công nghệ phát triển chậm hơn",
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
              notes: "eat more fruits, fish, vegetables, drink more water everyday (plenty of water - at least 2 liters)",
              example: "Eating healthy food such as fruits and fish, and drinking plenty of water, is highly recommended."
            },
            {
              id: "health-good-less",
              label: "Eat less meat, fat food & junk food",
              labelVi: "Ăn ít thịt, đồ ăn nhiều dầu mỡ & đồ ăn nhanh",
              notes: "Hạn chế đồ ăn mỡ, đồ ăn nhanh",
              example: "Reducing intake of fat food and junk food is crucial for a healthy heart."
            },
            {
              id: "health-good-exercise",
              label: "Exercise everyday",
              labelVi: "Tập thể dục hàng ngày",
              notes: "manage weight, strengthen muscles and bones, reduce the risk of disease",
              example: "Scientific research shows that regular exercise everyday can strengthen muscles and reduce disease risk."
            },
            {
              id: "health-good-checkup",
              label: "Have a regular health check-up",
              labelVi: "Khám sức khỏe định kỳ",
              notes: "visit a doctor regularly to find out any diseases soon (tìm ra bệnh sớm, relieve stress)",
              example: "Having a regular health check-up helps you find out any diseases soon and stay safe."
            },
            {
              id: "health-good-mental",
              label: "Control emotion & avoid stress",
              labelVi: "Kiểm soát cảm xúc, tránh áp lực",
              notes: "Sound sleep (ngủ ngon), limit alcohol intake, stop smoking"
            },
            {
              id: "health-good-benefits",
              label: "Benefits: stay healthy, keep fit, better immune system",
              labelVi: "Lợi ích: Khỏe mạnh, giữ dáng, hệ miễn dịch tốt hơn",
              notes: "make us strong and relaxed. Not only maintain good health but also improve social life."
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
              notes: "eat too much unhealthy food, lack of sleep (not getting enough sleep), worrying too much, don't exercise regularly, don't check health regularly",
              example: "Lack of sleep and worrying too much can be major causes of physical and mental illnesses."
            },
            {
              id: "health-bad-problems",
              label: "Problems & Diseases",
              labelVi: "Bệnh tật và triệu chứng",
              notes: "increase risk of health problems, cholesterol level in blood, can't focus on work, easy to get tired and ill",
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
              notes: "Ex: bottles, plastic bags, glasses (túi nilon, chai, thủy tinh)",
              example: "We should reuse and recycle plastic products to keep our oceans clean."
            },
            {
              id: "env-good-energy",
              label: "Consume less energy / save energy",
              labelVi: "Tiêu thụ ít năng lượng / tiết kiệm năng lượng",
              notes: "Tiết kiệm điện, nước sinh hoạt",
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
          notes: "protect the environment in the long term (lâu dài)",
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
          notes: "don't reuse, consume more energy, don't sort trash, use less reusable products",
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
      notes: "hobby = pastime = interest = recreational activity = leisure pursuit",
      children: [
        {
          id: "hob-types",
          label: "Types (Các loại sở thích)",
          labelVi: "Các hoạt động giải trí phổ biến",
          notes: "listening to music, reading books, watching films, go shopping, playing sports (swimming, tennis, table tennis - bóng bàn, football, go jogging - đi bộ)",
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
              notes: "make me relaxed, feel much happier, talk and share the joy with others",
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
              notes: "Relate to intelligence / understanding / brainpower (trí tuệ). Ex: play games develop logicality (tính logic), analyze & solve problems"
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
              notes: "Increase aggressive feelings (hung hăng, công kích), thoughts & behaviors",
              example: "Many computer games contain a great deal of violence, leading to aggressive behaviors in teenagers."
            },
            {
              id: "hob-dis-neglect",
              label: "Not focus on their duties and study",
              labelVi: "Sao nhãng nghĩa vụ và học tập",
              notes: "perform worse and worse at school (ngày càng tệ hơn ở trường)"
            },
            {
              id: "hob-sol-list",
              label: "Solutions (Giải pháp)",
              labelVi: "Cách khắc phục",
              notes: "choose suitable computer games, be not allowed to play violent games, set limits on the length of time for playing games (giới hạn thời gian chơi game)"
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
    description: "Giới thiệu bản thân là sinh viên/người đi làm, các nhiệm vụ chính, ưu và nhược điểm của môi trường làm việc.",
    mindmap: {
      id: "job-study-root",
      label: "Job / Study",
      labelVi: "Công việc / Học tập",
      children: [
        {
          id: "job-intro",
          label: "Introduction (Giới thiệu bản thân)",
          labelVi: "Giới thiệu công việc/học hành",
          notes: "I am a third-year student at the university of... / I work as an accountant for ABC company (nhân viên kế toán)",
          example: "I am currently a third-year student majoring in Finance, and I also work as a part-time accountant."
        },
        {
          id: "job-duties",
          label: "Duties & Responsibilities (Nhiệm vụ)",
          labelVi: "Nhiệm vụ chính",
          children: [
            {
              id: "job-duties-study",
              label: "Study duties",
              labelVi: "Nhiệm vụ học tập",
              notes: "do homework (làm BTVN), make presentations (chuẩn bị thuyết trình), join clubs (tham gia CLB), do part-time jobs at the weekends"
            },
            {
              id: "job-duties-work",
              label: "Work duties",
              labelVi: "Nhiệm vụ công việc",
              notes: "I am in charge of... (chịu trách nhiệm về...), working with clients, solving clients' problems, contacting partners (liên hệ đối tác), collaborate with other departments to run the business smoothly (corporate)"
            }
          ]
        },
        {
          id: "job-opinion",
          label: "Opinions (Cảm nhận)",
          labelVi: "Suy nghĩ của bản thân",
          children: [
            {
              id: "job-opinion-like",
              label: "Like / Advantages (Thích)",
              labelVi: "Những điểm yêu thích",
              notes: "apply the knowledge and skills of field studied, have an environment to develop skills, opportunities for promotion (cơ hội thăng tiến), co-workers are friendly & supportive"
            },
            {
              id: "job-opinion-dislike",
              label: "Dislike / Drawbacks (Ghét)",
              labelVi: "Những điểm không thích",
              notes: "sometimes work overtime (làm việc ngoài giờ) -> less time for family, company is far from home, workload is huge -> feel tired/overloaded (mệt mỏi/quá tải)"
            }
          ]
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the advantages and disadvantages of taking a part-time job while studying at university.",
      speaking: "VSTEP Speaking Part 3: What are the factors that make a job satisfying? Discuss the relative importance of salary, working environment, and career opportunities."
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
      notes: "crime = law-breaker = offender, social evils, break/violate the law, go to prison = be committed/cast into prison, victim (nạn nhân)",
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
              notes: "not be nurtured with love, care and support -> parents busy with work",
              example: "Children who are not nurtured with love and care are more prone to copying bad habits."
            },
            {
              id: "crime-cause-media",
              label: "Exposure to violent media",
              labelVi: "Tiếp cận game, nội dung bạo lực",
              notes: "get access to many violent games, copy bad things on the internet (school violence, bullying, shoving, threatening)",
              example: "Kids who get access to many violent games tend to copy bad behaviors and apply them in school."
            },
            {
              id: "crime-cause-poverty",
              label: "Poverty (Nghèo đói)",
              labelVi: "Nghèo đói dẫn đến phạm pháp",
              notes: "not have enough means to secure a living -> commit crimes as the easiest way to get what they want",
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
              notes: "spend more time with children -> control activities & behaviors, give advice, prevent from making mistakes (lầm lỗi)",
              example: "Parents should spend more time with children to control their behaviors and avoid electronic devices."
            },
            {
              id: "crime-sol-punish",
              label: "Rehabilitation and punishment",
              labelVi: "Trừng phạt và cải tạo",
              notes: "punish those who commit a crime, send criminals to a rehabilitation center -> learn to behave well, get vocational training (đào tạo nghề) -> find a job later",
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
          notes: "living room, bedroom, bathroom, garden, garage, balcony (ban công), toilet",
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
              notes: "large, big, spacious (rộng lớn), quiet, peaceful, pretty, beautiful",
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
          notes: "table, TV, sofa, bookshelf (kệ sách), bed, wardrobe (tủ quần áo)",
          children: [
            {
              id: "house-furn-adj",
              label: "Adjectives for furniture",
              labelVi: "Tính từ mô tả đồ nội thất",
              notes: "Background: new, bright, ancient, modern, basic, cheap, luxurious, colorful, stylish, sophisticated. Material: wooden, plastic. Feeling: perfect, comfortable, cozy (ấm cúng). Style: delightful, dazzling, drop-dead gorgeous (tuyệt đẹp)",
              example: "In the bedroom, there is a drop-dead gorgeous wooden wardrobe that makes the room feel cozy."
            }
          ]
        },
        {
          id: "house-activities",
          label: "Activities (Hoạt động tại nhà)",
          labelVi: "Các hoạt động thường ngày",
          notes: "grow plants and flowers in the garden, read books, watch TV, welcome guests (đón khách), cook food, study, relax/unwind, do housework, play card games (Tet holiday)",
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
    titleVi: "Công nghệ (Robot)",
    icon: "Cpu",
    description: "Tác động của Robot, tự động hóa đến việc làm, sự thụ động của con người và giải pháp thích nghi.",
    mindmap: {
      id: "tech-root",
      label: "Technology & Robots",
      labelVi: "Robot và Công nghệ tự động hóa",
      children: [
        {
          id: "tech-advantages",
          label: "Advantages (Thuận lợi)",
          labelVi: "Lợi ích của robot",
          notes: "perform faster and more efficiently (làm việc nhanh và hiệu quả hơn)",
          example: "Modern robots can perform complex manufacturing tasks much faster and more efficiently."
        },
        {
          id: "tech-disadvantages",
          label: "Disadvantages (Bất lợi)",
          labelVi: "Tác động tiêu cực",
          children: [
            {
              id: "tech-dis-social",
              label: "Social issues",
              labelVi: "Vấn đề xã hội & tương tác",
              notes: "have less social interactions, increase the unemployment rate (tỉ lệ thất nghiệp)",
              example: "Using robots in service industries might lead to people having less social interactions."
            },
            {
              id: "tech-dis-lazy",
              label: "Make people lazier",
              labelVi: "Khiến con người lười biếng, thụ động",
              notes: "depend too much on machines, refuse to do tasks by hand (từ chối lao động chân tay)",
              example: "Automated systems make people lazier as they depend too much on machines and refuse to do tasks by hand."
            }
          ]
        },
        {
          id: "tech-solutions",
          label: "Solutions (Giải pháp)",
          labelVi: "Cách thích nghi",
          notes: "join social activities (team building, picnic, party), raise the sense of responsibility (nâng cao trách nhiệm), take training courses to control modern machines, update themselves with the development of science and technology",
          example: "Workers need to update themselves with science and technology and take training courses to control modern machines."
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing whether robots will completely replace human workers in the future and what solutions humans should take.",
      speaking: "VSTEP Speaking Part 3: Discuss the pros and cons of using smart technology and artificial intelligence in schools. Is it beneficial for student development?"
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
              notes: "Many books are written in English (broaden mind, enrich knowledge, search for specialized documents)",
              example: "Since many scientific papers are written in English, learning languages helps me search for specialized documents easily."
            },
            {
              id: "lang-ben-travel",
              label: "Feel more confident when travelling abroad",
              labelVi: "Tự tin hơn khi đi du lịch nước ngoài",
              notes: "talk easily with foreigners, work and do business without an interpreter (phiên dịch viên)",
              example: "Being bilingual makes me feel more confident when travelling abroad as I can talk easily with foreigners."
            },
            {
              id: "lang-ben-culture",
              label: "Learn more about that country",
              labelVi: "Hiểu sâu hơn về quốc gia khác",
              notes: "culture, people, society, customs and traditions (phong tục truyền thống)",
              example: "Learning Japanese allows me to understand more about their unique culture and customs."
            },
            {
              id: "lang-ben-friends",
              label: "Become friends with many people around the world",
              labelVi: "Kết bạn bốn phương",
              notes: "Social relationships, global job opportunities",
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
    description: "Vai trò của Máy tính/TV đối với học tập trực tuyến, công việc văn phòng nhanh chóng và giải trí tiện lợi.",
    mindmap: {
      id: "machine-root",
      label: "Machine (Computer / Television)",
      labelVi: "Thiết bị Máy tính & Ti vi",
      children: [
        {
          id: "mach-learning",
          label: "Good way of learning & getting info",
          labelVi: "Công cụ học tập & tìm kiếm tin tức",
          notes: "read newspapers online, download lots of information, learn online (self-study), educational tool (Teach you anything)",
          example: "The computer is an educational tool that can teach you anything that interests you through self-study."
        },
        {
          id: "mach-work",
          label: "Be convenient for work, study",
          labelVi: "Tiện lợi cho học tập và làm việc",
          notes: "work faster and more efficiently, typing (đánh máy), printing documents (in ấn), storing data (lưu trữ), save your time",
          example: "Computers help office workers work faster and more efficiently by easily storing massive data and saving time."
        },
        {
          id: "mach-entertainment",
          label: "Be a good way to entertain",
          labelVi: "Công cụ giải trí hiệu quả",
          notes: "play games, listen to music, watch movies, join forums/Facebook groups to share ideas",
          example: "In my spare time, watching movies on television is a good way to entertain and relax."
        }
      ]
    },
    prompts: {
      writing: "Write an essay (about 220-250 words) discussing the benefits of using computers for self-study and learning online.",
      speaking: "VSTEP Speaking Part 3: Talk about the negative consequences of children spending too much time watching TV or playing computer games. Suggest some rules parents can set."
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
          notes: "Height, Age, Smile/Attractive point, look like...",
          children: [
            {
              id: "peop-app-descriptors",
              label: "Body & Age descriptors",
              labelVi: "Các đặc điểm hình thể",
              notes: "tall, short, old, young, medium-height (chiều cao trung bình), middle-aged (trung niên)"
            },
            {
              id: "peop-app-face",
              label: "Face, hair & smile",
              labelVi: "Gương mặt, mái tóc & nụ cười",
              notes: "beautiful, pretty (nữ), handsome (nam), good-looking (cả 2 giới), have short/long black hair, have a sunny smile (nụ cười tỏa nắng)"
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
              notes: "sincere = honest (thật thà), helpful, kind, nice, generous (hào phóng)",
              example: "She is a very sincere and helpful colleague who always shares her work experience."
            },
            {
              id: "peop-char-bad",
              label: "Bad traits (Xấu tính)",
              labelVi: "Tính cách xấu",
              notes: "talkative (nhiều chuyện), awful, terrible, bad, selfish (ích kỷ)"
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
              notes: "known each other for 10 years, first met at high school or at the company"
            },
            {
              id: "peop-rel-act",
              label: "Common activities (Hoạt động thường gặp)",
              labelVi: "Hoạt động chung",
              notes: "often meet at the coffee shop, go shopping together, talk and share about life, study, work, family...",
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
              notes: "there are breathtaking views of the mountains and rivers, enjoy fresh and pure air (không khí trong lành)",
              example: "The scenery there is magnificent with breathtaking views of the mountains and rivers."
            },
            {
              id: "hol-likes-food",
              label: "The local cuisine is fresh & delicious",
              labelVi: "Ẩm thực địa phương tươi ngon và rẻ",
              notes: "#the local food, but not expensive, have a variety of food: crab (cua), lobsters (tôm hùm), seashells (sò/ốc)",
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
          notes: "swim in the blue and clear seawater (bơi ở biển xanh sạch), do sunbathing on the soft sand beach under yellow and warm sunshine (tắm nắng bãi cát mịn dưới nắng ấm), visit Ba Na hills or sail on a board to Cu Lao Cham, play football on the beach, build sandcastles, watch the sunrise/sunset (ngắm hoàng hôn/bình minh)",
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
