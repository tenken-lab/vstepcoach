export type EssayType = 
  | "advantages_disadvantages"
  | "agree_disagree"
  | "causes_effects"
  | "causes_solutions"
  | "problems_solutions";

export interface EssayTemplateInfo {
  id: EssayType;
  title: string;
  description: string;
  inputs: {
    key: string;
    label: string;
    placeholder: string;
    description: string;
  }[];
}

export const ESSAY_TEMPLATES: Record<EssayType, EssayTemplateInfo> = {
  advantages_disadvantages: {
    id: "advantages_disadvantages",
    title: "Dạng Ưu - Nhược điểm (Advantages - Disadvantages)",
    description: "Phân tích các khía cạnh tích cực và tiêu cực của một vấn đề.",
    inputs: [
      {
        key: "topic",
        label: "Cụm danh từ chỉ chủ đề (Topic noun phrase)",
        placeholder: "Ví dụ: living in a big city, online learning, using smart phones...",
        description: "Nhập một cụm danh từ tiếng Anh đại diện cho chủ đề chính."
      }
    ]
  },
  agree_disagree: {
    id: "agree_disagree",
    title: "Dạng thảo luận 2 quan điểm (Discussion-Opinion)",
    description: "Thảo luận về hai quan điểm trái chiều và đưa ra ý kiến cá nhân.",
    inputs: [
      {
        key: "promptView",
        label: "Câu quan điểm trong đề bài (Prompt View Statement)",
        placeholder: "Ví dụ: traditional classrooms are better than online learning",
        description: "Ý kiến thứ nhất được nêu trong đề bài."
      },
      {
        key: "opposingView",
        label: "Câu phủ định quan điểm đề bài (Opposing View Statement)",
        placeholder: "Ví dụ: online learning offers more benefits than traditional classrooms",
        description: "Ý kiến trái ngược/ngược lại với quan điểm trên."
      },
      {
        key: "myView",
        label: "Câu quan điểm mình chọn (Your Supported View)",
        placeholder: "Ví dụ: online learning is more advantageous",
        description: "Quan điểm cá nhân mà bạn đồng tình nhất."
      }
    ]
  },
  causes_effects: {
    id: "causes_effects",
    title: "Dạng Nguyên nhân & Hệ quả (Causes and Effects)",
    description: "Phân tích các nguyên nhân dẫn đến một hiện tượng và các tác động của nó.",
    inputs: [
      {
        key: "topic",
        label: "Cụm danh từ chỉ chủ đề (Topic noun phrase)",
        placeholder: "Ví dụ: global warming, fast food consumption, heavy traffic...",
        description: "Nhập một cụm danh từ tiếng Anh đại diện cho chủ đề chính."
      }
    ]
  },
  causes_solutions: {
    id: "causes_solutions",
    title: "Dạng Nguyên nhân & Giải pháp (Causes and Solutions)",
    description: "Tìm hiểu nguyên nhân gốc rễ và đề xuất giải pháp cải thiện tình hình.",
    inputs: [
      {
        key: "topic",
        label: "Cụm danh từ chỉ chủ đề (Topic noun phrase)",
        placeholder: "Ví dụ: water pollution, childhood obesity, screen addiction...",
        description: "Nhập một cụm danh từ tiếng Anh đại diện cho chủ đề chính."
      }
    ]
  },
  problems_solutions: {
    id: "problems_solutions",
    title: "Dạng Vấn đề & Giải pháp (Problems and Solutions)",
    description: "Xác định các tác hại/vấn đề cụ thể và gợi ý các biện pháp khắc phục.",
    inputs: [
      {
        key: "topic",
        label: "Cụm danh từ chỉ chủ đề (Topic noun phrase)",
        placeholder: "Ví dụ: traffic congestion, air pollution in big cities...",
        description: "Nhập một cụm danh từ tiếng Anh đại diện cho chủ đề chính."
      }
    ]
  }
};
