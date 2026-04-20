import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";

// In AI Studio, the system naturally injects process.env.GEMINI_API_KEY
// The SDK will automatically pick it up.
const ai = new GoogleGenAI({});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware allows 50mb payloads to handle large base64 strings
  app.use(express.json({ limit: "50mb" }));

  // Vision API Endpoint
  app.post("/api/analyze-image", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing imageBase64 or mimeType in request body." });
      }

      console.log("Analyzing image stream using Gemini...");

      const prompt = `
        당신은 초등학생용 에듀테크 게임을 기획하는 분석 AI입니다.
        첨부된 이미지(보드판 또는 기획서)를 분석하여 아래 JSON 포맷으로 추출해 주세요.
        정확한 단어를 찾을 수 없으면 이미지의 맥락을 보고 추론하세요.
        반드시 순수 JSON 형식으로만 응답해야 합니다. 마크다운(\`\`\`json)은 절대로 넣지 마세요.
        
        {
          "grade": "X학년", // (1~6학년 중에서 판단, 기본값: 3학년)
          "subject": "과목명", // (국어, 수학, 사회, 과학, 영어 중 택1, 기본값: 수학)
          "gameType": "놀이 종류", // (퀴즈형, 액션형, 퍼즐형, 보스전 중 택1, 몬스터가 보이면 보스전)
          "keywords": ["키워드1", "키워드2"] // (배경, 아이템, 몬스터, 개념 등의 핵심 단어 3~4개 배열)
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType } }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      });

      const rawJson = response.text;
      
      try {
        const parsed = JSON.parse(rawJson);
        res.json(parsed);
      } catch(e) {
        console.error("Failed to parse Gemini output into JSON:", rawJson);
        res.status(500).json({ error: "Failed to parse AI output." });
      }

    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Internal server error during image analysis." });
    }
  });

  // Game Generation API Endpoint
  app.post("/api/generate-game", async (req, res) => {
    try {
      const { grade, subject, gameType, keywords } = req.body;
      console.log("Generating dynamic game content using Gemini...");

      const prompt = `
        당신은 초등학생 대상 에듀테크 게임 콘텐츠 생성 AI입니다.
        다음 설정에 맞춰서 아이들이 풀 수 있는 1개의 퀴즈/미션 데이터를 JSON으로 생성해주세요.
        
        학년: ${grade}
        과목: ${subject}
        놀이 종류: ${gameType}
        키워드: ${(keywords || []).join(', ')}
        
        요구사항:
        - 아이들이 흥미를 가질 수 있도록 제시된 [키워드]와 [놀이 종류] 콘셉트를 게임 스토리나 보스 이름에 적극적으로 반영하세요.
        - [과목]과 [학년] 수준에 딱 맞는 수준의 문제를 1개 출제하세요. (문제가 너무 어렵거나 쉽지 않아야 합니다)
        - 모든 출력 텍스트는 초등학생이 이해하기 쉬운 친절한 한국어로 해주세요.

        반드시 아래 JSON 형식으로만 응답해야 합니다. 마크다운(\`\`\`json)은 절대로 넣지 마세요.
        {
          "bossName": "보스 또는 미션 목표 이름 (예: 해적 선장 몬스터)",
          "question": "아이들이 풀어야 할 재미있는 문제 상황 텍스트",
          "options": ["보기1", "보기2", "보기3", "보기4"],
          "answer": "정답 텍스트 (반드시 options 배열 안의 항목 중 하나와 100% 일치해야 함)",
          "successMessage": "정답 시 출력할 칭찬 메시지"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7
        }
      });

      let jsonText = response.text || "";
      jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(jsonText);
        res.json(parsed);
      } catch(e) {
        console.error("Failed to parse Gemini output into JSON:", jsonText);
        res.status(500).json({ error: "Failed to parse AI output." });
      }

    } catch (error) {
      console.error("Gemini Game Gen Error:", error);
      res.status(500).json({ error: "Internal server error during game generation." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Determine the dist path properly supporting ESM.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
