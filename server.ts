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
        당신은 초등학생 대상 에듀테크 게임 콘텐츠 생성 마스터 AI입니다.
        학생들이 입력한 키워드와 놀이 종류를 바탕으로, 지루한 단순 퀴즈가 아닌 '세계관이 있는 다이내믹한 롤플레잉형 미션 게임'을 생성해주세요.

        학년: ${grade}
        과목: ${subject}
        놀이 종류: ${gameType}
        키워드: ${(keywords || []).join(', ')}

        요구사항:
        1. [놀이 종류]에 맞춰 문제의 성격과 스토리, 상황 묘사를 완전히 동적으로 최적화하세요. (예를 들어 '마트게임'이면 물건을 사고 파는 계산 시나리오, '비밀 스파이'이면 암호를 해독하는 시나리오, '방탈출'이면 단서를 조합해 문을 여는 시나리오 등 어떤 테마든 창의적으로 만들어냅니다.)
        2. 제시된 [키워드]를 게임의 전체 스토리, 적 이름, 배경, 아이템에 아주 자연스럽고 적극적으로 녹여내세요.
        3. 해당 [과목]과 [학년] 수준에 맞는 진짜 교육용 교과 지식 문제를 총 3단계(stages)로 만드세요. 단계가 오를수록 난이도가 조금씩 오릅니다.
        4. 학생이 몰입할 수 있도록 대화체, 극적인 묘사, 게임 마스터 같은 말투, 귀여운 이모지를 듬뿍 사용하세요.
        5. 반드시 순수 JSON 포맷으로만 반환해야 합니다. 어떠한 마크다운 백틱(\`\`\`)도 포함하지 마세요.

        {
          "title": "게임의 멋진 제목",
          "intro": "게임을 시작하는 오프닝 스토리 및 몰입 텍스트 (길고 흥미진진하게)",
          "bossName": "등장하는 주적이나 핵심 NPC 이름",
          "stages": [
            {
              "mission": "현재 닥친 위기나 상황 묘사 텍스트",
              "question": "실제로 풀어야 할 교과 지식 문제 (스토리와 연관되게)",
              "options": ["보기1", "보기2", "보기3", "보기4"],
              "answer": "정답 딱 1개 (options 배열의 텍스트 중 하나와 완전히 일치할 것)",
              "successMessage": "맞췄을 때 상황이 해결되는 극적인 칭찬 대사 (예: 몬스터에게 1000의 데미지를 줬다!)"
            }
          ] // 3개의 오브젝트 생성
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9 // 창의성 향상
        }
      });

      let jsonText = response.text || "";
      jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(jsonText);
        res.json(parsed);
      } catch(e) {
        console.error("Failed to parse Gemini output into JSON:", jsonText);
        res.status(500).json({ error: "Failed to parse AI output.", rawOutput: jsonText });
      }

    } catch (error: any) {
      console.error("Gemini Game Gen Error:", error);
      res.status(500).json({ error: error?.message || "Internal server error during game generation." });
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
