import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";
import { vstepTopics, VstepTopic, MindmapNode } from "./data/topics";
import InteractiveMindmap from "./components/InteractiveMindmap";
import QuizCoach from "./components/QuizCoach";
import EssayCoach from "./components/EssayCoach";

// Helper to render Lucide icon dynamically from its string representation
const getIconComponent = (name: string, size = 20) => {
  const IconComponent = (Icons as any)[name];
  return IconComponent ? <IconComponent size={size} /> : <Icons.HelpCircle size={size} />;
};

export default function App() {
  const [activeModule, setActiveModule] = useState<"vstep_topics" | "essay_coach">("vstep_topics");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("transport");
  const [activeTab, setActiveTab] = useState<"mindmap" | "quiz">("mindmap");
  
  // Tracking mastered vocabulary leaves in LocalStorage
  const [masteredNodes, setMasteredNodes] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("vstep_mastered_nodes");
    if (saved) {
      try {
        setMasteredNodes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse mastered nodes", e);
      }
    }
  }, []);

  const toggleNodeMastered = (nodeId: string) => {
    setMasteredNodes((prev) => {
      const updated = prev.includes(nodeId)
        ? prev.filter((id) => id !== nodeId)
        : [...prev, nodeId];
      localStorage.setItem("vstep_mastered_nodes", JSON.stringify(updated));
      return updated;
    });
  };

  const selectedTopic = vstepTopics.find((t) => t.id === selectedTopicId) || vstepTopics[0];
  const selectedTopicIndex = vstepTopics.findIndex((t) => t.id === selectedTopic.id) + 1;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-12 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Banner / Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200"
            >
              <Icons.GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-extrabold text-xl text-gray-900 tracking-tight flex items-center gap-2">
                VSTEP COACH
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  B1-B2 Prep
                </span>
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Học từ vựng và phản xạ theo 14 chủ điểm cốt lõi - Ms. Bao Ngoc
              </p>
            </div>
          </div>

          {/* Module Switcher Navigation Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 gap-1 shrink-0 shadow-3xs">
            <button
              onClick={() => setActiveModule("vstep_topics")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeModule === "vstep_topics"
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-950 font-bold"
              }`}
            >
              <Icons.BookOpen size={15} />
              <span>14 CHỦ ĐIỂM VSTEP</span>
            </button>
            <button
              onClick={() => setActiveModule("essay_coach")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeModule === "essay_coach"
                  ? "bg-emerald-600 text-white shadow-sm font-extrabold"
                  : "text-slate-600 hover:text-slate-950 font-bold"
              }`}
            >
              <Icons.PenTool size={15} />
              <span>LUYỆN VIẾT LUẬN</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <AnimatePresence mode="wait">
          {activeModule === "vstep_topics" ? (
            <motion.div
              key="vstep_topics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            >
              {/* Left Column: Topics Navigation */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-xs sticky top-24 max-h-[calc(100vh-140px)] overflow-y-auto">
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-3">
                    <Icons.Library size={18} className="text-emerald-600" />
                    <h2 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">
                      14 Chủ Điểm VSTEP
                    </h2>
                  </div>

                  {/* Unified List of 14 Topics */}
                  <div className="flex flex-col gap-1">
                    {vstepTopics.map((topic, idx) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                          selectedTopicId === topic.id
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                            selectedTopicId === topic.id ? "bg-emerald-700 text-emerald-100" : "bg-gray-100 text-gray-500"
                          }`}>
                            #{idx + 1}
                          </span>
                          {getIconComponent(topic.icon, 14)}
                          <span className="truncate">{topic.title}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ml-1 ${
                          selectedTopicId === topic.id ? "bg-emerald-700 text-emerald-100" : "bg-gray-100 text-gray-500"
                        }`}>
                          {topic.titleVi}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Work/Study Area */}
              <div className="lg:col-span-3 flex flex-col gap-6">
                {/* Topic Hero Card */}
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
                      {getIconComponent(selectedTopic.icon, 28)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold uppercase text-emerald-600 tracking-wider">
                          Chủ điểm {selectedTopicIndex} / 14
                        </span>
                        <span className="text-gray-300">•</span>
                        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                          {selectedTopic.title}
                        </h2>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Chủ đề tiếng Việt: <strong className="text-gray-700">{selectedTopic.titleVi}</strong> — {selectedTopic.description}
                      </p>
                    </div>
                  </div>

                  {/* Action tabs switcher (Mindmap vs Quiz Coach) */}
                  <div className="flex p-1 bg-gray-100 rounded-xl self-stretch sm:self-center border border-gray-200/30">
                    <button
                      type="button"
                      onClick={() => setActiveTab("mindmap")}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "mindmap"
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <Icons.Map size={14} />
                      Sơ đồ Mindmap
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("quiz")}
                      className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        activeTab === "quiz"
                          ? "bg-white text-emerald-700 shadow-xs"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <Icons.Sparkles size={14} />
                      AI Quiz Coach
                    </button>
                  </div>
                </div>

                {/* Dynamic tabs render with slide transition */}
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    {activeTab === "mindmap" ? (
                      <motion.div
                        key="mindmap"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                      >
                        <InteractiveMindmap
                          topic={selectedTopic}
                          masteredNodes={masteredNodes}
                          toggleNodeMastered={toggleNodeMastered}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="quiz"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                      >
                        <QuizCoach topic={selectedTopic} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="essay_coach"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <EssayCoach onBackToHome={() => setActiveModule("vstep_topics")} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
