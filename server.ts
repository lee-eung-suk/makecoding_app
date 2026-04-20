import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";

// In AI Studio, the system naturally injects process.env.GEMINI_API_KEY
// No need to hardcore any API keys in source code.
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware allows 50mb payloads to handle large base64 strings
  app.use(express.json({ limit: "50mb" }));

  // Vision API Endpoint
  app.post("/api/analyze-image", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini Validation Error: The environment variable GEMINI_API_KEY natively provided by the platform is missing." });
      }

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
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
