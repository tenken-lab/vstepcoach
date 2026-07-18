import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  PenTool,
  Mic,
  MicOff,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  BookOpen,
  CornerDownRight,
  Volume2,
  ListTodo,
  TrendingUp,
  BrainCircuit,
  MessageSquareDiff,
  HelpCircle,
  RotateCcw,
  SpellCheck,
  Check,
  ArrowRight,
  Lightbulb,
  Headphones,
  Award
} from "lucide-react";
import { VstepTopic, MindmapNode } from "../data/topics";

interface QuizCoachProps {
  topic: VstepTopic;
}

interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  notes: string;
  example: string;
}

interface AISentenceResult {
  isValid: boolean;
  containsVocab: boolean;
  feedbackMessage: string;
  grammarCorrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  suggestions: Array<{
    suggestedSentence: string;
    explanation: string;
  }>;
}

interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

interface VocabSuggestion {
  original: string;
  suggested: string;
  reason: string;
}

interface AIEssayResult {
  band: string;
  scoreExplain: string;
  matchedVocab: string[];
  improvedVocabSuggestions: VocabSuggestion[];
  grammarCorrections: GrammarCorrection[];
  modelAnswer: string;
}

const vietnamesePromptMap: Record<string, string> = {
  "public transport": "Tôi lựa chọn phương tiện giao thông công cộng khi đi làm. Nó giúp tôi tiết kiệm chi phí đi lại.",
  "Public transport": "Tôi lựa chọn phương tiện giao thông công cộng khi đi làm. Nó giúp tôi tiết kiệm chi phí đi lại.",
  "Be safer": "Sử dụng tàu hỏa thường được coi là an toàn hơn vì đường sắt có ít tai nạn hơn.",
  "be safer": "Sử dụng tàu hỏa thường được coi là an toàn hơn vì đường sắt có ít tai nạn hơn.",
  "Avoid getting wet, dust": "Đi lại bằng xe buýt giúp tôi tránh bị ướt và khói bụi trong những trận bão lớn.",
  "avoid getting wet, dust": "Đi lại bằng xe buýt giúp tôi tránh bị ướt và khói bụi trong những trận bão lớn.",
  "Listen to music & read books": "Tôi có thể nghe nhạc hoặc đọc sách trong lúc đi tàu điện ngầm.",
  "listen to music & read books": "Tôi có thể nghe nhạc hoặc đọc sách trong lúc đi tàu điện ngầm.",
  "Take a nap": "Đi xe khách cho phép tôi chợp mắt một lúc sau một ngày làm việc mệt mỏi.",
  "take a nap": "Đi xe khách cho phép tôi chợp mắt một lúc sau một ngày làm việc mệt mỏi.",
  "Enjoy the roadside view": "Thật thú vị khi được ngắm cảnh ven đường và quan sát hoạt động thường ngày của mọi người.",
  "enjoy the roadside view": "Thật thú vị khi được ngắm cảnh ven đường và quan sát hoạt động thường ngày của mọi người.",
  "Travel wherever I want and whenever I want": "Sở hữu xe riêng giúp tôi đi bất cứ nơi nào tôi muốn và bất kỳ lúc nào.",
  "travel wherever i want and whenever i want": "Sở hữu xe riêng giúp tôi đi bất cứ nơi nào tôi muốn và bất kỳ lúc nào.",
  "Cheap (bus)": "Giá vé xe buýt rất rẻ, và học sinh sinh viên còn được giảm giá vé khi xuất trình thẻ.",
  "cheap (bus)": "Giá vé xe buýt rất rẻ, và học sinh sinh viên còn được giảm giá vé khi xuất trình thẻ.",
  "Have a higher chance of getting diseases": "Hành khách đối mặt với nguy cơ mắc các bệnh truyền nhiễm cao hơn khi ngồi trong các toa xe công cộng đông đúc.",
  "have a higher chance of getting diseases": "Hành khách đối mặt với nguy cơ mắc các bệnh truyền nhiễm cao hơn khi ngồi trong các toa xe công cộng đông đúc.",
  "Be pretty crowded at rush hours": "Xe buýt công cộng thường khá đông đúc vào các khung giờ cao điểm.",
  "be pretty crowded at rush hours": "Xe buýt công cộng thường khá đông đúc vào các khung giờ cao điểm.",
  "Air conditioner is broken down / Xe xuống cấp": "Nhiều hệ thống giao thông công cộng đang xuống cấp với hệ thống điều hòa bị hỏng.",
  "air conditioner is broken down / xe xuống cấp": "Nhiều hệ thống giao thông công cộng đang xuống cấp với hệ thống điều hòa bị hỏng.",
};

export default function QuizCoach({ topic }: QuizCoachProps) {
  // Trích xuất từ vựng từ sơ đồ tư duy cho thử thách từ vựng
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [selectedVocabIndex, setSelectedVocabIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Bước 1: Spelling & Recall states
  const [spellingInput, setSpellingInput] = useState("");
  const [spellingResult, setSpellingResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const [showSpellingAnswer, setShowSpellingAnswer] = useState(false);

  // Bước 2: Sentence Construction states
  const [sentenceInput, setSentenceInput] = useState("");
  const [isEvaluatingSentence, setIsEvaluatingSentence] = useState(false);
  const [sentenceResult, setSentenceResult] = useState<AISentenceResult | null>(null);
  const [sentenceError, setSentenceError] = useState("");

  // Bước 3: Speaking & Pronunciation states
  const [speakingTarget, setSpeakingTarget] = useState<"word" | "sentence" | "example">("word");
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Gợi ý câu tiếng Việt cho Bước 2
  const [vietnameseHint, setVietnameseHint] = useState<string>("");
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);

  // Trích xuất đệ quy các từ vựng học thuật trong sơ đồ tư duy
  useEffect(() => {
    const extractVocabList = (node: MindmapNode): VocabItem[] => {
      const items: VocabItem[] = [];
      const traversedIds = new Set<string>();

      const traverse = (n: MindmapNode, parentLabelVi = "") => {
        const currentMeaning = n.labelVi 
          ? (parentLabelVi ? `${parentLabelVi} → ${n.labelVi}` : n.labelVi)
          : parentLabelVi;
        
        const isLeaf = !n.children || n.children.length === 0;
        if (isLeaf || n.example || n.notes) {
          // Lọc bỏ các tiêu đề phân nhóm cha rỗng không có nghĩa hoặc chứa từ Advantages/Disadvantages chung chung
          const isAcademicWord = n.label && 
                                 n.label.trim() !== "" && 
                                 !n.label.toLowerCase().includes("advantages") && 
                                 !n.label.toLowerCase().includes("disadvantages") &&
                                 !n.label.toLowerCase().includes("benefits") &&
                                 !n.label.toLowerCase().includes("drawbacks");

          if (isAcademicWord && !traversedIds.has(n.id)) {
            traversedIds.add(n.id);
            const cleanWord = n.label.replace(/\s*[(（][^)）]*[^\x00-\x7F][^)）]*[)）]/gi, "").trim();
            items.push({
              id: n.id,
              word: cleanWord,
              meaning: currentMeaning || n.labelVi || "Cụm từ chủ điểm",
              notes: n.notes || "",
              example: n.example || ""
            });
          }
        }
        
        if (n.children) {
          n.children.forEach(child => traverse(child, currentMeaning));
        }
      };
      
      traverse(node);
      return items;
    };

    const extracted = extractVocabList(topic.mindmap);
    setVocabList(extracted);
    setSelectedVocabIndex(0);
    resetVocabSteps();
  }, [topic]);

  // Setup Web Speech API for Speaking Mode
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setSpeechTranscript(finalTranscript);
          calculateSpeakingScore(finalTranscript);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error:", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    } else {
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const resetVocabSteps = () => {
    setCurrentStep(1);
    setSpellingInput("");
    setSpellingResult("idle");
    setShowSpellingAnswer(false);
    setSentenceInput("");
    setSentenceResult(null);
    setSentenceError("");
    setSpeechTranscript("");
    setMatchScore(null);
    if (isRecording) {
      stopSpeechRecording();
    }
  };

  // Tạo spelling hint thông minh (ví dụ: "Be safer" -> "B_ s_f_r")
  const generateSpellingHint = (word: string): string => {
    return word.split(" ").map(w => {
      const clean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
      if (clean.length <= 2) {
        return w; // Giữ nguyên từ cực ngắn như be, to, in...
      }
      const first = w[0];
      const last = w[w.length - 1];
      let middle = "";
      for (let i = 1; i < w.length - 1; i++) {
        const char = w[i];
        if (/[a-zA-Z]/.test(char)) {
          // Khuyết xen kẽ các ký tự ở giữa
          middle += i % 2 === 1 ? "_" : char;
        } else {
          middle += char;
        }
      }
      return first + middle + last;
    }).join(" ");
  };

  // Kiểm tra chính tả ở Bước 1
  const handleCheckSpelling = () => {
    if (!vocabList[selectedVocabIndex]) return;
    const target = vocabList[selectedVocabIndex].word.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
    const input = spellingInput.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
    
    if (input === target) {
      setSpellingResult("correct");
      // Phát âm từ vựng tự động khi hoàn thành đúng để tăng ghi nhớ
      speakText(vocabList[selectedVocabIndex].word);
    } else {
      setSpellingResult("incorrect");
    }
  };

  // Chấm câu ở Bước 2 bằng AI
  const handleEvaluateSentence = async () => {
    if (!sentenceInput.trim()) {
      setSentenceError("Vui lòng nhập câu của bạn trước khi gửi chấm điểm.");
      return;
    }

    setIsEvaluatingSentence(true);
    setSentenceResult(null);
    setSentenceError("");

    try {
      const response = await fetch("/api/ai/evaluate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: topic.id,
          vocabWord: vocabList[selectedVocabIndex].word,
          userSentence: sentenceInput,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Gặp sự cố khi kết nối dịch vụ AI.");
      }

      setSentenceResult(data);
    } catch (err: any) {
      setSentenceError(err.message || "Đã xảy ra lỗi kết nối AI.");
    } finally {
      setIsEvaluatingSentence(true);
      // Tự động chuyển trạng thái hoàn thành để người dùng thoải mái trải nghiệm
      setIsEvaluatingSentence(false);
    }
  };

  // Ghi âm giọng nói ở Bước 3
  const startSpeechRecording = () => {
    if (recognitionRef.current && !isRecording) {
      try {
        setSpeechTranscript("");
        setMatchScore(null);
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Start recording failed:", error);
      }
    }
  };

  const stopSpeechRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        setIsRecording(false);
      } catch (error) {
        console.error("Stop recording failed:", error);
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopSpeechRecording();
    } else {
      startSpeechRecording();
    }
  };

  // Tính điểm phát âm (Similarity Score)
  const calculateSpeakingScore = (spokenText: string) => {
    if (!vocabList[selectedVocabIndex]) return;
    
    let targetText = "";
    if (speakingTarget === "word") {
      targetText = vocabList[selectedVocabIndex].word;
    } else if (speakingTarget === "sentence") {
      targetText = sentenceInput || vocabList[selectedVocabIndex].example;
    } else {
      targetText = vocabList[selectedVocabIndex].example;
    }

    const clean = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const targetWords = clean(targetText).split(" ").filter(w => w !== "");
    const spokenWords = clean(spokenText).split(" ").filter(w => w !== "");
    
    if (targetWords.length === 0) {
      setMatchScore(0);
      return;
    }

    let matches = 0;
    targetWords.forEach(word => {
      if (spokenWords.includes(word)) {
        matches++;
      }
    });

    const score = Math.round((matches / targetWords.length) * 100);
    setMatchScore(score);
  };

  // Phát âm mẫu Text-to-Speech
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeVocab = vocabList[selectedVocabIndex];

  // Effect to retrieve Vietnamese hint statically or dynamically via AI
  useEffect(() => {
    if (!activeVocab) {
      setVietnameseHint("");
      return;
    }

    const wordKey = activeVocab.word.trim();
    const staticMatch = vietnamesePromptMap[wordKey] || vietnamesePromptMap[wordKey.toLowerCase()];
    if (staticMatch) {
      setVietnameseHint(staticMatch);
      return;
    }

    if (activeVocab.example) {
      setIsLoadingHint(true);
      setVietnameseHint("");
      fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: activeVocab.example, word: activeVocab.word }),
      })
        .then((res) => res.json())
        .then((data) => {
          setVietnameseHint(data.translated || `Hãy viết một câu tiếng Anh sử dụng cụm từ "${activeVocab.word}".`);
        })
        .catch((err) => {
          console.error(err);
          setVietnameseHint(`Hãy viết một câu tiếng Anh sử dụng cụm từ "${activeVocab.word}".`);
        })
        .finally(() => {
          setIsLoadingHint(false);
        });
    } else {
      setVietnameseHint(`Hãy đặt một câu tiếng Anh có chứa cụm từ "${activeVocab.word}".`);
    }
  }, [selectedVocabIndex, activeVocab]);

  // List of VSTEP sentence templates for Advantages & Disadvantages
  const sentenceTemplates = [
    { text: "It helps [V-inf]...", tooltip: "Nó giúp ích trong việc làm gì..." },
    { text: "It is a good way to [V-inf]...", tooltip: "Nó là một cách tốt để..." },
    { text: "It is [Adj] because...", tooltip: "Nó thì (như thế nào) bởi vì..." },
    { text: "It allows me to [V-inf]...", tooltip: "Nó cho phép tôi làm gì..." },
    { text: "A major drawback of this is...", tooltip: "Một bất lợi lớn của điều này là..." },
    { text: "It is considered to be...", tooltip: "Nó được xem là..." }
  ];

  const handleApplyTemplate = (template: string) => {
    let cleanTemplate = template;
    if (template.includes("[V-inf]")) {
      cleanTemplate = template.replace("[V-inf]", "");
    } else if (template.includes("[Adj]")) {
      cleanTemplate = template.replace("[Adj]", "");
    }
    setSentenceInput((prev) => prev + (prev ? " " : "") + cleanTemplate);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6" id="quiz-coach-container">
      {/* Upper Navigation & Intro */}
      <div className="border-b border-gray-100 pb-4 mb-6">
        <h3 className="font-extrabold text-base text-gray-900 tracking-tight flex items-center gap-2">
          <Sparkles className="text-emerald-600" size={18} />
          Phòng Luyện AI Coach
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Học từ vựng theo chủ điểm cốt lõi thông qua 3 bước: nhớ từ, viết câu tiếng Việt gợi ý và luyện Speaking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sub Sidebar: Vocabulary Selector */}
          <div className="lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-1">
              <ListTodo size={14} className="text-emerald-600" />
              <span>Từ vựng cốt lõi ({vocabList.length})</span>
            </div>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto max-h-[350px] pb-3 lg:pb-0 pr-1 scrollbar-thin scrollbar-thumb-gray-200">
              {vocabList.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedVocabIndex(index);
                    resetVocabSteps();
                  }}
                  className={`shrink-0 lg:shrink text-left p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col gap-1 min-w-[150px] lg:min-w-0 ${
                    selectedVocabIndex === index
                      ? "bg-emerald-50 border-emerald-500/30 text-emerald-900 shadow-2xs"
                      : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className="font-mono text-[13px] truncate">{item.word}</span>
                  <span className="text-[10px] text-gray-400 font-medium truncate">
                    {item.meaning.split("→").pop()?.trim()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Practice Workspace: 3-Step Wizard */}
          {activeVocab ? (
            <div className="lg:col-span-3 flex flex-col gap-6">
              {/* Header card of chosen word */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 text-white shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] bg-emerald-500 text-emerald-50 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-block mb-1.5">
                      Từ vựng mục tiêu
                    </span>
                    <h4 className="text-xl font-extrabold tracking-tight font-mono flex items-center gap-2">
                      {activeVocab.word}
                      <button
                        type="button"
                        onClick={() => speakText(activeVocab.word)}
                        className="p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-all"
                        title="Nghe phát âm chuẩn"
                      >
                        <Volume2 size={16} />
                      </button>
                    </h4>
                    <p className="text-xs text-emerald-100 font-medium mt-1">
                      Nghĩa tiếng Việt: <strong className="text-white">{activeVocab.meaning}</strong>
                    </p>
                    {activeVocab.notes && (
                      <p className="text-[11px] text-teal-100 italic mt-0.5">
                        Ghi chú: {activeVocab.notes}
                      </p>
                    )}
                  </div>

                  {/* 3 Steps indicator */}
                  <div className="flex sm:flex-col gap-1 text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-teal-200">Tiến trình luyện</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((step) => (
                        <div
                          key={step}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                            currentStep === step
                              ? "bg-white text-emerald-700"
                              : currentStep > step
                              ? "bg-emerald-500 text-white"
                              : "bg-emerald-800 text-emerald-300"
                          }`}
                        >
                          {currentStep > step ? <Check size={10} strokeWidth={3} /> : step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP WORKSPACES WITH ANIMATION */}
              <div className="border border-gray-100 rounded-2xl p-4 md:p-6 bg-slate-50/50 min-h-[250px]">
                <AnimatePresence mode="wait">
                  {/* STEP 1: SPELLING & RECALL */}
                  {currentStep === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <h5 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
                          <SpellCheck size={16} className="text-emerald-600" />
                          Bước 1: Viết lại từ dựa theo nghĩa và gợi ý chữ cái
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Hãy nhìn vào nghĩa tiếng Việt ở trên, các gợi ý chữ cái khuyết dưới đây để viết lại hoàn chỉnh cụm từ.
                        </p>
                      </div>

                      {/* Display spelling hints */}
                      <div className="p-4 rounded-xl bg-white border border-gray-100 shadow-2xs text-center flex flex-col gap-2">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Gợi ý từ khuyết:</span>
                        <div className="text-xl font-bold font-mono text-emerald-700 tracking-widest bg-emerald-50/30 py-3 px-4 rounded-lg inline-block self-center">
                          {generateSpellingHint(activeVocab.word)}
                        </div>
                      </div>

                      {/* Spelling input */}
                      <div className="flex flex-col gap-2">
                        <label htmlFor="spelling-field" className="text-xs font-semibold text-gray-500 uppercase">
                          Nhập từ hoàn chỉnh của bạn:
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="spelling-field"
                            type="text"
                            value={spellingInput}
                            onChange={(e) => {
                              setSpellingInput(e.target.value);
                              setSpellingResult("idle");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCheckSpelling();
                            }}
                            placeholder="Nhập cụm từ tiếng Anh chính xác..."
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 outline-none font-sans text-sm transition-all shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={handleCheckSpelling}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0"
                          >
                            <CheckCircle size={14} />
                            Kiểm tra
                          </button>
                        </div>
                      </div>

                      {/* Result feedback block */}
                      {spellingResult === "correct" && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <CheckCircle size={14} className="text-emerald-600" />
                            <span>Chính xác! Bạn viết từ rất tốt.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all flex items-center gap-1"
                          >
                            Sang Bước 2 đặt câu
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      )}

                      {spellingResult === "incorrect" && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <AlertCircle size={14} className="text-red-500" />
                            <span>Chưa đúng rồi! Hãy kiểm tra kỹ chữ cái hoặc dấu cách.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSpellingAnswer(true)}
                            className="text-emerald-700 font-bold hover:underline"
                          >
                            Xem đáp án mẫu
                          </button>
                        </div>
                      )}

                      {showSpellingAnswer && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900 text-xs">
                          Đáp án đúng là: <strong className="font-mono text-emerald-700 text-sm select-all">{activeVocab.word}</strong>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 2: SENTENCE CONSTRUCTION */}
                  {currentStep === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <h5 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
                          <PenTool size={16} className="text-emerald-600" />
                          Bước 2: Viết 1 câu sử dụng từ đó (Gợi ý sẵn mẫu câu)
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Hãy dịch câu tiếng Việt dưới đây sang tiếng Anh, hoặc sử dụng các mẫu câu có sẵn để tự đặt một câu nói về ưu/nhược điểm.
                        </p>
                      </div>

                      {/* Vietnamese prompt suggestion */}
                      <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/50 flex flex-col gap-1.5">
                        <span className="text-[10px] font-extrabold text-amber-800 flex items-center gap-1 uppercase tracking-wider">
                          <Lightbulb size={13} className="text-amber-600 animate-pulse" />
                          ✍️ Gợi ý câu tiếng Việt cần viết lại:
                        </span>
                        {isLoadingHint ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 italic pl-1 py-1">
                            <Loader2 size={12} className="animate-spin text-amber-600" />
                            Đang chuẩn bị câu gợi ý bằng AI...
                          </div>
                        ) : (
                          <p className="text-xs sm:text-[13px] font-bold text-slate-800 leading-relaxed bg-white/80 p-3 rounded-lg border border-amber-200/20 shadow-2xs italic">
                            "{vietnameseHint}"
                          </p>
                        )}
                      </div>

                      {/* Sentence Templates Box */}
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">
                          💡 Bấm chọn mẫu câu gợi ý (Ưu / Nhược điểm) để tự động điền cấu trúc:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {sentenceTemplates.map((tpl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleApplyTemplate(tpl.text)}
                              title={tpl.tooltip}
                              className="text-left px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-900 rounded-lg border border-gray-100 hover:border-emerald-300 text-[11px] font-semibold transition-all truncate shadow-2xs"
                            >
                              {tpl.text}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text area for user sentence */}
                      <div className="flex flex-col gap-2">
                        <textarea
                          id="sentence-field"
                          value={sentenceInput}
                          onChange={(e) => setSentenceInput(e.target.value)}
                          placeholder="Đặt câu tiếng Anh của bạn tại đây... Hãy viết ngắn gọn, súc tích."
                          rows={3}
                          className="w-full p-3 border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none font-sans text-sm transition-all shadow-2xs resize-none"
                        />
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeVocab.example) {
                                setSentenceInput(activeVocab.example);
                              }
                            }}
                            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 transition-all"
                          >
                            <Sparkles size={11} className="text-emerald-600 animate-pulse" />
                            Xem câu mẫu tiếng Anh gợi ý
                          </button>
                        </div>
                      </div>

                      {/* Sentence Error Alert */}
                      {sentenceError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-center gap-2">
                          <AlertCircle size={14} />
                          <span>{sentenceError}</span>
                        </div>
                      )}

                      {/* Buttons: AI evaluation & skip */}
                      <div className="flex gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            // Skip directly if they want
                            setCurrentStep(3);
                          }}
                          className="px-4 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-xl transition-all"
                        >
                          Bỏ qua bước này
                        </button>
                        <button
                          type="button"
                          disabled={isEvaluatingSentence}
                          onClick={handleEvaluateSentence}
                          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5"
                        >
                          {isEvaluatingSentence ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Đang chấm điểm câu bằng AI...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Gửi AI Chấm Câu & Chữa Ngữ Pháp
                            </>
                          )}
                        </button>
                      </div>

                      {/* Sentence evaluation feedback */}
                      {sentenceResult && (
                        <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-2xs flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-1.5 text-xs font-extrabold">
                              {sentenceResult.isValid ? (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                                  <CheckCircle size={12} /> Từ vựng dùng chuẩn ngữ cảnh
                                </span>
                              ) : (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                                  <AlertCircle size={12} /> Cần chỉnh sửa lại ngữ nghĩa
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setCurrentStep(3)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-all flex items-center gap-1 shadow-2xs"
                            >
                              Tiến lên Bước 3 luyện Nói
                              <ArrowRight size={10} />
                            </button>
                          </div>

                          <p className="text-xs text-gray-700 leading-relaxed font-medium">
                            💬 <strong>Lời khuyên:</strong> {sentenceResult.feedbackMessage}
                          </p>

                          {/* Grammar corrections */}
                          {sentenceResult.grammarCorrections.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                                Sửa lỗi ngữ pháp:
                              </span>
                              {sentenceResult.grammarCorrections.map((err, idx) => (
                                <div key={idx} className="text-xs p-2.5 rounded-lg bg-amber-50/40 border border-amber-100/60">
                                  <div className="text-red-700 line-through">Lỗi: "{err.original}"</div>
                                  <div className="text-emerald-800 font-semibold mt-0.5">Sửa: "{err.corrected}"</div>
                                  <p className="text-[10px] text-gray-500 mt-1 pl-2 border-l-2 border-amber-300 italic">{err.explanation}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/40">
                              <CheckCircle size={14} /> Ngữ pháp câu bạn đặt hoàn hảo, không có lỗi sai!
                            </div>
                          )}

                          {/* AI Suggestions for better rewrite */}
                          {sentenceResult.suggestions.length > 0 && (
                            <div className="flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                                🌟 Gợi ý viết câu chuẩn VSTEP B2 (Nâng cao):
                              </span>
                              {sentenceResult.suggestions.map((sug, idx) => (
                                <div key={idx} className="text-xs p-2.5 rounded-lg bg-indigo-50/40 border border-indigo-100/50">
                                  <div className="font-mono font-bold text-emerald-800 select-all italic">"{sug.suggestedSentence}"</div>
                                  <p className="text-[10px] text-gray-500 mt-1 pl-2 border-l-2 border-indigo-300">{sug.explanation}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 3: SPEAKING & PRONUNCIATION */}
                  {currentStep === 3 && (
                    <motion.div
                      key="step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <h5 className="font-extrabold text-sm text-gray-800 flex items-center gap-1.5">
                          <Mic size={16} className="text-emerald-600" />
                          Bước 3: Luyện Speaking chỉ cần nói lại từ hoặc câu vừa đặt
                        </h5>
                        <p className="text-xs text-gray-500 mt-1">
                          Đúng với mô hình thi VSTEP Speaking, bạn chỉ cần phát âm đúng từ vựng này hoặc đọc to câu chứa từ vựng đó để ghi nhớ sâu nhất.
                        </p>
                      </div>

                      {/* Select target text to speak */}
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
                          Chọn nội dung bạn muốn luyện nói:
                        </span>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer">
                            <input
                              type="radio"
                              name="speak-target"
                              checked={speakingTarget === "word"}
                              onChange={() => {
                                setSpeakingTarget("word");
                                setMatchScore(null);
                                setSpeechTranscript("");
                              }}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="text-xs">
                              <span className="font-semibold text-gray-500 block text-[10px] uppercase">Lựa chọn 1: Chỉ phát âm từ vựng</span>
                              <span className="font-mono font-bold text-emerald-800 text-sm select-all">{activeVocab.word}</span>
                            </div>
                          </label>

                          {sentenceInput && (
                            <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer">
                              <input
                                type="radio"
                                name="speak-target"
                                checked={speakingTarget === "sentence"}
                                onChange={() => {
                                  setSpeakingTarget("sentence");
                                  setMatchScore(null);
                                  setSpeechTranscript("");
                                }}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="text-xs">
                                <span className="font-semibold text-gray-500 block text-[10px] uppercase">Lựa chọn 2: Phát âm câu bạn đã đặt ở Bước 2</span>
                                <span className="text-gray-800 italic">"{sentenceInput}"</span>
                              </div>
                            </label>
                          )}

                          {activeVocab.example && (
                            <label className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer">
                              <input
                                type="radio"
                                name="speak-target"
                                checked={speakingTarget === "example"}
                                onChange={() => {
                                  setSpeakingTarget("example");
                                  setMatchScore(null);
                                  setSpeechTranscript("");
                                }}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="text-xs">
                                <span className="font-semibold text-gray-500 block text-[10px] uppercase">Lựa chọn 3: Đọc câu ví dụ mẫu chuẩn VSTEP B2</span>
                                <span className="text-indigo-900 italic font-medium">"{activeVocab.example}"</span>
                              </div>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Microphone interaction panel */}
                      <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-2xs flex flex-col items-center justify-center gap-4 text-center">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const targetText = speakingTarget === "word"
                                ? activeVocab.word
                                : speakingTarget === "sentence"
                                ? sentenceInput
                                : activeVocab.example;
                              speakText(targetText);
                            }}
                            className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-all shadow-2xs flex items-center gap-1 text-xs font-bold"
                            title="Nghe máy đọc mẫu phát âm chuẩn"
                          >
                            <Volume2 size={16} />
                            <span>Nghe mẫu</span>
                          </button>

                          {recognitionSupported ? (
                            <button
                              type="button"
                              onClick={toggleRecording}
                              className={`p-3 px-5 rounded-full font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                                isRecording
                                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {isRecording ? (
                                <>
                                  <MicOff size={16} />
                                  <span>Đang nghe (Bấm dừng)...</span>
                                </>
                              ) : (
                                <>
                                  <Mic size={16} />
                                  <span>Bắt đầu nói nói</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl border border-amber-100">
                              Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Speaking tự động. Hãy dùng Google Chrome hoặc Edge để luyện tập.
                            </div>
                          )}
                        </div>

                        {/* Speaking results display */}
                        {isRecording && (
                          <div className="flex items-center gap-2 text-xs text-red-500 font-bold uppercase tracking-wider animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                            Đang mở micro... Nói thật to rõ ràng nhé!
                          </div>
                        )}

                        {speechTranscript && (
                          <div className="w-full text-left bg-slate-50 p-3 rounded-lg border border-gray-100">
                            <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">AI nhận diện giọng bạn nói được:</span>
                            <p className="text-xs text-gray-700 italic font-mono mt-1 font-bold">"{speechTranscript}"</p>
                          </div>
                        )}

                        {/* Match score and stars */}
                        {matchScore !== null && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Điểm khớp từ vựng & Phát âm</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xl font-extrabold px-3 py-1 rounded-lg ${
                                matchScore >= 80
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : matchScore >= 50
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-red-50 text-red-700 border border-red-200"
                              }`}>
                                {matchScore}% khớp
                              </span>
                              <span className="text-sm font-bold text-gray-700">
                                {matchScore >= 80 ? "Xuất sắc! 🎉" : matchScore >= 50 ? "Khá tốt! Đọc rõ hơn tí nữa nhé 👍" : "Thử lại lần nữa nào 💪"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex justify-between border-t border-gray-100 pt-4 mt-2">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="px-4 py-2 text-xs text-gray-600 hover:text-gray-900 font-bold transition-all"
                        >
                          Quay lại Bước 2
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={resetVocabSteps}
                            className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            Học lại từ này
                          </button>

                          {selectedVocabIndex < vocabList.length - 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVocabIndex(prev => prev + 1);
                                resetVocabSteps();
                              }}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1"
                            >
                              Học từ tiếp theo
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-3 flex flex-col items-center justify-center text-center py-20 bg-slate-50/50 rounded-2xl border border-gray-100">
              <BrainCircuit size={48} className="text-gray-300 animate-pulse mb-3" />
              <h4 className="font-extrabold text-sm text-gray-700">Đang chuẩn bị từ vựng...</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Chủ đề này chưa có từ vựng hoặc đang tải từ sơ đồ tư duy.
              </p>
            </div>
          )}
        </div>
    </div>
  );
}
