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
        당신은 초등학생 대상 에듀테크 게임 콘텐츠 생성 마스터 AI입니다.
        학생들이 입력한 키워드와 놀이 종류를 바탕으로, 지루한 단순 퀴즈가 아닌 '세계관이 있는 다이내믹한 롤플레잉형 미션 게임'을 생성해주세요.

        학년: ${grade}
        과목: ${subject}
        놀이 종류: ${gameType}
        키워드: ${(keywords || []).join(', ')}

        요구사항:
        1. [놀이 종류]에 맞춰 문제의 성격과 상황 묘사를 완전히 바꾸세요.
          - 액션형: 적의 공격을 피하거나 마법을 쏘는 긴박한 상황 (예: "운석이 날아와! 수식을 풀어 방어막을 쳐라!")
          - 퍼즐형: 단서를 조합하거나 비밀문, 암호를 푸는 상황 (예: "고대 유적의 문을 열기 위해 다음 암호를 해독해.")
          - 보스전: 거대한 몬스터의 패턴을 파악해 대미지를 주는 상황 (예: "드래곤이 불을 뿜으려 한다! 약점을 공략해!")
          - 퀴즈형: 서바이벌 퀴즈 대회나 퀴즈 쇼 같은 상황
        2. 제시된 [키워드]를 게임의 전체 스토리, 적 이름, 배경, 아이템에 아주 자연스럽고 적극적으로 녹여내세요.
        3. 해당 [과목]과 [학년] 수준에 맞는 진짜 교육용 문제를 총 3단계(stages)로 만드세요. 단계가 오를수록 적이 강해지거나 난이도가 조금 오릅니다.
        4. 학생이 몰입할 수 있도록 대화체, 극적인 묘사, 귀여운 이모지를 듬뿍 사용하세요.
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
        temperature: 0.9, // 약간의 창의성 향상
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
