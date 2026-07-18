import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  ChevronDown,
  Volume2,
  CheckCircle,
  HelpCircle,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  Map,
  RotateCcw
} from "lucide-react";
import { MindmapNode, VstepTopic } from "../data/topics";

interface InteractiveMindmapProps {
  topic: VstepTopic;
  masteredNodes: string[];
  toggleNodeMastered: (nodeId: string) => void;
}

export default function InteractiveMindmap({
  topic,
  masteredNodes,
  toggleNodeMastered
}: InteractiveMindmapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    [topic.mindmap.id]: true, // Root is expanded by default
  });

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (node: MindmapNode) => {
      allIds[node.id] = true;
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(topic.mindmap);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    // Keep only root expanded
    setExpandedNodes({ [topic.mindmap.id]: true });
  };

  const speakText = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if ("speechSynthesis" in window) {
      // Cancel currently speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9; // slightly slower for better learning
      window.speechSynthesis.speak(utterance);
    }
  };

  // Traverses tree to count total vocabulary leaves
  const getVocabCount = (node: MindmapNode): { total: number; mastered: number } => {
    let total = 0;
    let mastered = 0;

    const traverse = (n: MindmapNode) => {
      // Treat nodes with example or notes as learning items, or nodes with no children
      const isLeaf = !n.children || n.children.length === 0;
      if (isLeaf || n.example || n.notes) {
        total++;
        if (masteredNodes.includes(n.id)) {
          mastered++;
        }
      }
      if (n.children) {
        n.children.forEach(traverse);
      }
    };

    traverse(node);
    return { total, mastered };
  };

  const { total: totalVocab, mastered: masteredVocab } = getVocabCount(topic.mindmap);
  const completionPercentage = totalVocab > 0 ? Math.round((masteredVocab / totalVocab) * 100) : 0;

  // Renders a mindmap node recursively with connectives and progressive disclosure
  const renderNode = (node: MindmapNode, depth: number = 0, index: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isMastered = masteredNodes.includes(node.id);
    const isLeaf = !hasChildren;

    // Node thematic colors based on depth
    let bgStyle = "";
    let borderStyle = "";
    let textStyle = "";

    if (depth === 0) {
      // Root Node
      bgStyle = "bg-linear-to-r from-emerald-600 to-teal-700 text-white shadow-lg";
      borderStyle = "border-emerald-500";
      textStyle = "font-bold text-lg md:text-xl";
    } else if (depth === 1) {
      // Major Branches
      bgStyle = "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80 shadow-xs";
      borderStyle = "border-amber-400";
      textStyle = "font-semibold text-sm md:text-base";
    } else if (depth === 2) {
      // Mid branches
      bgStyle = "bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100/80";
      borderStyle = "border-sky-400";
      textStyle = "font-medium text-sm";
    } else {
      // Leaf/Deep branches
      bgStyle = "bg-white text-gray-800 border-gray-200 hover:bg-gray-50/80";
      borderStyle = "border-gray-300";
      textStyle = "text-xs md:text-sm";
    }

    if (isMastered) {
      bgStyle = "bg-emerald-50/90 text-emerald-950 border-emerald-300 hover:bg-emerald-100/90";
    }

    return (
      <div key={node.id} className="flex flex-col items-start relative w-full my-2 pl-4 md:pl-6">
        {/* Connection line helper (vertical) */}
        {depth > 0 && (
          <div className="absolute left-0 top-[-8px] bottom-0 w-[2px] bg-gray-200" style={{ left: "8px" }}>
            {/* Horizontal branch marker */}
            <div className="absolute top-[22px] left-0 w-[12px] h-[2px] bg-gray-200" />
          </div>
        )}

        {/* Node body */}
        <div
          id={node.id}
          onClick={() => hasChildren && toggleExpand(node.id)}
          className={`group flex flex-col p-3 rounded-xl border-2 transition-all duration-300 ${bgStyle} ${borderStyle} ${
            hasChildren ? "cursor-pointer select-none" : ""
          } w-full max-w-2xl relative`}
        >
          {/* Main content row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Expand carets for branches */}
              {hasChildren && (
                <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
              )}

              {/* Mastered tick for vocabulary leaves */}
              {(isLeaf || node.example || node.notes) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeMastered(node.id);
                  }}
                  className={`p-0.5 rounded-full transition-all duration-300 ${
                    isMastered ? "text-emerald-600 hover:scale-110" : "text-gray-300 hover:text-emerald-500"
                  }`}
                  title={isMastered ? "Đã thuộc cụm từ này!" : "Đánh dấu đã thuộc"}
                >
                  <CheckCircle size={18} className={isMastered ? "fill-emerald-100" : ""} />
                </button>
              )}

              {/* English Term */}
              <span className={`tracking-wide ${textStyle}`}>{node.label}</span>

              {/* Text to Speech trigger */}
              <button
                type="button"
                onClick={(e) => speakText(node.label, e)}
                className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-all ml-1"
                title="Phát âm tiếng Anh"
              >
                <Volume2 size={14} />
              </button>
            </div>

            {/* Depth label indicator */}
            {hasChildren && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {isExpanded ? "Đóng" : "Mở nhánh"}
              </span>
            )}
          </div>

          {/* Vietnamese meaning & Details when revealed */}
          {node.labelVi && (
            <div className="mt-1 pl-1 text-xs md:text-sm text-gray-600 font-normal">
              <span className="text-gray-400 mr-1">↳</span> {node.labelVi}
            </div>
          )}

          {/* Additional notes/clues */}
          {node.notes && (
            <div className="mt-1 pl-1 text-xs text-amber-700 font-normal flex items-start gap-1 bg-amber-50/50 p-1.5 rounded-md border border-amber-100/50">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>{node.notes}</span>
            </div>
          )}

          {/* Practical Usage Example */}
          {node.example && (
            <div className="mt-2 pl-2 border-l-2 border-indigo-400/60 py-0.5 text-xs text-indigo-950 italic bg-indigo-50/40 rounded-r-md">
              <span className="font-semibold text-indigo-700 not-italic block mb-0.5 text-[10px] uppercase tracking-wider">Ví dụ ứng dụng:</span>
              "{node.example}"
              <button
                type="button"
                onClick={(e) => speakText(node.example || "", e)}
                className="inline-flex items-center ml-1.5 text-indigo-400 hover:text-indigo-700"
                title="Nghe ví dụ"
              >
                <Volume2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Children branch with progressive disclosure animation */}
        {hasChildren && (
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, scaleY: 0.95 }}
                animate={{ height: "auto", opacity: 1, scaleY: 1 }}
                exit={{ height: 0, opacity: 0, scaleY: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden w-full origin-top"
              >
                <div className="w-full">
                  {node.children!.map((child, idx) => renderNode(child, depth + 1, idx))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Map size={18} />
            </span>
            <h3 className="font-bold text-gray-900 text-lg">Sơ Đồ Tư Duy Tương Tác</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Click vào các nhánh có nhãn <span className="font-semibold text-gray-700">Mở nhánh</span> để mở rộng thông tin dần dần. Đánh dấu tích xanh khi đã thuộc từ.
          </p>
        </div>

        {/* Quick toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs font-medium px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-all flex items-center gap-1"
          >
            <Layers size={13} />
            Mở toàn bộ
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs font-medium px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-all flex items-center gap-1"
          >
            <RotateCcw size={13} />
            Thu gọn
          </button>
        </div>
      </div>

      {/* Progress tracking banner */}
      <div className="mb-6 p-4 rounded-xl bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-100/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider block">Tiến độ ghi nhớ</span>
            <span className="text-sm font-bold text-indigo-950">
              Đã thuộc {masteredVocab} / {totalVocab} cụm từ và ý tưởng đắt giá ({completionPercentage}%)
            </span>
          </div>
        </div>

        <div className="w-full md:w-64 bg-indigo-100 h-3 rounded-full overflow-hidden">
          <motion.div
            className="bg-indigo-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Actual Mindmap Tree Container */}
      <div className="bg-gray-50/50 rounded-2xl p-3 md:p-6 border border-gray-100 overflow-x-auto min-h-[400px]">
        <div className="min-w-[320px] max-w-4xl mx-auto">
          {renderNode(topic.mindmap)}
        </div>
      </div>

      {/* Study advice */}
      <div className="mt-6 p-4 rounded-xl bg-emerald-50/40 border border-emerald-100/60 flex items-start gap-3">
        <BookOpen size={16} className="text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          <strong>Lời khuyên VSTEP:</strong> Đừng chỉ học từ đơn lẻ! Hãy học theo các cụm ý tưởng (ideas) có sẵn trong sơ đồ này để khi viết bài essay Writing Task 2 hoặc trả lời câu hỏi Speaking, bạn có thể áp dụng nguyên văn cả cụm đúng ngữ pháp và ngữ nghĩa, giúp tăng điểm tối đa cho tiêu chí <span className="font-semibold">Lexical Resource</span>.
        </p>
      </div>
    </div>
  );
}
