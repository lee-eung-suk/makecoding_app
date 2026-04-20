import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function 설정
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb', // Vercel 서버리스 페이로드 제한 (무료플랜 4.5MB)
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Vercel Environment Variables에서 키를 가져옵니다.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set in Vercel Environment Variables." });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Missing imageBase64 or mimeType in request body." });
    }

    console.log("Analyzing image on Vercel Serverless Function...");

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
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
      ],
    });

    let jsonText = response.text || "";
    // 혹시라도 markdown 찌꺼기가 붙어있으면 제거
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsedData = JSON.parse(jsonText);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw output:", jsonText);
      return res.status(500).json({ error: "Failed to parse AI response.", rawOutput: jsonText });
    }
  } catch (error: any) {
    console.error("Vercel AI Endpoint Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error?.message || String(error) });
  }
}
