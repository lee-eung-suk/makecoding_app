import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set in Vercel Environment Variables." });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const { grade, subject, gameType, keywords } = req.body;

    console.log("Generating game content on Vercel Serverless Function...");

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
      contents: [
        { text: prompt }
      ],
      config: {
        temperature: 0.7, // 약간의 창의성 허용
      }
    });

    let jsonText = response.text || "";
    jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsedData = JSON.parse(jsonText);
      return res.status(200).json(parsedData);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw output:", jsonText);
      return res.status(500).json({ error: "Failed to parse AI response.", rawOutput: jsonText });
    }
  } catch (error: any) {
    console.error("Vercel AI Generate Game Error:", error);
    return res.status(500).json({ error: "Internal Server Error", details: error?.message || String(error) });
  }
}
