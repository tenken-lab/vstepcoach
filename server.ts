import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini client to ensure startup stability if API key is temporarily absent
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment. Please set it in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper to call Gemini models with robust retry logic (handles 503/429 transient errors)
async function callGeminiWithRetry(
  ai: GoogleGenAI,
  config: {
    model: string;
    contents: any;
    config?: any;
  },
  maxAttempts = 3
): Promise<any> {
  let attempt = 0;
  let lastError: any = null;
  // Try the preferred model first, then fall back to gemini-3.1-flash-lite as an alternative model in case of persistent quota/demand issues
  const modelsToTry = config.model === "gemini-3.5-flash" 
    ? ["gemini-3.5-flash", "gemini-3.1-flash-lite"] 
    : [config.model, "gemini-3.5-flash", "gemini-3.1-flash-lite"];

  for (const modelName of modelsToTry) {
    // If we're already trying a fallback model, reduce max attempts to get results faster
    const isFallbackModel = modelName !== config.model;
    const modelMaxAttempts = isFallbackModel ? 1 : maxAttempts;

    for (attempt = 1; attempt <= modelMaxAttempts; attempt++) {
      try {
        console.log(`[Gemini API] Attempt ${attempt} calling model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: config.contents,
          config: config.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMessage = String(err?.message || err);
        const errStatus = String(err?.status || "");
        const errCode = String(err?.code || "");
        
        console.warn(
          `[Gemini API Warning] Attempt ${attempt} failed for model ${modelName}. Code: ${errCode}, Status: ${errStatus}, Error: ${errMessage}`
        );

        const isTransient = 
          errMessage.includes("503") || 
          errMessage.includes("UNAVAILABLE") || 
          errMessage.includes("429") || 
          errMessage.includes("RESOURCE_EXHAUSTED") ||
          errMessage.includes("high demand") ||
          errCode === "503" ||
          errCode === "429";

        const isHighDemand = 
          errMessage.includes("503") || 
          errMessage.includes("UNAVAILABLE") || 
          errMessage.includes("high demand") || 
          errStatus === "503";

        // If the main model is experiencing severe demand issues, failover faster (max 2 attempts)
        const actualMaxAttempts = isHighDemand && !isFallbackModel ? 2 : modelMaxAttempts;

        if (isTransient && attempt < actualMaxAttempts) {
          const delay = isHighDemand 
            ? Math.pow(1.5, attempt) * 1000 + Math.random() * 300 
            : Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.log(`[Gemini API] Transient error detected. Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // If it's a fatal structural error or we ran out of attempts for this model, try the fallback model if applicable
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retrying with fallback model.");
}

// Local robust fallback evaluator when Gemini is completely unavailable/high demand
function getLocalFallbackEvaluation(type: string, prompt: string, userAnswer: string, vocabularyContext: any) {
  const matchedVocab: string[] = [];
  const list = Array.isArray(vocabularyContext) ? vocabularyContext : (vocabularyContext?.list || []);
  const textLower = userAnswer.toLowerCase();
  
  for (const item of list) {
    const word = item.label || item.vocabWord || "";
    if (word && textLower.includes(word.toLowerCase())) {
      matchedVocab.push(word);
    }
  }

  const improvedVocabSuggestions: any[] = [];
  let addedCount = 0;
  for (const item of list) {
    const word = item.label || item.vocabWord || "";
    if (word && !matchedVocab.includes(word) && addedCount < 3) {
      improvedVocabSuggestions.push({
        original: "good/bad",
        suggested: word,
        reason: `Sử dụng "${word}" thay vì các tính từ thông thường để tăng tính học thuật và chính xác theo chủ đề.`
      });
      addedCount++;
    }
  }
  if (improvedVocabSuggestions.length === 0) {
    improvedVocabSuggestions.push({
      original: "bad impacts",
      suggested: "adverse consequences",
      reason: "Cụm từ này giúp cách diễn đạt sang trọng và chuyên nghiệp chuẩn B2 hơn."
    });
  }

  const grammarCorrections: any[] = [];
  const sentences = userAnswer.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (s[0] && s[0] !== s[0].toUpperCase()) {
      const corrected = s[0].toUpperCase() + s.slice(1);
      grammarCorrections.push({
        original: s,
        corrected: corrected,
        explanation: "Chữ cái đầu tiên của câu cần phải được viết hoa đúng chuẩn chính tả."
      });
    }
  }

  const wordsCount = userAnswer.trim().split(/\s+/).length;
  let band = "B1";
  let scoreExplain = "Bài thực hành có bố cục rõ ràng, diễn đạt mạch lạc nhưng cấu trúc ngữ pháp có thể đa dạng hóa hơn nữa.";
  if (wordsCount > 120) {
    band = "B2";
    scoreExplain = "Bài thực hành có chiều sâu, lồng ghép được nhiều luận điểm chặt chẽ và từ vựng phong phú phù hợp với cấp độ B2.";
  } else if (wordsCount < 60) {
    band = "Dưới B1";
    scoreExplain = "Bài làm của bạn hơi ngắn, cần bổ sung thêm luận điểm và diễn đạt chi tiết hơn để đạt tiêu chuẩn VSTEP B1.";
  }

  const modelAnswer = `Regarding this topic, it plays a vital role in our modern lives. On the one hand, we should recognize that there are several positive aspects, which help individuals expand their opportunities and upgrade useful skills. On the other hand, we must also acknowledge certain drawbacks such as financial or time investment. In conclusion, despite these challenges, the significant advantages make it a highly valuable trend for our future development.`;

  return {
    band,
    scoreExplain,
    matchedVocab,
    improvedVocabSuggestions,
    grammarCorrections,
    modelAnswer
  };
}

// Local robust fallback sentence evaluator
function getLocalFallbackSentenceEvaluation(topicId: string, vocabWord: string, userSentence: string) {
  const containsVocab = userSentence.toLowerCase().includes(vocabWord.toLowerCase());
  
  const grammarCorrections: any[] = [];
  if (userSentence[0] && userSentence[0] !== userSentence[0].toUpperCase()) {
    const corrected = userSentence[0].toUpperCase() + userSentence.slice(1);
    grammarCorrections.push({
      original: userSentence.substring(0, Math.min(15, userSentence.length)) + "...",
      corrected: corrected.substring(0, Math.min(15, corrected.length)) + "...",
      explanation: "Nên viết hoa chữ cái đầu tiên của câu."
    });
  }

  const isValid = containsVocab;

  const feedbackMessage = containsVocab 
    ? `Rất tốt! Bạn đã sử dụng thành công cụm từ "${vocabWord}" trong câu của mình.`
    : `Câu của bạn chưa chứa từ khóa mục tiêu "${vocabWord}". Hãy thử lồng ghép cụm từ này vào câu viết.`;

  const suggestions = [
    {
      suggestedSentence: `It is widely believed that ${vocabWord} offers numerous benefits for individuals.`,
      explanation: "Sử dụng cấu trúc bị động 'It is widely believed that...' để tăng tính khách quan và học thuật cho câu viết."
    },
    {
      suggestedSentence: `Moreover, ${vocabWord} plays an essential role in resolving this issue.`,
      explanation: "Thêm trạng từ liên kết 'Moreover' và cụm từ 'plays an essential role' để tạo sự mạch lạc, trôi chảy."
    }
  ];

  return {
    isValid,
    containsVocab,
    feedbackMessage,
    grammarCorrections,
    suggestions
  };
}

// Local fallback for expanded arguments customizer
function getLocalFallbackExpandedArguments(userCustomVars: any, baseVars: any) {
  const merged = { ...baseVars, ...userCustomVars };

  const pairs = [
    ["view1En", "view1Vi"],
    ["view2En", "view2Vi"],
    ["advantage1En", "advantage1Vi"],
    ["advantage2En", "advantage2Vi"],
    ["disadvantage1En", "disadvantage1Vi"],
    ["disadvantage2En", "disadvantage2Vi"],
    ["explanation1En", "explanation1Vi"],
    ["explanation2En", "explanation2Vi"],
    ["explanation3En", "explanation3Vi"],
    ["example1En", "example1Vi"],
    ["example2En", "example2Vi"],
    ["reason1En", "reason1Vi"],
    ["reason2En", "reason2Vi"],
    ["reason3En", "reason3Vi"],
    ["myOpinionEn", "myOpinionVi"],
    ["perspectiveEn", "perspectiveVi"]
  ];

  for (const [enKey, viKey] of pairs) {
    if (merged[viKey] && !merged[enKey]) {
      merged[enKey] = merged[viKey];
    } else if (merged[enKey] && !merged[viKey]) {
      merged[viKey] = merged[enKey];
    }
  }

  const vocabList = merged.vocabList || [
    { label: "essential role", labelVi: "vai trò thiết yếu" },
    { label: "significant advantage", labelVi: "lợi thế đáng kể" },
    { label: "adverse consequence", labelVi: "hệ quả bất lợi" },
    { label: "mitigate problems", labelVi: "giảm thiểu vấn đề" },
    { label: "enhance skills", labelVi: "nâng cao kỹ năng" },
    { label: "sustainable future", labelVi: "tương lai bền vững" }
  ];

  return {
    ...merged,
    vocabList
  };
}

// REST Endpoint to evaluate user's Speaking/Writing draft
app.post("/api/ai/evaluate", async (req, res) => {
  const { topicId, type, prompt, userAnswer, vocabularyContext } = req.body;
  try {

    if (!userAnswer || userAnswer.trim() === "") {
      res.status(400).json({ error: "Bài làm của bạn đang để trống." });
      return;
    }

    const ai = getGeminiClient();

    const evaluationPrompt = `
You are an expert VSTEP B1/B2/C1 Examiner.
Please evaluate the following user's practice draft for VSTEP ${type === "writing" ? "Writing (Task 2 / paragraph)" : "Speaking"}.

Topic Context: ${topicId}
Prompt Question: "${prompt}"
User's Draft Answer: "${userAnswer}"

Target Vocabulary & Ideas from our study syllabus:
${JSON.stringify(vocabularyContext, null, 2)}

Provide feedback on:
1. Expected Band prediction (Below B1, B1, B2, or C1).
2. Detail criteria check (Fluency, Coherence, Vocabulary, Grammar, Pronunciation/filler advice).
3. Matched vocabulary: Highlight which words/phrases from the target list they used.
4. Suggestions for vocabulary upgrading: Suggest how they can swap basic words they used with advanced words/collocations from our mindmap list.
5. Grammatical or spelling corrections (if any).
6. Provide an elegant B2-level model answer that is natural, highly coherent, and integrates several phrases from the target syllabus.

Make sure your evaluations and explanations are written in Vietnamese for clear learning. Keep your tone encouraging and professional.
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: evaluationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            band: {
              type: Type.STRING,
              description: "Đánh giá bậc điểm VSTEP dự kiến (Dưới B1, B1, B2, hoặc C1)."
            },
            scoreExplain: {
              type: Type.STRING,
              description: "Giải thích chi tiết về điểm số và tiêu chí VSTEP (bằng tiếng Việt, chia các đoạn rõ ràng)."
            },
            matchedVocab: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Danh sách các cụm từ vựng/ý tưởng từ sơ đồ tư duy mà người học đã áp dụng thành công."
            },
            improvedVocabSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "Từ hoặc cụm từ gốc đơn giản của người học." },
                  suggested: { type: Type.STRING, description: "Cụm từ nâng cấp B2/C1 gợi ý từ Mindmap." },
                  reason: { type: Type.STRING, description: "Lý do vì sao cụm từ này tốt hơn và cách áp dụng (tiếng Việt)." }
                },
                required: ["original", "suggested", "reason"]
              },
              description: "Đề xuất nâng cấp từ vựng sang cấu trúc nâng cao hơn từ sơ đồ tư duy."
            },
            grammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "Câu gốc có lỗi chính tả, ngữ pháp hoặc diễn đạt chưa tự nhiên." },
                  corrected: { type: Type.STRING, description: "Câu đã sửa lại cho đúng ngữ pháp và tự nhiên." },
                  explanation: { type: Type.STRING, description: "Giải thích chi tiết lỗi sai bằng tiếng Việt." }
                },
                required: ["original", "corrected", "explanation"]
              },
              description: "Danh sách sửa lỗi ngữ pháp, chính tả nếu có."
            },
            modelAnswer: {
              type: Type.STRING,
              description: "Bài mẫu VSTEP B2 chuẩn, trôi chảy, tự nhiên, lồng ghép nhiều từ vựng và cấu trúc đắt giá từ mindmap."
            }
          },
          required: ["band", "scoreExplain", "matchedVocab", "improvedVocabSuggestions", "grammarCorrections", "modelAnswer"]
        },
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không thể nhận được kết quả từ dịch vụ AI.");
    }

    const feedback = JSON.parse(resultText.trim());
    res.json(feedback);
  } catch (error: any) {
    console.error("AI Evaluation Error:", error);
    try {
      console.log("[Fallback] Utilizing local fallback evaluation due to API error/unavailability...");
      const fallbackFeedback = getLocalFallbackEvaluation(type, prompt, userAnswer, vocabularyContext);
      res.json(fallbackFeedback);
    } catch (fallbackError) {
      console.error("Local Fallback Evaluation failed:", fallbackError);
      res.status(500).json({
        error: error?.message || "Đã xảy ra lỗi trong quá trình phân tích bằng AI. Vui lòng kiểm tra cấu hình Secrets API Key.",
      });
    }
  }
});

// REST Endpoint to evaluate a single sentence made with a target vocabulary word
app.post("/api/ai/evaluate-sentence", async (req, res) => {
  const { topicId, vocabWord, userSentence } = req.body;
  try {

    if (!userSentence || userSentence.trim() === "") {
      res.status(400).json({ error: "Câu trả lời của bạn đang để trống." });
      return;
    }

    const ai = getGeminiClient();

    const sentencePrompt = `
You are an encouraging VSTEP ESL teacher. 
The student is practicing a vocabulary term for the VSTEP topic "${topicId}".
Target vocabulary term: "${vocabWord}"
Student's draft sentence: "${userSentence}"

Evaluate the sentence and provide constructive feedback in Vietnamese:
1. Is the target vocabulary used correctly in context (isValid)? 
2. Does the sentence contain the target vocabulary (containsVocab)?
3. Grammar and spelling correction: If there are any grammatical errors, spelling errors, or awkward expressions, provide a clean corrected version and explain why in Vietnamese.
4. Suggestions for improvement: Suggest 1 or 2 elegant alternative ways to express this sentence to hit the VSTEP B2 level (utilizing structures like "It helps...", "It allows me to...", etc.).

Format your response exactly as a JSON object matching the requested schema.
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: sentencePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: {
              type: Type.BOOLEAN,
              description: "True nếu từ vựng được dùng đúng hoàn cảnh, đúng ngữ pháp và câu có nghĩa."
            },
            containsVocab: {
              type: Type.BOOLEAN,
              description: "True nếu câu có chứa từ vựng mục tiêu (cho phép sai khác dạng chia động từ, danh từ số ít/nhiều)."
            },
            feedbackMessage: {
              type: Type.STRING,
              description: "Lời nhận xét ngắn gọn, khích lệ người học bằng tiếng Việt về câu viết của họ."
            },
            grammarCorrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "Cụm từ hoặc phần câu bị sai ngữ pháp/chính tả." },
                  corrected: { type: Type.STRING, description: "Phương án sửa lại cho đúng chuẩn ngữ pháp." },
                  explanation: { type: Type.STRING, description: "Giải thích lỗi sai bằng tiếng Việt ngắn gọn, dễ hiểu." }
                },
                required: ["original", "corrected", "explanation"]
              },
              description: "Sửa lỗi ngữ pháp nếu câu có lỗi. Trống nếu câu đã hoàn hảo."
            },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  suggestedSentence: { type: Type.STRING, description: "Câu gợi ý viết lại cực kỳ tự nhiên và xịn chuẩn B2." },
                  explanation: { type: Type.STRING, description: "Giải thích lý do viết như vậy sẽ hay hơn như thế nào (tiếng Việt)." }
                },
                required: ["suggestedSentence", "explanation"]
              },
              description: "Đề xuất viết lại câu nâng cao cho sang và mượt hơn."
            }
          },
          required: ["isValid", "containsVocab", "feedbackMessage", "grammarCorrections", "suggestions"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không thể nhận được phản hồi từ dịch vụ AI.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Sentence evaluation error:", error);
    try {
      console.log("[Fallback] Utilizing local fallback sentence evaluation due to API error/unavailability...");
      const fallbackResult = getLocalFallbackSentenceEvaluation(topicId, vocabWord, userSentence);
      res.json(fallbackResult);
    } catch (fallbackError) {
      console.error("Local Fallback Sentence Evaluation failed:", fallbackError);
      res.status(500).json({
        error: error?.message || "Đã xảy ra lỗi khi chấm câu. Vui lòng kiểm tra lại cấu hình API Key.",
      });
    }
  }
});

// REST Endpoint to translate example sentences into clean, natural Vietnamese hints
app.post("/api/ai/translate", async (req, res) => {
  const { text, word } = req.body || {};
  try {
    if (!text || text.trim() === "") {
      res.json({ translated: `Hãy viết 1 câu hoàn chỉnh sử dụng cụm từ "${word || ''}".` });
      return;
    }

    const ai = getGeminiClient();
    const translationPrompt = `
You are an expert English-to-Vietnamese translator.
Please translate the following English example sentence into clear, natural Vietnamese.
This translation will be used as a Vietnamese writing prompt/hint for an ESL student, so it must be extremely natural and accurate Vietnamese. Do NOT include any additional notes, explanations, or quotes. Just output the translation itself.

English Sentence: "${text}"
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: translationPrompt,
    });

    const translatedText = response.text?.trim() || "";
    res.json({ translated: translatedText });
  } catch (error: any) {
    console.error("Translation API Error:", error);
    res.json({ translated: `Hãy đặt 1 câu tiếng Anh có chứa cụm từ "${word || ''}".` });
  }
});

// REST Endpoint to translate custom arguments and automatically expand logically fitting subsequent supporting/explanation sentences
app.post("/api/ai/expand-arguments", async (req, res) => {
  const { topicId, essayType, prompt, userCustomVars, baseVars, level = "B1" } = req.body;
  try {

    const ai = getGeminiClient();

    const expandPrompt = `
You are an expert VSTEP Writing Coach.
The student is preparing an essay on the topic "${topicId}" (Prompt Question: "${prompt}") using the essay structure "${essayType}".

The standard pre-defined variables for this topic are:
${JSON.stringify(baseVars, null, 2)}

The student has decided to replace some core arguments with their own customized ideas:
${JSON.stringify(userCustomVars, null, 2)}

Your task is to:
1. Translate any custom inputs that are only provided in one language. For example:
   - If "view1Vi" is filled with Vietnamese but "view1En" is empty, translate it into natural English for "view1En".
   - If "advantage1En" is filled with English but "advantage1Vi" is empty, translate it into natural Vietnamese for "advantage1Vi".
2. CRITICAL STEP: Expand/adapt the supporting and explanation variables to LOGICALLY MATCH the student's customized core ideas, instead of keeping the unrelated pre-defined ones.
   Depending on the essay type ("${essayType}"), map the custom ideas to their explanation/example/reason variables:
   - If "advantages" is chosen and "advantage1Vi" or "advantage1En" is modified, you must generate matching "explanation1En" and "explanation1Vi" that explain this specific custom advantage.
   - If "advantages" is chosen and "advantage2Vi" or "advantage2En" is modified, you must generate matching "explanation2En" and "explanation2Vi" (and optionally "example1En" / "example1Vi") that explain/illustrate this custom advantage.
   - If "advantages" is chosen and "disadvantage1Vi" or "disadvantage1En" is modified, you must generate matching "explanation3En" and "explanation3Vi" that explain this custom disadvantage.
   - If "balanced" is chosen and "view1Vi" or "view1En" is modified, you must generate matching "reason1En"/"reason1Vi" and "reason2En"/"reason2Vi" (and optionally "example1En"/"example1Vi") that support this custom view.
   - If "balanced" is chosen and "view2Vi" or "view2En" is modified, you must generate matching "reason3En"/"reason3Vi" and "explanation1En"/"explanation1Vi" (and optionally "example2En"/"example2Vi") that support this custom view.
   - If "opinion" is chosen and "perspectiveVi" or "perspectiveEn" is modified, you must generate matching "advantage1En"/"advantage1Vi", "explanation1En"/"explanation1Vi", "example1En"/"example1Vi" and "advantage2En"/"advantage2Vi", "explanation2En"/"explanation2Vi", "example2En"/"example2Vi" that support their overall agree/disagree perspective.
   - If "problem_solution" is chosen and "disadvantage1Vi" or "disadvantage1En" is modified, you must generate matching "explanation3En" and "explanation3Vi".
   - If "cause_solution" is chosen and "reason3Vi" or "reason3En" is modified, you must generate matching "explanation3En" and "explanation3Vi".
   - If "cause_effect" is chosen and "reason3Vi" or "reason3En" is modified, you must generate matching "explanation3En" and "explanation3Vi".

3. CRITICAL DETECT AND OVERRIDE: Check if the provided "prompt" question is different from the predefined topic's theme (e.g., if the prompt is about "changing jobs frequently" but baseVars.topicEn is about "choosing a stable job with high salary").
   - If the topic has changed or is different, you MUST rewrite ALL variables (including topicEn, topicVi, advantages, disadvantages, views, explanations, reasons, and examples) to perfectly align with the new prompt question and essay structure. Do NOT keep any of the unrelated pre-defined baseVars values.
   - For example, if the prompt is "Discuss the causes and effects of changing jobs frequently", topicEn MUST be "changing jobs frequently", topicVi MUST be "thay đổi công việc thường xuyên", and all other variables (like disadvantages/reasons/explanations) must support this new theme.

4. VSTEP TARGET LEVEL INSTRUCTION (${level}):
   ${level === "B2" 
     ? "Since the user is practicing at B2 level, generate sophisticated arguments, advanced vocabulary, precise collocations, and varied sentence structures that showcase upper-intermediate English proficiency (e.g. use terms like 'enhance overall well-being', 'financial implications', 'exacerbate', 'mitigate'). The Vietnamese translations must match precisely." 
     : "Since the user is practicing at B1 level, you MUST generate very clear, simple, and straightforward ideas and supporting sentences. Avoid using complex words, highly academic jargon, or overly complicated grammar. Use common, easy-to-understand verbs and nouns (e.g., 'it helps people save money', 'it is good for health', 'it makes traffic better') so that a B1 level student can easily practice writing and memorize them."
   }

5. GENERATE KEY VOCABULARY LIST: generate a list of 6-8 key vocabulary words or short phrases that are extremely relevant to the essay prompt. Return this list as the 'vocabList' field. For each item in 'vocabList', include 'label' (the English word/phrase) and 'labelVi' (the accurate Vietnamese translation).

For any variables that are NOT customized by the user and are NOT logically affected by their custom arguments (and if the prompt matches the predefined topic), you may keep their original values from the baseVars object.

Ensure the English sentences are natural, grammatically correct, and appropriate for VSTEP B1/B2 levels, and that the Vietnamese translations are accurate and natural. Do NOT use fancy words that are too complex.

Return the result as a single JSON object containing ALL updated or kept TopicVariables keys, along with the 'vocabList' array.
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: expandPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topicEn: { type: Type.STRING },
            topicVi: { type: Type.STRING },
            advantage1En: { type: Type.STRING },
            advantage1Vi: { type: Type.STRING },
            explanation1En: { type: Type.STRING },
            explanation1Vi: { type: Type.STRING },
            advantage2En: { type: Type.STRING },
            advantage2Vi: { type: Type.STRING },
            explanation2En: { type: Type.STRING },
            explanation2Vi: { type: Type.STRING },
            example1En: { type: Type.STRING },
            example1Vi: { type: Type.STRING },
            disadvantage1En: { type: Type.STRING },
            disadvantage1Vi: { type: Type.STRING },
            explanation3En: { type: Type.STRING },
            explanation3Vi: { type: Type.STRING },
            disadvantage2En: { type: Type.STRING },
            disadvantage2Vi: { type: Type.STRING },
            example2En: { type: Type.STRING },
            example2Vi: { type: Type.STRING },
            view1En: { type: Type.STRING },
            view1Vi: { type: Type.STRING },
            view2En: { type: Type.STRING },
            view2Vi: { type: Type.STRING },
            reason1En: { type: Type.STRING },
            reason1Vi: { type: Type.STRING },
            reason2En: { type: Type.STRING },
            reason2Vi: { type: Type.STRING },
            reason3En: { type: Type.STRING },
            reason3Vi: { type: Type.STRING },
            myOpinionEn: { type: Type.STRING },
            myOpinionVi: { type: Type.STRING },
            perspectiveEn: { type: Type.STRING },
            perspectiveVi: { type: Type.STRING },
            vocabList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  labelVi: { type: Type.STRING }
                },
                required: ["label", "labelVi"]
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không thể nhận được kết quả phát triển luận điểm từ AI.");
    }
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Expand Arguments Error:", error);
    try {
      console.log("[Fallback] Utilizing local fallback expanded arguments due to API error/unavailability...");
      const fallbackResult = getLocalFallbackExpandedArguments(userCustomVars, baseVars);
      res.json(fallbackResult);
    } catch (fallbackError) {
      console.error("Local Fallback Expanded Arguments failed:", fallbackError);
      res.status(500).json({
        error: error?.message || "Đã xảy ra lỗi khi phát triển luận điểm bằng AI."
      });
    }
  }
});

// Helper to provide natural, level-targeted, pre-built local fallback essays when Gemini is unavailable or rate-limited
function getLocalFallbackEssay(prompt: string, essayType: string, level: string): any {
  const pLower = (prompt || "").toLowerCase();
  
  // Clean prompt for display
  let promptClean = prompt || "modern life";
  if (promptClean.length > 50) {
    promptClean = "this modern trend";
  }

  // 1. TRANSPORT TOPIC FALLBACK
  if (pLower.includes("transport") || pLower.includes("giao thông") || pLower.includes("bus") || pLower.includes("xe buýt")) {
    if (level === "B1") {
      return {
        title: "Developing Public Transport Systems (VSTEP B1)",
        vocabList: [
          { label: "public transport", labelVi: "phương tiện công cộng" },
          { label: "traffic congestion", labelVi: "tắc nghẽn giao thông" },
          { label: "save money", labelVi: "tiết kiệm tiền" },
          { label: "bus stops", labelVi: "trạm dừng xe buýt" },
          { label: "citizens", labelVi: "công dân, người dân" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Giới thiệu chủ đề bài viết và nêu định hướng chung.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Ngày nay, phát triển giao thông công cộng là một chủ đề rất quan trọng ở nhiều thành phố lớn.",
                english: "Nowadays, developing public transport is a very important topic in many big cities.",
                hint: "Nowadays, developing...",
                keywords: ["public transport", "important topic"]
              },
              {
                id: "intro_s2",
                vietnamese: "Mặc dù có một số khó khăn, tôi tin rằng xu hướng này mang lại nhiều lợi ích.",
                english: "While there are some difficulties, I believe that this trend brings many benefits.",
                hint: "While there are...",
                keywords: ["difficulties", "benefits"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Phát triển các lợi ích chính của giao thông công cộng.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Một mặt, giao thông công cộng rất tốt vì nó giúp giảm ùn tắc giao thông.",
                english: "On the one hand, public transport is good because it reduces traffic congestion.",
                hint: "On the one hand...",
                keywords: ["traffic congestion", "reduces"]
              },
              {
                id: "body1_s2",
                vietnamese: "Khi có nhiều người sử dụng xe buýt hơn, sẽ có ít xe cá nhân hơn trên đường phố.",
                english: "When more people use buses, there are fewer private vehicles on the streets.",
                hint: "When more people...",
                keywords: ["private vehicles", "streets"]
              },
              {
                id: "body1_s3",
                vietnamese: "Hơn nữa, vé xe buýt thường rất rẻ đối với học sinh và người đi làm.",
                english: "Furthermore, bus tickets are usually very cheap for students and commuters.",
                hint: "Furthermore, bus tickets...",
                keywords: ["cheap", "commuters"]
              },
              {
                id: "body1_s4",
                vietnamese: "Điều này giúp người dân tiết kiệm được rất nhiều tiền mỗi tháng.",
                english: "This helps people save a lot of money every month.",
                hint: "This helps people...",
                keywords: ["save money", "every month"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Phát triển các hạn chế của giao thông công cộng.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Mặt khác, vẫn có một số điểm chưa tốt cần xem xét.",
                english: "On the other hand, there are still some bad points to consider.",
                hint: "On the other hand, there...",
                keywords: ["bad points", "consider"]
              },
              {
                id: "body2_s2",
                vietnamese: "Ví dụ, nhiều xe buýt thường rất đông đúc trong giờ cao điểm.",
                english: "For example, many buses are often very crowded during rush hours.",
                hint: "For example, many...",
                keywords: ["crowded", "rush hours"]
              },
              {
                id: "body2_s3",
                vietnamese: "Hành khách đôi khi phải đợi rất lâu tại các trạm dừng xe buýt.",
                english: "Passengers sometimes have to wait a long time at bus stops.",
                hint: "Passengers sometimes...",
                keywords: ["wait a long time", "bus stops"]
              },
              {
                id: "body2_s4",
                vietnamese: "Điều này làm cho việc đi lại bớt thoải mái hơn đối với một số người dân.",
                english: "This makes traveling less comfortable for some citizens.",
                hint: "This makes traveling...",
                keywords: ["less comfortable", "citizens"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Tóm tắt và đưa ra thông điệp cuối.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, bất chấp một số bất lợi, giao thông công cộng đóng một vai trò thiết yếu.",
                english: "In conclusion, despite some disadvantages, public transport plays an essential role.",
                hint: "In conclusion, despite...",
                keywords: ["disadvantages", "essential role"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Chính phủ nên đầu tư nhiều tiền hơn để làm cho nó tốt hơn và sạch hơn.",
                english: "Governments should invest more money to make it better and cleaner.",
                hint: "Governments should...",
                keywords: ["invest more money", "better and cleaner"]
              }
            ]
          }
        }
      };
    } else {
      return {
        title: "A Balanced Analysis of Mass Transit Systems (VSTEP B2)",
        vocabList: [
          { label: "urban mobility", labelVi: "di chuyển đô thị" },
          { label: "mitigate congestion", labelVi: "giảm ùn tắc" },
          { label: "carbon footprint", labelVi: "dấu chân carbon" },
          { label: "substantial investment", labelVi: "đầu tư đáng kể" },
          { label: "eco-friendly cities", labelVi: "thành phố thân thiện với môi trường" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Giới thiệu chủ đề bài viết và nêu định hướng chung.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Trong những năm gần đây, việc mở rộng mạng lưới giao thông công cộng đã khơi dậy những tranh luận gay gắt.",
                english: "In recent years, the expansion of public transit networks has sparked intense debate.",
                hint: "In recent years, the expansion...",
                keywords: ["expansion", "sparked intense debate"]
              },
              {
                id: "intro_s2",
                vietnamese: "Mặc dù một số người cho rằng nó đòi hỏi nhiều tài chính, tôi quả quyết rằng những lợi ích của nó vượt trội hơn hẳn so với những hạn chế.",
                english: "While some argue it is financially demanding, I contend that its advantages far outweigh the drawbacks.",
                hint: "While some argue...",
                keywords: ["financially demanding", "outweigh"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Phân tích lợi ích chiến lược của giao thông công cộng.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Trước hết, phát triển giao thông công cộng đóng vai trò không thể thiếu trong việc giảm thiểu ùn tắc giao thông.",
                english: "First of all, developing mass transit plays an indispensable role in mitigating traffic congestion.",
                hint: "First of all, developing...",
                keywords: ["indispensable role", "mitigating"]
              },
              {
                id: "body1_s2",
                vietnamese: "Bằng cách cung cấp mạng lưới tàu điện ngầm hiệu quả, các thành phố có thể giảm lượng phương tiện cá nhân trên đường.",
                english: "By providing efficient subway networks, cities can reduce the volume of private vehicles on the road.",
                hint: "By providing efficient...",
                keywords: ["subway networks", "private vehicles"]
              },
              {
                id: "body1_s3",
                vietnamese: "Ngoài ra, sự chuyển đổi này giảm thiểu đáng kể dấu chân carbon của các khu vực đô thị.",
                english: "Additionally, this transition significantly minimizes the carbon footprint of urban areas.",
                hint: "Additionally, this transition...",
                keywords: ["significantly minimizes", "carbon footprint"]
              },
              {
                id: "body1_s4",
                vietnamese: "Do đó, giao thông công cộng đóng vai trò như một nền móng để xây dựng các thành phố thân thiện với môi trường.",
                english: "Therefore, public transit serves as a cornerstone for building eco-friendly cities.",
                hint: "Therefore, public transit...",
                keywords: ["serves as a cornerstone", "eco-friendly"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Phân tích các khó khăn và hạn chế thực tế.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Về khía cạnh tiêu cực, việc triển khai các hệ thống này đòi hỏi nguồn vốn đầu tư khổng lồ.",
                english: "On the negative side, the implementation of these systems requires massive capital investments.",
                hint: "On the negative side, the...",
                keywords: ["implementation", "massive capital investments"]
              },
              {
                id: "body2_s2",
                vietnamese: "Chính phủ thường phân bổ ngân sách lớn mà đáng lẽ có thể tài trợ cho y tế.",
                english: "Governments often allocate substantial budgets that could otherwise fund healthcare.",
                hint: "Governments often allocate...",
                keywords: ["substantial budgets", "otherwise fund"]
              },
              {
                id: "body2_s3",
                vietnamese: "Hơn nữa, đi lại trong giờ cao điểm có thể rất căng thẳng do tình trạng quá tải.",
                english: "Furthermore, commuting during peak hours can be highly stressful due to overcrowding.",
                hint: "Furthermore, commuting...",
                keywords: ["highly stressful", "overcrowding"]
              },
              {
                id: "body2_s4",
                vietnamese: "Những vấn đề vận hành này thỉnh thoảng có thể làm nản lòng người dân khi sử dụng phương tiện công cộng.",
                english: "These operational issues can occasionally discourage citizens from using transit.",
                hint: "These operational issues...",
                keywords: ["operational issues", "discourage citizens"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Tóm tắt định hướng phát triển bền vững.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, bất chấp những yêu cầu tài chính đáng kể, lợi ích môi trường lâu dài là rất rõ ràng.",
                english: "To sum up, despite the significant financial requirements, the long-term environmental benefits are clear.",
                hint: "To sum up, despite...",
                keywords: ["financial requirements", "environmental benefits"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Rất khuyến nghị các cơ quan chức năng hiện đại hóa cơ sở hạ tầng giao thông vì một tương lai bền vững.",
                english: "It is highly recommended that authorities modernize transit infrastructure for a sustainable future.",
                hint: "It is highly recommended...",
                keywords: ["modernize transit", "sustainable future"]
              }
            ]
          }
        }
      };
    }
  }

  // 2. COUNTRYSIDE TOPIC FALLBACK
  if (pLower.includes("countryside") || pLower.includes("nông thôn") || pLower.includes("rural") || pLower.includes("quê")) {
    if (level === "B1") {
      return {
        title: "Living in Rural Areas (VSTEP B1)",
        vocabList: [
          { label: "rural areas", labelVi: "vùng nông thôn" },
          { label: "peaceful atmosphere", labelVi: "bầu không khí yên bình" },
          { label: "cost of living", labelVi: "chi phí sinh hoạt" },
          { label: "fresh food", labelVi: "thực phẩm tươi sống" },
          { label: "healthcare service", labelVi: "dịch vụ y tế" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Giới thiệu chủ đề sống ở nông thôn.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Ngày nay, nhiều người thích sống ở nông thôn hơn là các thành phố lớn.",
                english: "Nowadays, many people prefer living in the countryside rather than big cities.",
                hint: "Nowadays, many people...",
                keywords: ["prefer living", "countryside"]
              },
              {
                id: "intro_s2",
                vietnamese: "Theo ý kiến của tôi, cuộc sống thôn quê mang lại cả điểm tốt lẫn điểm xấu.",
                english: "In my opinion, rural life brings both good and bad points.",
                hint: "In my opinion, rural...",
                keywords: ["rural life", "good and bad"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Các thuận lợi của việc sống ở nông thôn.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Trước hết, nông thôn mang lại bầu không khí yên bình và trong lành.",
                english: "First of all, the countryside offers a peaceful and clean environment.",
                hint: "First of all, the...",
                keywords: ["peaceful", "clean environment"]
              },
              {
                id: "body1_s2",
                vietnamese: "Ở đây có ít nhà máy và xe cộ nên không khí ít bị ô nhiễm hơn.",
                english: "There are fewer factories and cars here, so the air is less polluted.",
                hint: "There are fewer...",
                keywords: ["factories", "less polluted"]
              },
              {
                id: "body1_s3",
                vietnamese: "Ngoài ra, chi phí sinh hoạt ở nông thôn rẻ hơn nhiều.",
                english: "In addition, the cost of living in rural areas is much cheaper.",
                hint: "In addition, the cost...",
                keywords: ["cost of living", "much cheaper"]
              },
              {
                id: "body1_s4",
                vietnamese: "Người dân có thể dễ dàng mua được rau xanh tươi ngon và nhà cửa giá hợp lý.",
                english: "People can easily buy fresh food and affordable housing.",
                hint: "People can easily...",
                keywords: ["fresh food", "affordable housing"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Các hạn chế của việc sống ở nông thôn.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Tuy nhiên, cũng có một số bất tiện khi sống ở nông thôn.",
                english: "However, there are also some disadvantages to living in rural areas.",
                hint: "However, there are also...",
                keywords: ["disadvantages", "living"]
              },
              {
                id: "body2_s2",
                vietnamese: "Ví dụ, có rất ít trường học tốt và bệnh viện hiện đại ở những vùng này.",
                english: "For example, there are very few good schools and modern hospitals in these regions.",
                hint: "For example, there are...",
                keywords: ["good schools", "modern hospitals"]
              },
              {
                id: "body2_s3",
                vietnamese: "Hơn nữa, tìm kiếm một công việc lương cao ở quê là vô cùng khó khăn.",
                english: "Furthermore, finding a high-paying job in the countryside is extremely difficult.",
                hint: "Furthermore, finding a...",
                keywords: ["high-paying job", "difficult"]
              },
              {
                id: "body2_s4",
                vietnamese: "Nhiều người trẻ phải rời quê hương để lên thành phố lập nghiệp.",
                english: "Many young people have to leave their hometowns to work in big cities.",
                hint: "Many young people...",
                keywords: ["leave hometowns", "work in cities"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Tóm tắt và đưa ra đánh giá chung.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, mặc dù cuộc sống nông thôn có một số hạn chế về dịch vụ, lợi ích của nó vẫn rất lớn.",
                english: "To sum up, although rural life has some limits in services, its benefits are still great.",
                hint: "To sum up, although...",
                keywords: ["limits in services", "benefits"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Lựa chọn nơi ở tùy thuộc vào sở thích và mục tiêu cuộc sống của mỗi người.",
                english: "Choosing where to live depends on each person's preferences and life goals.",
                hint: "Choosing where to live...",
                keywords: ["depends on", "life goals"]
              }
            ]
          }
        }
      };
    } else {
      return {
        title: "The Dynamic Contrast of Rural and Urban Living (VSTEP B2)",
        vocabList: [
          { label: "rural migration", labelVi: "di cư nông thôn" },
          { label: "tranquil environment", labelVi: "môi trường yên tĩnh" },
          { label: "infrastructure deficiency", labelVi: "thiếu hụt cơ sở hạ tầng" },
          { label: "career prospects", labelVi: "triển vọng nghề nghiệp" },
          { label: "medical facilities", labelVi: "cơ sở y tế" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Giới thiệu bối cảnh đô thị hóa và di cư ngược về nông thôn.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Sự phân chia giữa cuộc sống nông thôn và thành thị luôn là một đề tài tranh luận sôi nổi trong thời đại ngày nay.",
                english: "The divide between rural and urban living remains a prominent topic of discussion in contemporary times.",
                hint: "The divide between...",
                keywords: ["urban living", "prominent topic"]
              },
              {
                id: "intro_s2",
                vietnamese: "Mặc dù lối sống nông thôn mang lại sự yên bình không thể bàn cãi, nó cũng tồn tại những hạn chế đáng chú ý về cơ hội phát triển.",
                english: "While rural lifestyle offers unquestionable tranquility, it also presents notable limitations regarding developmental opportunities.",
                hint: "While rural lifestyle...",
                keywords: ["unquestionable tranquility", "developmental opportunities"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Các giá trị cốt lõi của không gian sống nông thôn.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Về mặt tích cực, sống ở nông thôn đem lại một môi trường yên tĩnh có lợi cho sức khỏe tinh thần.",
                english: "On the positive side, residing in the countryside provides a tranquil environment conducive to mental health.",
                hint: "On the positive side, residing...",
                keywords: ["tranquil environment", "conducive to"]
              },
              {
                id: "body1_s2",
                vietnamese: "Với mật độ dân số thấp và ít hoạt động công nghiệp, cư dân được tận hưởng không khí trong lành.",
                english: "With a low population density and minimal industrial activities, residents enjoy pristine air quality.",
                hint: "With a low population...",
                keywords: ["population density", "pristine air"]
              },
              {
                id: "body1_s3",
                vietnamese: "Hơn thế nữa, gánh nặng tài chính ở nông thôn nhẹ nhàng hơn đáng kể nhờ chi phí sinh hoạt thấp.",
                english: "Furthermore, the financial burden in rural areas is significantly lower due to the cheaper cost of living.",
                hint: "Furthermore, the financial...",
                keywords: ["financial burden", "significantly lower"]
              },
              {
                id: "body1_s4",
                vietnamese: "Điều này cho phép các gia đình duy trì cuộc sống thảnh thơi mà không bị áp lực nợ nần đè nặng.",
                english: "This allows families to maintain a comfortable life without being weighed down by heavy debt.",
                hint: "This allows families...",
                keywords: ["comfortable life", "weighed down"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Các rào cản về cơ sở hạ tầng và dịch vụ.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Ngược lại, sự thiếu hụt cơ sở hạ tầng là rào cản lớn nhất đối với cư dân nông thôn.",
                english: "Conversely, the deficiency in infrastructure is the most critical hurdle for rural inhabitants.",
                hint: "Conversely, the deficiency...",
                keywords: ["deficiency in infrastructure", "critical hurdle"]
              },
              {
                id: "body2_s2",
                vietnamese: "Tiếp cận với cơ sở y tế chất lượng cao và các học viện uy tín thường đòi hỏi phải di chuyển xa.",
                english: "Access to high-quality medical facilities and prestigious academic institutions often requires long-distance travel.",
                hint: "Access to high-quality...",
                keywords: ["medical facilities", "academic institutions"]
              },
              {
                id: "body2_s3",
                vietnamese: "Thêm vào đó, triển vọng nghề nghiệp ở nông thôn vô cùng hạn chế do thiếu hụt doanh nghiệp lớn.",
                english: "In addition, career prospects in rural sectors are highly restricted due to the absence of large corporations.",
                hint: "In addition, career...",
                keywords: ["career prospects", "restricted"]
              },
              {
                id: "body2_s4",
                vietnamese: "Sự mất cân bằng này buộc một lượng lớn lao động trẻ phải di cư ra thành phố.",
                english: "This imbalance forces a substantial number of young professionals to migrate to metropolitan areas.",
                hint: "This imbalance forces...",
                keywords: ["substantial number", "migrate"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Nhận định định hướng thu hẹp khoảng cách nông thôn - thành thị.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, cả cuộc sống nông thôn và thành thị đều có những ưu điểm và khuyết điểm riêng biệt.",
                english: "In conclusion, both rural and urban living possess distinct merits and demerits.",
                hint: "In conclusion, both...",
                keywords: ["possess", "merits and demerits"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Chính phủ nên đầu tư phân bổ nguồn lực đồng đều để nâng cao mức sống ở nông thôn.",
                english: "Governments should invest in distributing resources evenly to elevate the standard of living in rural areas.",
                hint: "Governments should invest...",
                keywords: ["distributing resources", "elevate standard"]
              }
            ]
          }
        }
      };
    }
  }

  // 3. ADVERTISING / PRODUCTS TO CHILDREN TOPIC FALLBACK
  if (pLower.includes("advertis") || pLower.includes("quảng cáo") || pLower.includes("marketing") || pLower.includes("children")) {
    if (level === "B1") {
      return {
        title: "Advertising Products to Children (VSTEP B1)",
        vocabList: [
          { label: "advertising", labelVi: "quảng cáo" },
          { label: "children", labelVi: "trẻ em" },
          { label: "junk food", labelVi: "đồ ăn nhanh, đồ ăn vặt" },
          { label: "buy products", labelVi: "mua sản phẩm" },
          { label: "parents", labelVi: "cha mẹ" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Giới thiệu chủ đề quảng cáo hướng đến trẻ em.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Quảng cáo sản phẩm nhắm vào trẻ em đang trở nên rất phổ biến hiện nay.",
                english: "Advertising products aimed at children is becoming very popular nowadays.",
                hint: "Advertising products aimed...",
                keywords: ["aimed at children", "popular"]
              },
              {
                id: "intro_s2",
                vietnamese: "Trong khi một số người đồng ý, tôi nghĩ rằng xu hướng này có nhiều tác hại đối với trẻ em.",
                english: "While some people agree, I think this trend has many negative effects on children.",
                hint: "While some people agree...",
                keywords: ["negative effects", "trend"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Tại sao các công ty thích quảng cáo cho trẻ em và mặt tốt nhỏ.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Một mặt, quảng cáo giúp trẻ em tìm hiểu về các món đồ chơi và sách mới.",
                english: "On the one hand, advertisements help children learn about new toys and books.",
                hint: "On the one hand, advertisements...",
                keywords: ["toys and books", "learn about"]
              },
              {
                id: "body1_s2",
                vietnamese: "Nhiều chương trình quảng cáo mang tính giáo dục và rất thú vị để xem.",
                english: "Many advertising programs are educational and very fun to watch.",
                hint: "Many advertising programs...",
                keywords: ["educational", "fun to watch"]
              },
              {
                id: "body1_s3",
                vietnamese: "Chúng kích thích trí tưởng tượng và sự sáng tạo của trẻ nhỏ.",
                english: "They stimulate the imagination and creativity of young children.",
                hint: "They stimulate...",
                keywords: ["stimulate", "imagination"]
              },
              {
                id: "body1_s4",
                vietnamese: "Điều này giúp trẻ có thêm nhiều ý tưởng vui chơi bổ ích.",
                english: "This helps kids have more useful playtime ideas.",
                hint: "This helps kids...",
                keywords: ["playtime", "useful ideas"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Các tác hại to lớn của quảng cáo trẻ em.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Mặt khác, quảng cáo mang lại nhiều tác hại đối với sức khỏe của trẻ.",
                english: "On the other hand, advertising brings many negative impacts on kids' health.",
                hint: "On the other hand, advertising...",
                keywords: ["negative impacts", "kids' health"]
              },
              {
                id: "body2_s2",
                vietnamese: "Ví dụ, các công ty thường quảng cáo thức ăn nhanh chứa nhiều đường và chất béo.",
                english: "For example, companies often advertise junk food containing too much sugar and fat.",
                hint: "For example, companies...",
                keywords: ["junk food", "sugar and fat"]
              },
              {
                id: "body2_s3",
                vietnamese: "Trẻ em sẽ đòi cha mẹ mua những món đồ ăn không lành mạnh này.",
                english: "Children will ask their parents to buy these unhealthy items.",
                hint: "Children will ask...",
                keywords: ["parents", "unhealthy items"]
              },
              {
                id: "body2_s4",
                vietnamese: "Điều này có thể dẫn đến bệnh béo phì và các vấn đề sức khỏe khác.",
                english: "This can lead to obesity and other health problems.",
                hint: "This can lead to...",
                keywords: ["obesity", "health problems"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Kết luận và khuyến nghị giải pháp.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, quảng cáo hướng tới trẻ em mang lại nhiều tác hại hơn là lợi ích.",
                english: "In conclusion, advertising directed at children causes more harm than benefits.",
                hint: "In conclusion, advertising...",
                keywords: ["directed at children", "causes more harm"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Cha mẹ và chính phủ nên kiểm soát chặt chẽ các quảng cáo này.",
                english: "Parents and governments should control these advertisements strictly.",
                hint: "Parents and governments...",
                keywords: ["control", "strictly"]
              }
            ]
          }
        }
      };
    } else {
      return {
        title: "The Ethical Dilemma of Advertising to Minor Audiences (VSTEP B2)",
        vocabList: [
          { label: "consumer behavior", labelVi: "hành vi tiêu dùng" },
          { label: "vulnerable mindset", labelVi: "tâm lý dễ bị tổn thương" },
          { label: "deceptive marketing", labelVi: "tiếp thị lừa dối" },
          { label: "commercial exploitation", labelVi: "khai thác thương mại" },
          { label: "strict regulation", labelVi: "quy định nghiêm ngặt" }
        ],
        sections: {
          intro: {
            title: "Introduction (Mở bài)",
            description: "Đặt vấn đề về đạo đức kinh doanh khi quảng cáo nhắm vào trẻ nhỏ.",
            sentences: [
              {
                id: "intro_s1",
                vietnamese: "Chiến dịch quảng cáo nhắm trực tiếp vào trẻ em đã trở thành một hiện tượng phổ biến trong xã hội tiêu dùng hiện đại.",
                english: "Advertising campaigns targeted directly at children have become a widespread phenomenon in modern consumerist societies.",
                hint: "Advertising campaigns targeted...",
                keywords: ["targeted directly", "widespread phenomenon"]
              },
              {
                id: "intro_s2",
                vietnamese: "Mặc dù phương pháp tiếp thị này có thể cung cấp thông tin về sản phẩm mới, nó lại dấy lên những lo ngại sâu sắc về mặt đạo đức và sức khỏe.",
                english: "While this marketing approach can provide information about new products, it raises profound ethical and health concerns.",
                hint: "While this marketing approach...",
                keywords: ["profound ethical concerns", "health concerns"]
              }
            ]
          },
          body1: {
            title: "Body Paragraph 1 (Thân bài 1)",
            description: "Mặt tích cực nhỏ và quan điểm của các doanh nghiệp.",
            sentences: [
              {
                id: "body1_s1",
                vietnamese: "Về mặt lý thuyết, một số quảng cáo cung cấp giá trị giáo dục hữu ích và thúc đẩy kỹ năng nhận thức.",
                english: "Theoretically, some advertisements provide beneficial educational values and stimulate cognitive skills.",
                hint: "Theoretically, some advertisements...",
                keywords: ["educational values", "cognitive skills"]
              },
              {
                id: "body1_s2",
                vietnamese: "Chúng giới thiệu những cuốn sách tương tác và đồ chơi thông minh giúp cải thiện trí tuệ của trẻ.",
                english: "They introduce interactive books and intelligent toys that can enhance children's intellect.",
                hint: "They introduce interactive...",
                keywords: ["interactive books", "enhance intellect"]
              },
              {
                id: "body1_s3",
                vietnamese: "Thêm vào đó, các phương tiện truyền thông đầy màu sắc này có thể truyền cảm hứng nghệ thuật cho khán giả nhỏ tuổi.",
                english: "In addition, these colorful media displays can inspire artistic appreciation in young audiences.",
                hint: "In addition, these colorful...",
                keywords: ["artistic appreciation", "young audiences"]
              },
              {
                id: "body1_s4",
                vietnamese: "Từ góc nhìn này, tiếp thị đóng vai trò như một nguồn tài liệu trực quan sinh động.",
                english: "From this perspective, marketing serves as a vibrant source of visual material.",
                hint: "From this perspective...",
                keywords: ["serves as a vibrant source", "visual material"]
              }
            ]
          },
          body2: {
            title: "Body Paragraph 2 (Thân bài 2)",
            description: "Các tác hại lớn về tâm lý và thể chất của trẻ.",
            sentences: [
              {
                id: "body2_s1",
                vietnamese: "Tuy nhiên, những hậu quả tiêu cực của hoạt động thương mại này là vô cùng nghiêm trọng.",
                english: "However, the negative repercussions of this commercial practice are exceptionally severe.",
                hint: "However, the negative...",
                keywords: ["negative repercussions", "exceptionally severe"]
              },
              {
                id: "body2_s2",
                vietnamese: "Trẻ nhỏ, với khả năng nhận thức chưa trưởng thành, thường không thể phân biệt giữa quảng cáo và thực tế.",
                english: "Young children, with their immature cognitive abilities, are often unable to distinguish between advertising and reality.",
                hint: "Young children, with...",
                keywords: ["immature cognitive abilities", "distinguish"]
              },
              {
                id: "body2_s3",
                vietnamese: "Điều này dẫn đến thói quen ăn uống không lành mạnh do quảng cáo liên tục về đồ ăn vặt và đồ ngọt chứa nhiều calo.",
                english: "This leads to unhealthy eating habits due to constant exposure to high-calorie junk food and sweets.",
                hint: "This leads to unhealthy...",
                keywords: ["constant exposure", "high-calorie junk food"]
              },
              {
                id: "body2_s4",
                vietnamese: "Do đó, việc tiếp thị không kiểm soát đã trực tiếp làm gia tăng tỷ lệ béo phì ở trẻ em trên toàn cầu.",
                english: "Consequently, uncontrolled marketing has directly contributed to the rising rates of childhood obesity globally.",
                hint: "Consequently, uncontrolled...",
                keywords: ["directly contributed", "childhood obesity"]
              }
            ]
          },
          conclusion: {
            title: "Conclusion (Kết bài)",
            description: "Lời kêu gọi hành động đối với các cơ quan quản lý.",
            sentences: [
              {
                id: "conclusion_s1",
                vietnamese: "Tóm lại, những rủi ro đi kèm với việc quảng cáo cho trẻ em rõ ràng vượt trội so với những lợi thế thương mại ngắn hạn.",
                english: "To summarize, the risks associated with advertising to children clearly overshadow the short-term commercial advantages.",
                hint: "To summarize, the risks...",
                keywords: ["associated with", "overshadow"]
              },
              {
                id: "conclusion_s2",
                vietnamese: "Cần phải áp đặt các lệnh cấm nghiêm ngặt đối với quảng cáo thực phẩm có hại để bảo vệ thế hệ tương lai.",
                english: "It is imperative that strict bans are imposed on harmful food advertisements to safeguard future generations.",
                hint: "It is imperative that...",
                keywords: ["strict bans", "safeguard future"]
              }
            ]
          }
        }
      };
    }
  }

  // 4. GENERAL / DYNAMIC DEFAULT FALLBACK
  const isB1 = level === "B1";
  return {
    title: `The Impacts of ${promptClean.charAt(0).toUpperCase() + promptClean.slice(1)} (VSTEP ${level})`,
    vocabList: [
      { label: "modern life", labelVi: "cuộc sống hiện đại" },
      { label: "positive side", labelVi: "khía cạnh tích cực" },
      { label: "challenging problem", labelVi: "vấn đề đầy thách thức" },
      { label: "financial pressure", labelVi: "áp lực tài chính" },
      { label: "sustainable future", labelVi: "tương lai bền vững" }
    ],
    sections: {
      intro: {
        title: "Introduction (Mở bài)",
        description: "Giới thiệu chủ đề bài viết và nêu định hướng chung.",
        sentences: [
          {
            id: "intro_s1",
            vietnamese: `Ngày nay, chủ đề về ${promptClean} đã trở nên rất phổ biến trong xã hội của chúng ta.`,
            english: isB1 
              ? `Nowadays, the topic of ${promptClean} has become very popular in our society.`
              : `In the contemporary era, the phenomenon of ${promptClean} has emerged as a subject of significant public interest.`,
            hint: isB1 ? "Nowadays, the topic of..." : "In the contemporary era, the...",
            keywords: isB1 ? ["topic", "popular"] : ["phenomenon", "public interest"]
          },
          {
            id: "intro_s2",
            vietnamese: "Tôi tin rằng sự phát triển này mang lại cả những tác động tích cực lẫn tiêu cực.",
            english: isB1
              ? "I believe that this development brings both positive and negative consequences."
              : "I contend that this development brings both positive and negative consequences that deserve deep consideration.",
            hint: isB1 ? "I believe that this..." : "I contend that this...",
            keywords: isB1 ? ["development", "consequences"] : ["contend", "deep consideration"]
          }
        ]
      },
      body1: {
        title: "Body Paragraph 1 (Thân bài 1)",
        description: "Phân tích các lợi ích nổi bật của xu hướng này.",
        sentences: [
          {
            id: "body1_s1",
            vietnamese: "Về mặt tích cực, xu hướng này giúp mọi người cải thiện cuộc sống theo nhiều cách.",
            english: isB1
              ? "On the positive side, this trend helps people to improve their lives in many ways."
              : "On the positive side, this trend plays an indispensable role in improving modern standard of living.",
            hint: isB1 ? "On the positive side, this..." : "On the positive side, this trend...",
            keywords: isB1 ? ["positive side", "improve lives"] : ["indispensable role", "standard of living"]
          },
          {
            id: "body1_s2",
            vietnamese: "Nó cho phép các cá nhân làm việc hiệu quả hơn và tiết kiệm thời gian quý báu.",
            english: isB1
              ? "It allows individuals to work more effectively and save valuable time."
              : "It empowers individuals to streamline their daily tasks and execute processes with great efficiency.",
            hint: isB1 ? "It allows individuals to..." : "It empowers individuals to...",
            keywords: isB1 ? ["effectively", "save time"] : ["empowers", "execute processes"]
          },
          {
            id: "body1_s3",
            vietnamese: "Hơn nữa, các giải pháp hiện đại giúp việc học tập và trao đổi thông tin dễ dàng hơn trước.",
            english: isB1
              ? "Moreover, modern solutions make learning and communication easier than before."
              : "Furthermore, modern solutions foster innovation and make information sharing highly accessible.",
            hint: isB1 ? "Moreover, modern solutions..." : "Furthermore, modern solutions...",
            keywords: isB1 ? ["modern solutions", "learning"] : ["foster innovation", "highly accessible"]
          },
          {
            id: "body1_s4",
            vietnamese: "Đây là lý do tại sao rất nhiều người dân ủng hộ sự thay đổi hiện đại này.",
            english: isB1
              ? "This is why so many citizens support this modern change."
              : "Consequently, a substantial percentage of the population strongly supports this change.",
            hint: isB1 ? "This is why so..." : "Consequently, a substantial...",
            keywords: isB1 ? ["citizens", "modern change"] : ["substantial", "strongly supports"]
          }
        ]
      },
      body2: {
        title: "Body Paragraph 2 (Thân bài 2)",
        description: "Phân tích các khó khăn và rủi ro đi kèm.",
        sentences: [
          {
            id: "body2_s1",
            vietnamese: "Ngược lại, chúng ta cũng phải đối mặt với một số vấn đề đầy thách thức.",
            english: isB1
              ? "On the negative side, we also face some challenging problems."
              : "Conversely, the widespread adoption of this trend presents several major challenges.",
            hint: isB1 ? "On the negative side, we..." : "Conversely, the widespread...",
            keywords: isB1 ? ["negative side", "challenging problems"] : ["conversely", "major challenges"]
          },
          {
            id: "body2_s2",
            vietnamese: "Một vấn đề chính là chi phí triển khai và bảo trì có thể rất cao.",
            english: isB1
              ? "One main issue is that the cost of implementation can be very high."
              : "One of the primary concerns is the exceptionally high cost of setup and maintenance.",
            hint: isB1 ? "One main issue is..." : "One of the primary...",
            keywords: isB1 ? ["cost of implementation", "high"] : ["primary concerns", "exceptionally high"]
          },
          {
            id: "body2_s3",
            vietnamese: "Ngoài ra, sự phụ thuộc quá mức vào nó có thể làm giảm khả năng tư duy độc lập.",
            english: isB1
              ? "Additionally, over-reliance on this system can reduce critical thinking skills."
              : "Additionally, excessive dependence on this system can lead to a decline in critical thinking abilities.",
            hint: isB1 ? "Additionally, over-reliance..." : "Additionally, excessive...",
            keywords: isB1 ? ["over-reliance", "critical thinking"] : ["excessive dependence", "decline"]
          },
          {
            id: "body2_s4",
            vietnamese: "Do đó, người dùng nên cẩn thận để tránh những tác động không mong muốn.",
            english: isB1
              ? "Therefore, users should be careful to avoid these unwanted impacts."
              : "Therefore, individuals must remain vigilant to mitigate these potential negative consequences.",
            hint: isB1 ? "Therefore, users should..." : "Therefore, individuals must...",
            keywords: isB1 ? ["careful", "unwanted impacts"] : ["remain vigilant", "mitigate consequences"]
          }
        ]
      },
      conclusion: {
        title: "Conclusion (Kết bài)",
        description: "Tóm tắt đánh giá tổng quan.",
        sentences: [
          {
            id: "conclusion_s1",
            vietnamese: "Tóm lại, mặc dù có những khuyết điểm rõ ràng, những giá trị đem lại là không thể bàn cãi.",
            english: isB1
              ? "In conclusion, despite the clear disadvantages, the benefits are very important."
              : "To sum up, although there are noticeable drawbacks, the overall positive contributions are undeniable.",
            hint: isB1 ? "In conclusion, despite..." : "To sum up, although...",
            keywords: isB1 ? ["clear disadvantages", "benefits"] : ["noticeable drawbacks", "undeniable"]
          },
          {
            id: "conclusion_s2",
            vietnamese: "Chúng ta cần phối hợp để phát triển xu hướng này vì lợi ích lâu dài của tương lai.",
            english: isB1
              ? "We need to work together to develop this trend for a better future."
              : "It is highly recommended that we collaborate to utilize this trend for a sustainable future.",
            hint: isB1 ? "We need to work..." : "It is highly recommended that...",
            keywords: isB1 ? ["work together", "better future"] : ["collaborate", "sustainable future"]
          }
        ]
      }
    }
  };
}

// REST Endpoint to generate a complete natural cohesive essay based on user's prompt, essay type, and level
app.post("/api/ai/generate-essay-practice", async (req, res) => {
  const { prompt, essayType, level = "B1" } = req.body;
  try {
    if (!prompt || !prompt.trim()) {
      res.status(400).json({ error: "Đề bài không được để trống." });
      return;
    }

    const ai = getGeminiClient();

    const generatePrompt = `
You are an expert VSTEP Writing Coach.
The student wants to write an essay on the prompt/question: "${prompt}" using the structure: "${essayType}".
Your job is to generate a fully cohesive, grammatically pristine, natural, and level-targeted model essay of 220-250 words, and break it down sentence-by-sentence so the student can practice translating and writing it.

CRITICAL INSTRUCTIONS FOR TARGET LEVEL:
- Level target: VSTEP ${level}.
- If level is B1: The English vocabulary must be simple yet clear, grammatically straightforward, using common words and structures (e.g., "it is good because...", "this helps people to..."). The sentence structures should be easy to understand and memorize. Avoid over-complicated vocabulary.
- If level is B2: The English should use higher-level vocabulary, sophisticated transitions, diverse sentence structures, and academic collocations (e.g., "this plays an indispensable role in...", "exacerbate the problem", "mitigate the negative impacts").
- CRITICAL: Avoid ANY templated formulas or substitutions that lead to awkward or grammatically incorrect Vietnamese or English sentences. Every single sentence must be crafted from scratch so that it flows perfectly as a cohesive paragraph.
- The Vietnamese translations must be extremely natural, accurate, and flow perfectly. No literal or robotic word-for-word translations.

ESSAY STRUCTURE TO FOLLOW (essayType: "${essayType}"):
The essay must consist of exactly 4 paragraphs:
1. Introduction (Mở bài): 2 to 3 sentences.
2. Body Paragraph 1 (Thân bài 1): 4 to 5 sentences.
3. Body Paragraph 2 (Thân bài 2): 4 to 5 sentences.
4. Conclusion (Kết bài): 2 to 3 sentences.

For each paragraph, break it down into sequential sentences. For each sentence, provide:
1. A unique 'id' (e.g. 'intro_s1', 'intro_s2', 'body1_s1', 'body1_s2', etc.)
2. 'vietnamese': An elegant, natural, contextual Vietnamese translation.
3. 'english': The model English sentence matching the target level (${level}).
4. 'hint': A scaffolding hint to guide writing, showing some starting phrase or structure (e.g., "While some people believe that..., I argue that...").
5. 'keywords': A list of 2-3 key words or short phrases appearing in this sentence that are helpful for the student to use.

Also, generate a general 'vocabList' of 6-8 key vocabulary words/collocations relevant to this essay topic, with English 'label' and Vietnamese 'labelVi' translation.

Return the result as a single JSON object with the following schema:
{
  "title": "A short English title for the essay topic",
  "vocabList": [
    { "label": "word/phrase", "labelVi": "Vietnamese translation" }
  ],
  "sections": {
    "intro": {
      "title": "Introduction (Mở bài)",
      "description": "Giới thiệu chủ đề bài viết và nêu định hướng chung.",
      "sentences": [
        { "id": "intro_s1", "vietnamese": "...", "english": "...", "hint": "...", "keywords": ["..."] }
      ]
    },
    "body1": {
      "title": "Body Paragraph 1 (Thân bài 1)",
      "description": "Phát triển các luận điểm chính.",
      "sentences": [ ... ]
    },
    "body2": {
      "title": "Body Paragraph 2 (Thân bài 2)",
      "description": "Phát triển các luận điểm hỗ trợ hoặc phản biện.",
      "sentences": [ ... ]
    },
    "conclusion": {
      "title": "Conclusion (Kết bài)",
      "description": "Tóm tắt và đưa ra thông điệp cuối.",
      "sentences": [ ... ]
    }
  }
}
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: generatePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            vocabList: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  labelVi: { type: Type.STRING }
                },
                required: ["label", "labelVi"]
              }
            },
            sections: {
              type: Type.OBJECT,
              properties: {
                intro: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          english: { type: Type.STRING },
                          hint: { type: Type.STRING },
                          keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "vietnamese", "english", "hint", "keywords"]
                      }
                    }
                  },
                  required: ["title", "description", "sentences"]
                },
                body1: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          english: { type: Type.STRING },
                          hint: { type: Type.STRING },
                          keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "vietnamese", "english", "hint", "keywords"]
                      }
                    }
                  },
                  required: ["title", "description", "sentences"]
                },
                body2: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          english: { type: Type.STRING },
                          hint: { type: Type.STRING },
                          keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "vietnamese", "english", "hint", "keywords"]
                      }
                    }
                  },
                  required: ["title", "description", "sentences"]
                },
                conclusion: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          english: { type: Type.STRING },
                          hint: { type: Type.STRING },
                          keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "vietnamese", "english", "hint", "keywords"]
                      }
                    }
                  },
                  required: ["title", "description", "sentences"]
                }
              },
              required: ["intro", "body1", "body2", "conclusion"]
            }
          },
          required: ["title", "vocabList", "sections"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không thể nhận được bài luận mẫu từ AI.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Generate Essay Practice Error:", error);
    try {
      console.log("[Fallback] Utilizing local fallback essay generator due to API error/quota limit...");
      const fallbackEssay = getLocalFallbackEssay(prompt, essayType, level);
      res.json(fallbackEssay);
    } catch (fallbackError) {
      console.error("Local Fallback failed:", fallbackError);
      res.status(500).json({
        error: error?.message || "Đã xảy ra lỗi khi tạo bài luận mẫu bằng AI."
      });
    }
  }
});

// REST Endpoint to generate a structured segmented essay (fixed vs user/AI filled segments)
app.post("/api/ai/generate-structured-essay", async (req, res) => {
  const { essayType, userInput } = req.body;
  try {
    if (!essayType || !userInput) {
      res.status(400).json({ error: "Thiếu thông tin dạng bài hoặc nội dung người dùng nhập." });
      return;
    }

    const ai = getGeminiClient();

    const generatePrompt = `
You are an expert VSTEP ESL Writing Coach.
The student wants to write an essay of type: "${essayType}".
They have supplied the following user-input values for the template variables:
${JSON.stringify(userInput, null, 2)}

Your task is to generate a fully completed, highly logical, natural, yet simple essay of 220-250 words based exactly on the requested template structure below.
CRITICAL TARGET GROUP: A2 to B1 level students.
- Keep all vocabulary and grammar simple, clear, and easy to memorize.
- Do not use over-complicated words. Use straightforward logical explanations and examples.
- The Vietnamese translations must be very natural, accurate, and clean.

STRUCTURE TEMPLATE TO ENFORCE (for "${essayType}"):

${essayType === "advantages_disadvantages" ? `
[Advantages-Disadvantages Template]
- Introduction (Mở bài):
  1. "Over the past few years, [topic] has become a broad issue to the general public." (Fixed + Topic variable)
  2. "Some people believe that it has many advantages." (Fixed)
  3. "However, others think that it could also have some negative effects." (Fixed)
  4. "In the following essay, both benefits as well as drawbacks of this issue will be discussed in more detail." (Fixed)
- Body Paragraph 1 (Thân bài 1 - Nêu ưu điểm):
  1. "On the one hand, people should recognize that there are many advantages of [topic]." (Fixed + Topic variable)
  2. "First of all, [advantage1]." (Fixed "First of all, " + AI completed advantage1)
  3. "This means that [explanation1]." (Fixed "This means that " + AI completed explanation1)
  4. "In addition, [advantage2]." (Fixed "In addition, " + AI completed advantage2)
  5. "This is because of the fact that [explanation2]." (Fixed "This is because of the fact that " + AI completed explanation2)
  6. "For example, [example1]." (Fixed "For example, " + AI completed example1)
- Body Paragraph 2 (Thân bài 2 - Nêu nhược điểm):
  1. "On the other hand, there are some disadvantages of [topic]." (Fixed + Topic variable)
  2. "The first one is that [disadvantage1]." (Fixed "The first one is that " + AI completed disadvantage1)
  3. "This means that [explanation3]." (Fixed "This means that " + AI completed explanation3)
  4. "Moreover, [disadvantage2]." (Fixed "Moreover, " + AI completed disadvantage2)
  5. "This can be shown by the example that [example2]." (Fixed "This can be shown by the example that " + AI completed example2)
- Conclusion (Kết bài):
  1. "In conclusion, there are two sides to everything, and this situation is not an exception." (Fixed)
  2. "The [topic] plays a crucial part in our life." (Fixed + Topic variable)
  3. "People should have further considerations on this issue." (Fixed)
` : ""}

${essayType === "agree_disagree" ? `
[Agree-Disagree Template]
- Introduction (Mở bài):
  1. "Some people believe that [promptView]." (Fixed + User input promptView)
  2. "However, others have different opinions." (Fixed)
  3. "In the following essay, both sides of the argument will be discussed in more detail." (Fixed)
- Body Paragraph 1 (Thân bài 1 - Nêu lý do cho quan điểm đề bài):
  1. "On the one hand, there are some reasons why people think that [promptView]." (Fixed + User input promptView)
  2. "To begin with, [reason1]." (Fixed "To begin with, " + AI completed reason1)
  3. "In addition, [reason2]." (Fixed "In addition, " + AI completed reason2)
  4. "For example, [example1]." (Fixed "For example, " + AI completed example1)
- Body Paragraph 2 (Thân bài 2 - Nêu lý do cho quan điểm ngược lại):
  1. "On the other hand, there are several arguments in support of the idea that [opposingView]." (Fixed + User input opposingView)
  2. "In fact, people have this opinion because [reason3]." (Fixed "In fact, people have this opinion because " + AI completed reason3)
  3. "This means that [explanation1]." (Fixed "This means that " + AI completed explanation1)
  4. "This can be shown by the example that [example2]." (Fixed "This can be shown by the example that " + AI completed example2)
- Conclusion (Kết bài):
  1. "In conclusion, there are two sides to everything, and this situation is not an exception." (Fixed)
  2. "In my opinion, I agree that [myView] because it brings more advantages to the society." (Fixed + User input myView)
` : ""}

${essayType === "causes_effects" ? `
[Causes-Effects Template]
- Introduction (Mở bài):
  1. "In recent years, [topic] has become a broad issue to the general public." (Fixed + Topic)
  2. "Although noticeable, the impact of this issue has not been realized by many residents." (Fixed)
  3. "The following essay will present some reasons and effects of this problem." (Fixed)
- Body Paragraph 1 (Thân bài 1 - Nêu nguyên nhân):
  1. "There are several reasons for [topic]." (Fixed + Topic)
  2. "In my opinion, one of the foremost reasons is [cause1]." (Fixed "In my opinion, one of the foremost reasons is " + AI completed cause1)
  3. "This means that more and more people [explanation1]." (Fixed "This means that more and more people " + AI completed explanation1)
  4. "For example, [example1]." (Fixed "For example, " + AI completed example1)
  5. "In addition, another factor is [cause2]." (Fixed "In addition, another factor is " + AI completed cause2)
  6. "An example of this is that [example2]." (Fixed "An example of this is that " + AI completed example2)
- Body Paragraph 2 (Thân bài 2 - Nêu hệ quả):
  1. "As a result, there are many serious effects of this issue." (Fixed)
  2. "To begin with, one of the most obvious problems caused by [topic] is [effect1]." (Fixed "To begin with, one of the most obvious problems caused by [topic] is " + AI completed effect1)
  3. "To be specific, [explanation2]." (Fixed "To be specific, " + AI completed explanation2)
  4. "Secondly, another worrying effect is [effect2]." (Fixed "Secondly, another worrying effect is " + AI completed effect2)
  5. "This means that [explanation3]." (Fixed "This means that " + AI completed explanation3)
  6. "For example, [example3]." (Fixed "For example, " + AI completed example3)
- Conclusion (Kết bài):
  1. "In conclusion, the above mentioned facts have outlined the reasons as well as the effects of this issue." (Fixed)
  2. "Its causes and effects should be taken into account." (Fixed)
  3. "People should have further considerations on this issue." (Fixed)
` : ""}

${essayType === "causes_solutions" ? `
[Causes-Solutions Template]
- Introduction (Mở bài):
  1. "In recent years, [topic] has become a broad issue to the general public." (Fixed + Topic)
  2. "Although noticeable, the impact of this issue has not been realized by many residents." (Fixed)
  3. "The following essay will discuss the causes for this problem and suggest some possible solutions to improve the situation." (Fixed)
- Body Paragraph 1 (Thân bài 1 - Nêu nguyên nhân):
  1. "There are several reasons for [topic]." (Fixed + Topic)
  2. "In my opinion, one of the foremost reasons is [cause1]." (Fixed "In my opinion, one of the foremost reasons is " + AI completed cause1)
  3. "This means that more and more people [explanation1]." (Fixed "This means that more and more people " + AI completed explanation1)
  4. "For example, [example1]." (Fixed "For example, " + AI completed example1)
  5. "In addition, another factor is [cause2]." (Fixed "In addition, another factor is " + AI completed cause2)
  6. "An example of this is that [example2]." (Fixed "An example of this is that " + AI completed example2)
- Body Paragraph 2 (Thân bài 2 - Nêu giải pháp):
  1. "However, there are some possible solutions to the main problems." (Fixed)
  2. "The first possible solution may be [solution1]." (Fixed "The first possible solution may be " + AI completed solution1)
  3. "This means that, [explanation2]." (Fixed "This means that, " + AI completed explanation2)
  4. "Another solution is that people could [solution2]." (Fixed "Another solution is that people could " + AI completed solution2)
  5. "This can be shown by the example that [example3]." (Fixed "This can be shown by the example that " + AI completed example3)
- Conclusion (Kết bài):
  1. "In conclusion, the above mentioned facts have outlined the reasons as well as the effects of this issue." (Fixed)
  2. "Its causes and effects should be taken into account." (Fixed)
  3. "People should have further considerations on this issue." (Fixed)
` : ""}

${essayType === "problems_solutions" ? `
[Problems-Solutions Template]
- Introduction (Mở bài):
  1. "In recent years, [topic] has become a broad issue to the general public." (Fixed + Topic)
  2. "Although noticeable, the impact of this issue has not been realized by many residents." (Fixed)
  3. "The following essay will discuss the problems and suggest some possible solutions to improve the situation." (Fixed)
- Body Paragraph 1 (Thân bài 1 - Nêu vấn đề):
  1. "As a result, there are many serious effects of this issue." (Fixed)
  2. "To begin with, one of the most obvious problems caused by [topic] is [problem1]." (Fixed "To begin with, one of the most obvious problems caused by [topic] is " + AI completed problem1)
  3. "To be specific, [explanation1]." (Fixed "To be specific, " + AI completed explanation1)
  4. "Secondly, another worrying effect is [problem2]." (Fixed "Secondly, another worrying effect is " + AI completed problem2)
  5. "This means that [explanation2]." (Fixed "This means that " + AI completed explanation2)
  6. "For example, [example1]." (Fixed "For example, " + AI completed example1)
- Body Paragraph 2 (Thân bài 2 - Nêu giải pháp):
  1. "However, there are some possible solutions to the main problems." (Fixed)
  2. "The first possible solution may be [solution1]." (Fixed "The first possible solution may be " + AI completed solution1)
  3. "This means that, [explanation3]." (Fixed "This means that, " + AI completed explanation3)
  4. "Another solution is that people could [solution2]." (Fixed "Another solution is that people could " + AI completed solution2)
  5. "This can be shown by the example that [example2]." (Fixed "This can be shown by the example that " + AI completed example2)
- Conclusion (Kết bài):
  1. "In conclusion, the above mentioned facts have outlined the reasons as well as the effects of this issue." (Fixed)
  2. "Its causes and effects should be taken into account." (Fixed)
  3. "People should have further considerations on this issue." (Fixed)
` : ""}


For every single sentence in the essay, you MUST split it into sequential segments to distinguish clearly between the fixed parts and the parts filled in by either the user input or the AI.
For example, for a sentence like "Over the past few years, learning online has become a broad issue to the general public.":
Segments must look exactly like this:
[
  { "text": "Over the past few years, ", "isFixed": true },
  { "text": "learning online", "isFixed": false },
  { "text": " has become a broad issue to the general public.", "isFixed": true }
]

Where "learning online" is what the user filled, so isFixed is false.

For sections of sentences that the AI fills (e.g. [advantage1], [explanation1], etc.), they should also be split as isFixed: false.
For example: "First of all, it allows students to study at home."
Segments:
[
  { "text": "First of all, ", "isFixed": true },
  { "text": "it allows students to study at home", "isFixed": false }
]

Ensure that the concatenation of the segments.text EXACTLY yields a correct, grammatically clean English sentence. Make sure there are no duplicate periods, correct spacing around punctuation, and correct capitalization.

You MUST return the output as a single JSON object with the following schema:
{
  "title": "A short English title for the essay topic",
  "essayType": "${essayType}",
  "sections": {
    "intro": {
      "title": "Mở bài (Introduction)",
      "sentences": [
        {
          "id": "intro_s1",
          "vietnamese": "Dịch nghĩa tiếng Việt mượt mà của toàn bộ câu.",
          "segments": [
            { "text": "...", "isFixed": true },
            { "text": "...", "isFixed": false }
          ]
        }
      ]
    },
    "body1": {
      "title": "Thân bài 1 (Thân bài 1)",
      "sentences": [ ... ]
    },
    "body2": {
      "title": "Thân bài 2 (Thân bài 2)",
      "sentences": [ ... ]
    },
    "conclusion": {
      "title": "Kết bài (Conclusion)",
      "sentences": [ ... ]
    }
  }
}
`;

    const response = await callGeminiWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: generatePrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            essayType: { type: Type.STRING },
            sections: {
              type: Type.OBJECT,
              properties: {
                intro: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          segments: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING },
                                isFixed: { type: Type.BOOLEAN }
                              },
                              required: ["text", "isFixed"]
                            }
                          }
                        },
                        required: ["id", "vietnamese", "segments"]
                      }
                    }
                  },
                  required: ["title", "sentences"]
                },
                body1: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          segments: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING },
                                isFixed: { type: Type.BOOLEAN }
                              },
                              required: ["text", "isFixed"]
                            }
                          }
                        },
                        required: ["id", "vietnamese", "segments"]
                      }
                    }
                  },
                  required: ["title", "sentences"]
                },
                body2: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          segments: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING },
                                isFixed: { type: Type.BOOLEAN }
                              },
                              required: ["text", "isFixed"]
                            }
                          }
                        },
                        required: ["id", "vietnamese", "segments"]
                      }
                    }
                  },
                  required: ["title", "sentences"]
                },
                conclusion: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    sentences: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          vietnamese: { type: Type.STRING },
                          segments: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                text: { type: Type.STRING },
                                isFixed: { type: Type.BOOLEAN }
                              },
                              required: ["text", "isFixed"]
                            }
                          }
                        },
                        required: ["id", "vietnamese", "segments"]
                      }
                    }
                  },
                  required: ["title", "sentences"]
                }
              },
              required: ["intro", "body1", "body2", "conclusion"]
            }
          },
          required: ["title", "essayType", "sections"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Không thể nhận được kết quả từ AI.");
    }

    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Structured Essay Generation Error:", error);
    try {
      console.log("[Fallback] Utilizing local fallback structured essay due to API error/unavailability...");
      const fallbackEssay = getLocalFallbackStructuredEssay(essayType, userInput);
      res.json(fallbackEssay);
    } catch (fallbackError) {
      console.error("Local Fallback Structured Essay failed:", fallbackError);
      res.status(500).json({
        error: error?.message || "Đã xảy ra lỗi khi tạo bài luận mẫu tự động bằng AI."
      });
    }
  }
});

// Helper to generate a robust local fallback structured essay when Gemini is down
function getLocalFallbackStructuredEssay(essayType: string, userInput: any) {
  const topic = userInput.topic || "online learning";
  const promptView = userInput.promptView || "traditional classrooms are better than online learning";
  const opposingView = userInput.opposingView || "online learning offers more benefits than traditional classrooms";
  const myView = userInput.myView || "online learning is more advantageous";

  const t = topic.toLowerCase().trim();
  const isCity = t.includes("city") || t.includes("town") || t.includes("urban") || t.includes("metropolitan");

  // Default values
  let adv1 = "it helps people expand their knowledge and develop useful practical skills";
  let adv1_vi = "nó giúp mọi người mở rộng kiến thức và phát triển các kỹ năng thực hành hữu ích";
  let exp1 = "individuals can cultivate their talents and achieve personal growth easily";
  let exp1_vi = "các cá nhân có thể trau dồi tài năng và đạt được sự phát triển cá nhân một cách dễ dàng";
  let adv2 = "it opens up more options for a happier and more comfortable lifestyle";
  let adv2_vi = "nó mở ra nhiều lựa chọn hơn cho một lối sống hạnh phúc và thoải mái hơn";
  let exp2 = "the positive outcomes contribute directly to the long-term prosperity of communities";
  let exp2_vi = "các kết quả tích cực đóng góp trực tiếp vào sự thịnh vượng lâu dài của cộng đồng";
  let ex1 = "many successful modern societies prioritize this development as a key pillar";
  let ex1_vi = "nhiều xã hội hiện đại thành công ưu tiên sự phát triển này như một trụ cột chính";
  let dis1 = "it might require a significant investment of time and financial resources";
  let dis1_vi = "nó có thể đòi hỏi sự đầu tư đáng kể về thời gian và nguồn lực tài chính";
  let exp3 = "poor individuals might struggle to access this resource and feel left behind";
  let exp3_vi = "những người nghèo khó có thể gặp khó khăn khi tiếp cận nguồn lực này và cảm thấy bị bỏ lại phía sau";
  let dis2 = "it can occasionally cause unexpected stress or psychological pressure";
  let dis2_vi = "đôi khi nó có thể gây ra những căng thẳng ngoài ý muốn hoặc áp lực tâm lý";
  let ex2 = "some studies show that over-focusing on this trend leads to temporary burnout";
  let ex2_vi = "một số nghiên cứu chỉ ra rằng việc quá tập trung vào xu hướng này dẫn đến sự kiệt quệ tạm thời";

  let c1 = "the rapid development of modern computer systems and high-speed internet networks";
  let c1_vi = "sự phát triển nhanh chóng của hệ thống máy tính hiện đại và mạng internet tốc độ cao";
  let c2 = "the growing demand for flexible working and studying schedules";
  let c2_vi = "nhu cầu ngày càng tăng đối với lịch làm việc và học tập linh hoạt";
  let ef1 = "the significant improvement in access to global educational resources";
  let ef1_vi = "sự cải thiện đáng kể trong việc tiếp cận các tài nguyên giáo dục toàn cầu";
  let ef2 = "the reduction of physical operational costs for universities and schools";
  let ef2_vi = "sự giảm thiểu chi phí vận hành vật lý cho các trường đại học và phổ thông";
  let s1 = "to invest more in training teachers for digital pedagogy and interactive designs";
  let s1_vi = "là đầu tư nhiều hơn vào việc đào tạo giáo viên về sư phạm số và thiết kế tương tác";
  let s2 = "establish strict weekly self-study goals and regular social networking events";
  let s2_vi = "thiết lập các mục tiêu tự học nghiêm ngặt hàng tuần và các sự kiện kết nối xã hội thường xuyên";
  let ex3 = "some top schools arrange weekly group chats to keep online students connected";
  let ex3_vi = "một số trường học hàng đầu sắp xếp các cuộc trò chuyện nhóm hàng tuần để giữ học sinh trực tuyến luôn kết nối";

  if (isCity) {
    adv1 = "it offers an abundance of career opportunities and high-paying jobs";
    adv1_vi = "nó mang lại lượng lớn cơ hội nghề nghiệp và công việc lương cao";
    exp1 = "thousands of companies are located in metropolitan areas";
    exp1_vi = "hàng ngàn công ty được đặt tại các khu đô thị lớn";
    adv2 = "it provides easy access to top-tier health care and advanced education";
    adv2_vi = "nó giúp tiếp cận dễ dàng với chăm sóc sức khỏe hàng đầu và giáo dục tiên tiến";
    exp2 = "the best international schools and hospitals are built in big cities";
    exp2_vi = "các trường quốc tế và bệnh viện tốt nhất được xây dựng ở các thành phố lớn";
    ex1 = "millions of graduates move to urban areas annually to seek better futures";
    ex1_vi = "hàng triệu sinh viên tốt nghiệp di chuyển đến các khu đô thị hàng năm để tìm kiếm tương lai tốt hơn";
    dis1 = "it usually results in extremely high costs of living and expensive housing";
    dis1_vi = "nó thường dẫn đến chi phí sinh hoạt cực kỳ cao và nhà ở đắt đỏ";
    exp3 = "working individuals spend a large portion of their salaries on rents";
    exp3_vi = "người đi làm phải chi một phần lớn tiền lương của họ cho các khoản tiền thuê nhà";
    dis2 = "it is associated with traffic jams and severe environmental pollution";
    dis2_vi = "nó gắn liền với ùn tắc giao thông và ô nhiễm môi trường";
    ex2 = "large populations suffer from daily commutes due to congested roads";
    ex2_vi = "lượng lớn dân số phải hứng chịu cảnh đi lại khó khăn hàng ngày do đường xá tắc nghẽn";

    c1 = "the concentration of major industries and educational facilities in urban centers";
    c1_vi = "sự tập trung của các ngành công nghiệp lớn và các cơ sở giáo dục tại trung tâm đô thị";
    c2 = "continuous government investments in city infrastructure and modern amenities";
    c2_vi = "sự đầu tư liên tục của chính phủ vào cơ sở hạ tầng đô thị và các tiện ích công cộng";
    ef1 = "immense pressure on the urban transportation systems and local housing markets";
    ef1_vi = "áp lực to lớn lên hệ thống giao thông đô thị và thị trường nhà ở địa phương";
    ef2 = "the rising levels of air pollution and industrial waste in urban zones";
    ef2_vi = "mức độ ô nhiễm không khí và chất thải công nghiệp ngày càng tăng ở các khu vực đô thị";
    s1 = "to expand public transport networks like subways and introduce green vehicles";
    s1_vi = "là mở rộng mạng lưới giao thông công cộng như tàu điện ngầm và đưa vào sử dụng xe điện";
    s2 = "decentralize job opportunities by building industrial parks in suburban zones";
    s2_vi = "phân tán các cơ hội việc làm bằng cách xây dựng các khu công nghiệp ở các vùng ngoại ô";
    ex3 = "successful urban models show satellite cities reduce crowd pressure effectively";
    ex3_vi = "các mô hình đô thị thành công cho thấy các thành phố vệ tinh giúp giảm bớt áp lực hiệu quả";
  }

  const isAgreeOnline = promptView.toLowerCase().includes("online") || promptView.toLowerCase().includes("traditional");
  let reason1 = isAgreeOnline ? "it allows students to practice social interactions with teachers in real-time" : "this view supports the development of stable traditional values";
  let reason1_vi = isAgreeOnline ? "nó cho phép học sinh thực hành tương tác trực tiếp với giáo viên" : "quan điểm này hỗ trợ sự phát triển của các giá trị truyền thống ổn định";
  let reason2 = isAgreeOnline ? "it creates a structured physical environment that encourages classroom focus" : "it offers a practical and time-tested approach to resolving everyday problems";
  let reason2_vi = isAgreeOnline ? "nó tạo ra một môi trường vật lý có cấu trúc khuyến khích sự tập trung" : "nó cung cấp một phương pháp thực tế để giải quyết các vấn đề hàng ngày";
  let reason3 = isAgreeOnline ? "virtual classes remove geographical limitations and allow convenient study from home" : "innovative ideas bring modern efficiency and highly creative alternatives";
  let reason3_vi = isAgreeOnline ? "các lớp học ảo loại bỏ các giới hạn địa lý và cho phép học tập tại nhà" : "các ý tưởng đổi mới mang lại hiệu quả hiện đại và giải pháp thay thế sáng tạo";

  if (essayType === "advantages_disadvantages") {
    return {
      title: `The Advantages and Disadvantages of ${topic} (VSTEP)`,
      essayType,
      sections: {
        intro: {
          title: "Mở bài (Introduction)",
          sentences: [
            { id: "i1", vietnamese: `Trong những năm qua, ${topic} đã trở thành một vấn đề sâu rộng đối với đông đảo công chúng.`, segments: [{ text: "Over the past few years, ", isFixed: true }, { text: topic, isFixed: false }, { text: " has become a broad issue to the general public.", isFixed: true }] },
            { id: "i2", vietnamese: "Một số người tin rằng nó có nhiều lợi ích.", segments: [{ text: "Some people believe that it has many advantages.", isFixed: true }] },
            { id: "i3", vietnamese: "Tuy nhiên, những người khác nghĩ rằng nó cũng có thể có một số tác động tiêu cực.", segments: [{ text: "However, others think that it could also have some negative effects.", isFixed: true }] },
            { id: "i4", vietnamese: "Trong bài viết dưới đây, cả lợi ích cũng như hạn chế của vấn đề này sẽ được thảo luận chi tiết hơn.", segments: [{ text: "In the following essay, both benefits as well as drawbacks of this issue will be discussed in more detail.", isFixed: true }] }
          ]
        },
        body1: {
          title: "Thân bài 1 (Advantages)",
          sentences: [
            { id: "b1_1", vietnamese: `Một mặt, mọi người nên thừa nhận rằng có rất nhiều lợi thế của ${topic}.`, segments: [{ text: "On the one hand, people should recognize that there are many advantages of ", isFixed: true }, { text: topic, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_2", vietnamese: `Trước hết, ${adv1_vi}.`, segments: [{ text: "First of all, ", isFixed: true }, { text: adv1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_3", vietnamese: `Điều này có nghĩa là ${exp1_vi}.`, segments: [{ text: "This means that ", isFixed: true }, { text: exp1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_4", vietnamese: `Ngoài ra, ${adv2_vi}.`, segments: [{ text: "In addition, ", isFixed: true }, { text: adv2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_5", vietnamese: `Điều này là do thực tế là ${exp2_vi}.`, segments: [{ text: "This is because of the fact that ", isFixed: true }, { text: exp2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_6", vietnamese: `Ví dụ, ${ex1_vi}.`, segments: [{ text: "For example, ", isFixed: true }, { text: ex1, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        body2: {
          title: "Thân bài 2 (Disadvantages)",
          sentences: [
            { id: "b2_1", vietnamese: `Mặt khác, có một số nhược điểm của ${topic}.`, segments: [{ text: "On the other hand, there are some disadvantages of ", isFixed: true }, { text: topic, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_2", vietnamese: `Điều đầu tiên là ${dis1_vi}.`, segments: [{ text: "The first one is that ", isFixed: true }, { text: dis1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_3", vietnamese: `Điều này có nghĩa là ${exp3_vi}.`, segments: [{ text: "This means that ", isFixed: true }, { text: exp3, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_4", vietnamese: `Hơn nữa, ${dis2_vi}.`, segments: [{ text: "Moreover, ", isFixed: true }, { text: dis2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_5", vietnamese: `Điều này có thể được chứng minh qua ví dụ rằng ${ex2_vi}.`, segments: [{ text: "This can be shown by the example that ", isFixed: true }, { text: ex2, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        conclusion: {
          title: "Kết bài (Conclusion)",
          sentences: [
            { id: "c1", vietnamese: "Tóm lại, mọi thứ luôn có hai mặt, và trường hợp này cũng không ngoại lệ.", segments: [{ text: "In conclusion, there are two sides to everything, and this situation is not an exception.", isFixed: true }] },
            { id: "c2", vietnamese: `${topic} đóng một vai trò quan trọng trong cuộc sống của chúng ta.`, segments: [{ text: "The ", isFixed: true }, { text: topic, isFixed: false }, { text: " plays a crucial part in our life.", isFixed: true }] },
            { id: "c3", vietnamese: "Mọi người nên có những cân nhắc thêm về vấn đề này.", segments: [{ text: "People should have further considerations on this issue.", isFixed: true }] }
          ]
        }
      }
    };
  } else if (essayType === "agree_disagree") {
    return {
      title: `Discussion on: ${promptView} (VSTEP)`,
      essayType,
      sections: {
        intro: {
          title: "Mở bài (Introduction)",
          sentences: [
            { id: "i1", vietnamese: `Một số người tin rằng ${promptView}.`, segments: [{ text: "Some people believe that ", isFixed: true }, { text: promptView, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "i2", vietnamese: "Tuy nhiên, những người khác lại có ý kiến trái chiều.", segments: [{ text: "Howere, others have different opinions.", isFixed: true }] },
            { id: "i3", vietnamese: "Trong bài viết dưới đây, cả hai khía cạnh của cuộc tranh luận sẽ được thảo luận chi tiết hơn.", segments: [{ text: "In the following essay, both sides of the argument will be discussed in more detail.", isFixed: true }] }
          ]
        },
        body1: {
          title: "Thân bài 1 (Arguments for Prompt View)",
          sentences: [
            { id: "b1_1", vietnamese: `Một mặt, có một số lý do tại sao mọi người nghĩ rằng ${promptView}.`, segments: [{ text: "On the one hand, there are some reasons why people think that ", isFixed: true }, { text: promptView, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_2", vietnamese: `Để bắt đầu, ${reason1_vi}.`, segments: [{ text: "To begin with, ", isFixed: true }, { text: reason1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_3", vietnamese: `Ngoài ra, ${reason2_vi}.`, segments: [{ text: "In addition, ", isFixed: true }, { text: reason2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_4", vietnamese: `Ví dụ, ${ex1_vi}.`, segments: [{ text: "For example, ", isFixed: true }, { text: ex1, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        body2: {
          title: "Thân bài 2 (Arguments for Opposing View)",
          sentences: [
            { id: "b2_1", vietnamese: `Mặt khác, có một số lập luận ủng hộ ý kiến cho rằng ${opposingView}.`, segments: [{ text: "On the other hand, there are several arguments in support of the idea that ", isFixed: true }, { text: opposingView, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_2", vietnamese: `Trên thực tế, mọi người có quan điểm này bởi vì ${reason3_vi}.`, segments: [{ text: "In fact, people have this opinion because ", isFixed: true }, { text: reason3, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_3", vietnamese: `Điều này có nghĩa là ${exp1_vi}.`, segments: [{ text: "This means that ", isFixed: true }, { text: exp1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_4", vietnamese: `Điều này có thể được chứng minh qua ví dụ rằng ${ex2_vi}.`, segments: [{ text: "This can be shown by the example that ", isFixed: true }, { text: ex2, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        conclusion: {
          title: "Kết bài (Conclusion)",
          sentences: [
            { id: "c1", vietnamese: "Tóm lại, luôn có hai mặt cho mọi vấn đề, và trường hợp này không ngoại lệ.", segments: [{ text: "In conclusion, there are two sides to everything, and this situation is not an exception.", isFixed: true }] },
            { id: "c2", vietnamese: `Theo quan điểm của tôi, tôi đồng ý rằng ${myView} vì nó đem lại nhiều lợi ích hơn.`, segments: [{ text: "In my opinion, I agree that ", isFixed: true }, { text: myView, isFixed: false }, { text: " because it brings more advantages.", isFixed: true }] }
          ]
        }
      }
    };
  } else {
    // causes_effects, causes_solutions, problems_solutions
    const isCausesEffects = essayType === "causes_effects";
    const isCausesSolutions = essayType === "causes_solutions";
    const p1 = isCausesEffects ? "reasons and effects" : (isCausesSolutions ? "causes and solutions" : "problems and solutions");
    const p1_vi = isCausesEffects ? "nguyên nhân và hệ quả" : (isCausesSolutions ? "nguyên nhân và giải pháp" : "vấn đề và giải pháp");
    const labelB1 = isCausesEffects ? "Causes" : (isCausesSolutions ? "Causes" : "Problems");
    const labelB2 = isCausesEffects ? "Effects" : (isCausesSolutions ? "Solutions" : "Solutions");

    const b1_title = isCausesEffects ? "Causes" : (isCausesSolutions ? "Causes" : "Problems");
    const b2_title = isCausesEffects ? "Effects" : (isCausesSolutions ? "Solutions" : "Solutions");

    const b1_lead_en = isCausesEffects || isCausesSolutions ? "There are several reasons for " : "As a result, there are many serious effects of this issue.";
    const b1_lead_vi = isCausesEffects || isCausesSolutions ? `Có một vài nguyên nhân cho việc ${topic}.` : "Kết quả là có nhiều ảnh hưởng nghiêm trọng của vấn đề này.";

    const b1_key1_en = isCausesEffects || isCausesSolutions ? "In my opinion, one of the foremost reasons is " : "To begin with, one of the most obvious problems caused by ";
    const b1_key1_vi = isCausesEffects || isCausesSolutions ? `Theo tôi, một trong những lý do hàng đầu là ${c1_vi}.` : `Để bắt đầu, một trong những vấn đề rõ ràng nhất là ${dis1_vi}.`;
    const b1_val1 = isCausesEffects || isCausesSolutions ? c1 : dis1;

    const b1_key2_en = "This means that ";
    const b1_key2_vi = `Điều này có nghĩa là ${exp1_vi}.`;
    const b1_val2 = exp1;

    const b1_key3_en = isCausesEffects || isCausesSolutions ? "In addition, another factor is " : "Secondly, another worrying effect is ";
    const b1_key3_vi = isCausesEffects || isCausesSolutions ? `Ngoài ra, một yếu tố khác là ${c2_vi}.` : `Thứ hai, một tác động đáng lo ngại khác là ${dis2_vi}.`;
    const b1_val3 = isCausesEffects || isCausesSolutions ? c2 : dis2;

    const b2_lead_en = isCausesEffects ? "As a result, there are many serious effects of this issue." : "However, there are some possible solutions to the main problems.";
    const b2_lead_vi = isCausesEffects ? "Kết quả là có nhiều hệ quả nghiêm trọng của vấn đề này." : "Tuy nhiên, có một số giải pháp khả thi cho các vấn đề chính.";

    const b2_key1_en = isCausesEffects ? "To begin with, one of the most obvious problems is " : "The first possible solution may be ";
    const b2_key1_vi = isCausesEffects ? `Để bắt đầu, một trong những vấn đề rõ ràng nhất là ${ef1_vi}.` : `Giải pháp khả thi đầu tiên có thể là ${s1_vi}.`;
    const b2_val1 = isCausesEffects ? ef1 : s1;

    const b2_key2_en = "This means that ";
    const b2_key2_vi = `Điều này có nghĩa là ${exp2_vi}.`;
    const b2_val2 = exp2;

    const b2_key3_en = isCausesEffects ? "Secondly, another worrying effect is " : "Another solution is that people could ";
    const b2_key3_vi = isCausesEffects ? `Thứ hai, một hệ quả đáng lo ngại khác là ${ef2_vi}.` : `Một giải pháp khác là mọi người có thể ${s2_vi}.`;
    const b2_val3 = isCausesEffects ? ef2 : s2;

    return {
      title: `${essayType.replace("_", " ").toUpperCase()} OF ${topic.toUpperCase()} (VSTEP)`,
      essayType,
      sections: {
        intro: {
          title: "Mở bài (Introduction)",
          sentences: [
            { id: "i1", vietnamese: `Trong những năm gần đây, ${topic} đã trở thành một vấn đề sâu rộng đối với công chúng.`, segments: [{ text: "In recent years, ", isFixed: true }, { text: topic, isFixed: false }, { text: " has become a broad issue to the general public.", isFixed: true }] },
            { id: "i2", vietnamese: "Mặc dù đáng chú ý, tác động của vấn đề này chưa được nhận ra bởi nhiều người dân.", segments: [{ text: "Although noticeable, the impact of this issue has not been realized by many residents.", isFixed: true }] },
            { id: "i3", vietnamese: `Bài luận dưới đây sẽ thảo luận về các ${p1_vi} của vấn đề này.`, segments: [{ text: "The following essay will discuss the ", isFixed: true }, { text: p1, isFixed: false }, { text: " of this problem.", isFixed: true }] }
          ]
        },
        body1: {
          title: `Thân bài 1 (${labelB1})`,
          sentences: [
            { id: "b1_1", vietnamese: b1_lead_vi, segments: isCausesEffects || isCausesSolutions ? [{ text: "There are several reasons for ", isFixed: true }, { text: topic, isFixed: false }, { text: ".", isFixed: true }] : [{ text: b1_lead_en, isFixed: true }] },
            { id: "b1_2", vietnamese: b1_key1_vi, segments: [{ text: b1_key1_en, isFixed: true }, { text: b1_val1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_3", vietnamese: b1_key2_vi, segments: [{ text: b1_key2_en, isFixed: true }, { text: b1_val2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_4", vietnamese: `Ví dụ, ${ex1_vi}.`, segments: [{ text: "For example, ", isFixed: true }, { text: ex1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_5", vietnamese: b1_key3_vi, segments: [{ text: b1_key3_en, isFixed: true }, { text: b1_val3, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b1_6", vietnamese: `Ví dụ cho việc này là ${ex2_vi}.`, segments: [{ text: "An example of this is that ", isFixed: true }, { text: ex2, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        body2: {
          title: `Thân bài 2 (${labelB2})`,
          sentences: [
            { id: "b2_1", vietnamese: b2_lead_vi, segments: [{ text: b2_lead_en, isFixed: true }] },
            { id: "b2_2", vietnamese: b2_key1_vi, segments: [{ text: b2_key1_en, isFixed: true }, { text: b2_val1, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_3", vietnamese: b2_key2_vi, segments: [{ text: b2_key2_en, isFixed: true }, { text: b2_val2, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_4", vietnamese: b2_key3_vi, segments: [{ text: b2_key3_en, isFixed: true }, { text: b2_val3, isFixed: false }, { text: ".", isFixed: true }] },
            { id: "b2_5", vietnamese: `Điều này có thể chứng minh qua ví dụ rằng ${ex3_vi}.`, segments: [{ text: "This can be shown by the example that ", isFixed: true }, { text: ex3, isFixed: false }, { text: ".", isFixed: true }] }
          ]
        },
        conclusion: {
          title: "Kết bài (Conclusion)",
          sentences: [
            { id: "c1", vietnamese: "Tóm lại, những thực tế trên phác thảo các khía cạnh khác nhau của vấn đề.", segments: [{ text: "In conclusion, the above mentioned facts have outlined the different aspects of this issue.", isFixed: true }] },
            { id: "c2", vietnamese: "Các nguyên nhân và tác động cần được cân nhắc cẩn thận.", segments: [{ text: "The main factors should be taken into account carefully.", isFixed: true }] },
            { id: "c3", vietnamese: "Mọi người nên có những suy ngẫm thêm về vấn đề này.", segments: [{ text: "People should have further considerations on this issue.", isFixed: true }] }
          ]
        }
      }
    };
  }
}


// Setup dev server or static static assets build depending on the environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running successfully on port ${PORT}`);
  });
}

initServer();
