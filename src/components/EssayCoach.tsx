import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import { ESSAY_TEMPLATES, EssayType, EssayTemplateInfo } from "../data/essayTemplates";

interface Segment {
  text: string;
  isFixed: boolean;
}

interface Sentence {
  id: string;
  vietnamese: string;
  segments: Segment[];
}

interface Section {
  title: string;
  sentences: Sentence[];
}

interface GeneratedEssay {
  title: string;
  essayType: string;
  sections: {
    intro: Section;
    body1: Section;
    body2: Section;
    conclusion: Section;
  };
}

interface EssayCoachProps {
  onBackToHome: () => void;
}

export default function EssayCoach({ onBackToHome }: EssayCoachProps) {
  // Navigation & Form State
  const [step, setStep] = useState<
    "select_type" | "fill_inputs" | "generating" | "confirm_essay" | "view_sections" | "practice"
  >("select_type");
  
  const [selectedType, setSelectedType] = useState<EssayType | null>(null);
  const [userInput, setUserInput] = useState<Record<string, string>>({});
  const [generatedEssay, setGeneratedEssay] = useState<GeneratedEssay | null>(null);
  
  // Practice State
  const [currentSectionKey, setCurrentSectionKey] = useState<"intro" | "body1" | "body2" | "conclusion">("intro");
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const [studentInput, setStudentInput] = useState<string>("");
  const [checked, setChecked] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  
  // Progress tracking
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({
    intro: false,
    body1: false,
    body2: false,
    conclusion: false,
  });

  const [apiError, setApiError] = useState<string | null>(null);

  // Helper to get total sentences in an essay
  const getTotalSentencesCount = (essay: GeneratedEssay) => {
    return (
      essay.sections.intro.sentences.length +
      essay.sections.body1.sentences.length +
      essay.sections.body2.sentences.length +
      essay.sections.conclusion.sentences.length
    );
  };

  const handleSelectType = (type: EssayType) => {
    setSelectedType(type);
    // Reset inputs
    const template = ESSAY_TEMPLATES[type];
    const initialInputs: Record<string, string> = {};
    template.inputs.forEach((input) => {
      initialInputs[input.key] = "";
    });
    setUserInput(initialInputs);
    setStep("fill_inputs");
  };

  const handleInputChange = (key: string, value: string) => {
    setUserInput((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateEssay = async () => {
    // Check validation
    if (!selectedType) return;
    const template = ESSAY_TEMPLATES[selectedType];
    for (const input of template.inputs) {
      if (!userInput[input.key]?.trim()) {
        alert(`Vui lòng điền thông tin: ${input.label}`);
        return;
      }
    }

    setStep("generating");
    setApiError(null);

    try {
      const response = await fetch("/api/ai/generate-structured-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          essayType: selectedType,
          userInput,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Không thể tạo bài luận từ máy chủ AI.");
      }

      const data = await response.json();
      setGeneratedEssay(data);
      setStep("confirm_essay");
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Đã xảy ra lỗi kết nối hệ thống.");
      setStep("fill_inputs");
    }
  };

  const startPractice = () => {
    setCompletedSections({
      intro: false,
      body1: false,
      body2: false,
      conclusion: false,
    });
    setStep("view_sections");
  };

  const handleSelectSectionToPractice = (key: "intro" | "body1" | "body2" | "conclusion") => {
    setCurrentSectionKey(key);
    setCurrentSentenceIdx(0);
    setStudentInput("");
    setChecked(false);
    setIsCorrect(false);
    setShowHint(false);
    setStep("practice");
  };

  const getFullEnglishOfSentence = (sentence: Sentence): string => {
    return sentence.segments.map((seg) => seg.text).join("");
  };

  const checkAnswer = () => {
    if (!generatedEssay) return;
    const currentSection = generatedEssay.sections[currentSectionKey];
    const sentence = currentSection.sentences[currentSentenceIdx];
    const target = getFullEnglishOfSentence(sentence).trim();
    
    // Normalize comparison: lowercase, trim, remove double spaces, and ignore final periods/commas slightly
    const cleanTyped = studentInput.trim().toLowerCase().replace(/\s+/g, " ");
    const cleanTarget = target.trim().toLowerCase().replace(/\s+/g, " ");

    const simplify = (str: string) => {
      return str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
    };

    const perfectMatch = cleanTyped === cleanTarget;
    const punctuationMatch = simplify(cleanTyped) === simplify(cleanTarget);

    if (perfectMatch || punctuationMatch) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
    setChecked(true);
  };

  const handleNextSentence = () => {
    if (!generatedEssay) return;
    const currentSection = generatedEssay.sections[currentSectionKey];
    const isLastSentence = currentSentenceIdx >= currentSection.sentences.length - 1;

    if (isLastSentence) {
      // Mark current section as complete
      setCompletedSections((prev) => ({ ...prev, [currentSectionKey]: true }));
      setStep("view_sections");
    } else {
      setCurrentSentenceIdx((prev) => prev + 1);
      setStudentInput("");
      setChecked(false);
      setIsCorrect(false);
      setShowHint(false);
    }
  };

  const renderDiffFeedback = (typed: string, target: string) => {
    const chars = target.split("");
    const typedChars = typed.split("");
    return (
      <div className="flex flex-wrap gap-0.5 font-mono text-sm bg-slate-900 text-slate-100 p-4 rounded-xl mt-3 shadow-inner select-none border border-slate-800">
        {chars.map((char, i) => {
          const typedChar = typedChars[i];
          let color = "text-slate-500"; // not typed yet
          if (typedChar !== undefined) {
            if (typedChar.toLowerCase() === char.toLowerCase()) {
              color = "text-emerald-400";
            } else {
              color = "text-rose-400 underline decoration-rose-500 decoration-2 font-bold bg-rose-950/40 px-0.5 rounded";
            }
          }
          return (
            <span key={i} className={color}>
              {char === " " ? "\u00A0" : char}
            </span>
          );
        })}
      </div>
    );
  };

  const renderSegments = (segments: Segment[]) => {
    return (
      <div className="flex flex-wrap items-center gap-1.5 leading-relaxed text-sm">
        {segments.map((seg, idx) => (
          <span
            key={idx}
            className={`px-1.5 py-0.5 rounded transition-all ${
              seg.isFixed
                ? "bg-slate-100 text-slate-600 border border-slate-200/50 text-xs font-semibold"
                : "bg-amber-100/80 text-amber-900 font-bold border border-amber-200/70 text-sm shadow-2xs"
            }`}
          >
            {seg.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Module Header / Go back */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={step === "select_type" ? onBackToHome : () => {
              if (step === "fill_inputs") setStep("select_type");
              else if (step === "confirm_essay") setStep("fill_inputs");
              else if (step === "view_sections") setStep("confirm_essay");
              else if (step === "practice") setStep("view_sections");
            }}
            className="flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900 transition-colors bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs cursor-pointer"
          >
            <Icons.ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-extrabold tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100">
              Chế độ Viết Luận
            </span>
          </div>
        </div>

        {/* STEP 1: Select essay type */}
        {step === "select_type" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                CHỌN DẠNG BÀI VIẾT LUẬN VSTEP
              </h2>
              <p className="text-sm text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
                Hệ thống hỗ trợ 5 dạng cấu trúc bài viết chuẩn hóa. Chọn một dạng đề để bắt đầu xây dựng dàn ý và luyện viết.
              </p>
            </div>

            {/* Hướng dẫn sử dụng */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-3xs">
              <div className="flex items-center gap-2 pb-2.5 border-b border-amber-200/60">
                <Icons.BookOpen className="text-amber-700" size={18} />
                <h3 className="font-extrabold text-sm text-amber-900 uppercase tracking-wide">
                  Hướng dẫn sử dụng Chế độ Luyện viết luận
                </h3>
              </div>
              
              <div className="space-y-3 text-xs leading-relaxed text-amber-900 font-semibold">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 flex items-center justify-center font-black shrink-0">1</span>
                  <div>
                    <p>Đọc đề bài cần làm. Phân tích để tìm ra <strong className="text-amber-950 font-black">"Cụm danh từ chỉ chủ đề"</strong> và <strong className="text-amber-950 font-black">"Thể loại"</strong>.</p>
                    <div className="mt-1.5 p-3 bg-white/80 border border-amber-100 rounded-xl space-y-1 text-[11px] text-amber-800 font-medium">
                      <p>💡 <strong className="text-amber-900">Ví dụ minh họa:</strong></p>
                      <p><strong className="text-amber-950">Đề bài:</strong> What are the benefits and drawbacks of taking a gap year?</p>
                      <p><strong className="text-amber-950">Cụm danh từ chỉ chủ đề:</strong> Taking a gap year</p>
                      <p><strong className="text-amber-950">Thể loại:</strong> Ưu - nhược điểm</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 flex items-center justify-center font-black shrink-0">2</span>
                  <p className="pt-0.5">Điền Cụm danh từ chỉ chủ đề hoặc nội dung yêu cầu tương ứng vào ô trống.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 flex items-center justify-center font-black shrink-0">3</span>
                  <p className="pt-0.5">Chọn dạng dàn ý theo đúng thể loại của đề bài.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded bg-amber-200 text-amber-800 flex items-center justify-center font-black shrink-0">4</span>
                  <p className="pt-0.5">Đọc kỹ dàn ý hoàn chỉnh do ứng dụng tạo ra và bắt đầu thực hành viết câu theo hướng dẫn.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {(Object.keys(ESSAY_TEMPLATES) as EssayType[]).map((key, idx) => {
                const template = ESSAY_TEMPLATES[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleSelectType(key)}
                    className="group text-left bg-white p-6 rounded-2xl border-2 border-gray-200/80 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between min-h-[160px] relative overflow-hidden shadow-3xs cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50/50 rounded-full blur-xl group-hover:bg-emerald-100/50 transition-colors" />
                    <div>
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                        <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {template.title}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {template.description}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                      <span>Bắt đầu điền thông tin</span>
                      <Icons.ChevronRight size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 2: Fill inputs based on selection */}
        {step === "fill_inputs" && selectedType && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-6"
          >
            <div className="border-b border-gray-100 pb-4">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                DẠNG BÀI ĐÃ CHỌN
              </span>
              <h3 className="text-lg font-black text-gray-900 mt-1">
                {ESSAY_TEMPLATES[selectedType].title}
              </h3>
            </div>

            {apiError && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-start gap-2.5 text-xs">
                <Icons.AlertCircle className="shrink-0 mt-0.5 text-red-500" size={16} />
                <div className="space-y-1">
                  <p className="font-bold">Lỗi kết nối AI</p>
                  <p className="font-medium text-red-600">{apiError}</p>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                🔔 Hãy điền các từ/cụm từ gợi ý tiếng Anh cần thiết bên dưới. AI sẽ tự động liên kết các ý này để viết thành một bài luận hoàn chỉnh và phân chia thành các phần luyện dịch chi tiết.
              </p>

              {ESSAY_TEMPLATES[selectedType].inputs.map((input) => (
                <div key={input.key} className="space-y-2">
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                    {input.label}
                  </label>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {input.description}
                  </p>
                  <textarea
                    rows={2}
                    value={userInput[input.key] || ""}
                    onChange={(e) => handleInputChange(input.key, e.target.value)}
                    placeholder={input.placeholder}
                    className="w-full rounded-xl border border-gray-200/90 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-slate-700 bg-slate-50 font-medium"
                  />
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => setStep("select_type")}
                className="px-5 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleGenerateEssay}
                className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Icons.Sparkles size={16} />
                <span>Tạo bài viết đầy đủ</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Generating Screen */}
        {step === "generating" && (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 shadow-sm text-center space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin" />
                <Icons.Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-500 animate-pulse" size={24} />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-gray-900 text-lg">AI đang tạo bài mẫu theo hệ thống dàn ý</h3>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/80 max-w-md mx-auto">
              <p className="text-[11px] text-emerald-800 italic font-semibold">
                💡 "Viết luận VSTEP đòi hỏi sự rõ ràng về cấu trúc. Hãy kiên trì học các cụm từ liên kết như 'On the one hand', 'However', 'In addition'..."
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm / Preview full generated essay */}
        {step === "confirm_essay" && generatedEssay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    XÁC NHẬN BÀI LUẬN ĐÃ TẠO
                  </span>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                    {generatedEssay.title}
                  </h3>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    Tổng cộng: {getTotalSentencesCount(generatedEssay)} câu
                  </span>
                </div>
              </div>

              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 text-slate-700 space-y-5 text-sm leading-relaxed">
                {(["intro", "body1", "body2", "conclusion"] as const).map((key) => {
                  const section = generatedEssay.sections[key];
                  return (
                    <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                        <Icons.CheckCircle2 className="text-emerald-500" size={14} />
                        {section.title}
                      </h4>
                      <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                        {section.sentences.map((sent, idx) => {
                          const fullEng = getFullEnglishOfSentence(sent);
                          return (
                            <div key={idx} className="space-y-1">
                              <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                                {fullEng}
                              </p>
                              <p className="text-[11px] text-gray-400 font-semibold italic">
                                {sent.vietnamese}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 border-t border-gray-100">
                <button
                  onClick={() => setStep("fill_inputs")}
                  className="px-5 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Icons.RotateCcw size={14} />
                  Sửa lại thông tin nhập
                </button>
                <button
                  onClick={startPractice}
                  className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <Icons.Play size={15} />
                  <span>Xác nhận & Luyện viết câu</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 5: View sections menu (Trang Output) */}
        {step === "view_sections" && generatedEssay && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                DANH SÁCH ĐOẠN VĂN
              </span>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                CHỌN PHẦN LUYỆN VIẾT
              </h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed font-semibold">
                Nhấp vào "Luyện viết" ở mỗi đoạn bên dưới để thực hành gõ lại từng câu nâng cao khả năng phản xạ từ vựng.
              </p>
            </div>

            {/* Đề bài (Essay Prompt) */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 text-center space-y-2 shadow-3xs max-w-2xl mx-auto">
              <span className="inline-block text-[10px] uppercase font-extrabold tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md border border-emerald-200">
                ĐỀ BÀI (ESSAY PROMPT)
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-800 leading-relaxed">
                {generatedEssay.title}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(["intro", "body1", "body2", "conclusion"] as const).map((key) => {
                const section = generatedEssay.sections[key];
                const totalSents = section.sentences.length;
                const isDone = completedSections[key];

                return (
                  <div
                    key={key}
                    className={`bg-white rounded-2xl border p-5 shadow-3xs flex flex-col justify-between min-h-[160px] relative transition-all ${
                      isDone
                        ? "border-emerald-300 bg-emerald-50/10"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {key === "intro" ? "Mở bài" : key === "conclusion" ? "Kết bài" : "Thân bài"}
                        </span>
                        {isDone ? (
                          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                            <Icons.CheckCircle size={10} />
                            Hoàn thành
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {totalSents} câu
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-sm text-gray-900">
                        {section.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium mt-1.5 italic line-clamp-2">
                        {section.sentences[0] ? `"${section.sentences[0].vietnamese}..."` : ""}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleSelectSectionToPractice(key)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isDone
                            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        }`}
                      >
                        <Icons.PenTool size={12} />
                        <span>{isDone ? "Luyện viết lại" : "Luyện viết ngay"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => setStep("confirm_essay")}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 bg-white px-4 py-2.5 rounded-xl border border-gray-200 cursor-pointer shadow-3xs"
              >
                <Icons.ArrowLeft size={14} />
                <span>Quay lại xem Toàn bộ Bài viết</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 6: Active Practice Page (Trang Luyện viết) */}
        {step === "practice" && generatedEssay && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 shadow-sm space-y-6"
          >
            {/* Practice Header Info */}
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  LUYỆN VIẾT — {generatedEssay.sections[currentSectionKey].title}
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1 flex items-center gap-1.5">
                  <Icons.BookOpen size={16} className="text-emerald-600" />
                  Câu số {currentSentenceIdx + 1} / {generatedEssay.sections[currentSectionKey].sentences.length}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHint((prev) => !prev)}
                  className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200/50 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Hiển thị đáp án mẫu"
                >
                  <Icons.HelpCircle size={14} />
                  <span>{showHint ? "Ẩn gợi ý" : "Xem câu mẫu"}</span>
                </button>
              </div>
            </div>

            {/* Target Sentence Area */}
            {(() => {
              const sentence = generatedEssay.sections[currentSectionKey].sentences[currentSentenceIdx];
              const fullEnglish = getFullEnglishOfSentence(sentence);

              return (
                <div className="space-y-5">
                  
                  {/* Vietnamese Translation (Dịch Tiếng Việt) */}
                  <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100 space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-100/50 px-2 py-0.5 rounded">
                      Bản Dịch Tiếng Việt
                    </span>
                    <p className="text-sm font-extrabold text-slate-800 leading-relaxed">
                      {sentence.vietnamese}
                    </p>
                  </div>

                  {/* Highlight fixed vs filled segments */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                        Cấu trúc phân tách đoạn câu
                      </span>
                      <div className="flex items-center gap-2 text-[9px] font-bold">
                        <span className="flex items-center gap-1 text-slate-500">
                          <span className="w-2 h-2 rounded bg-slate-200" /> Dàn ý cố định
                        </span>
                        <span className="flex items-center gap-1 text-amber-700">
                          <span className="w-2 h-2 rounded bg-amber-100 border border-amber-200" /> Từ vựng cần điền
                        </span>
                      </div>
                    </div>
                    {renderSegments(sentence.segments)}
                  </div>

                  {/* Show hint template words if requested */}
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-amber-50/30 rounded-xl border border-amber-100 text-xs font-semibold text-amber-800 leading-relaxed flex items-center gap-2"
                    >
                      <Icons.Sparkles className="text-amber-600 shrink-0" size={14} />
                      <span>Câu gốc đầy đủ: <strong className="text-slate-800 select-all">{fullEnglish}</strong></span>
                    </motion.div>
                  )}

                  {/* Input area */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">
                      Nhập lại câu tiếng Anh hoàn chỉnh bên dưới:
                    </label>
                    <textarea
                      rows={3}
                      value={studentInput}
                      onChange={(e) => {
                        setStudentInput(e.target.value);
                        if (checked) {
                          setChecked(false);
                          setIsCorrect(false);
                        }
                      }}
                      placeholder="Gõ lại chính xác câu tiếng Anh ở trên..."
                      className="w-full rounded-2xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono text-slate-700 bg-slate-50/30"
                    />
                  </div>

                  {/* Diff feedback after checking */}
                  {checked && !isCorrect && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-rose-600 flex items-center gap-1">
                        <Icons.AlertCircle size={12} />
                        Lỗi chính tả / từ vựng phát hiện:
                      </span>
                      {renderDiffFeedback(studentInput, fullEnglish)}
                      <p className="text-[10px] text-slate-400 font-semibold italic">
                        Mẹo: Các chữ màu đỏ biểu thị phần viết sai hoặc thiếu so với đáp án gốc. Màu xanh đại diện cho ký tự chính xác.
                      </p>
                    </div>
                  )}

                  {/* Controls / Buttons */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setStep("view_sections")}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Icons.ArrowLeft size={14} />
                      <span>Quay lại đoạn</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {!checked ? (
                        <button
                          onClick={checkAnswer}
                          disabled={!studentInput.trim()}
                          className="px-6 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Icons.CheckCircle size={14} />
                          <span>Kiểm tra kết quả</span>
                        </button>
                      ) : (
                        <>
                          {isCorrect ? (
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-1 animate-bounce">
                                <Icons.ThumbsUp size={14} />
                                Hoàn hảo!
                              </span>
                              <button
                                onClick={handleNextSentence}
                                className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-100 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
                              >
                                <span>Tiếp tục</span>
                                <Icons.ChevronRight size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setChecked(false);
                                  setStudentInput("");
                                }}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                              >
                                Thử lại từ đầu
                              </button>
                              <button
                                onClick={() => {
                                  // Skip or auto fill correct answer
                                  setStudentInput(fullEnglish);
                                  setChecked(false);
                                }}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                              >
                                Điền đáp án gốc
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })()}
          </motion.div>
        )}

      </div>
    </div>
  );
}
