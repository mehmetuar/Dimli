import { GoogleGenAI } from "@google/genai";
import { SkillLevel } from "../types";

// Initialize the Gemini client
// Note: In a real production app, you might proxy this through a backend to hide the key,
// but for this frontend-only demo, we use the env variable directly as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateTeamBio = async (teamName: string, level: SkillLevel): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      Sen bir Türk halı saha futbol koçusun. Şu takım için kısa, iddialı ama fair-play vurgusu yapan, eğlenceli bir tanıtım yazısı yaz (maksimum 2 cümle):
      Takım Adı: ${teamName}
      Seviye: ${level}

      Türkçe argoları hafifçe kullanabilirsin ama saygılı ol.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || "Takım tanıtımı oluşturulamadı.";
  } catch (error) {
    console.error("Gemini Bio Generation Error:", error);
    return "Şu an yapay zeka servisimiz meşgul, lütfen kendi tanıtımınızı yazın.";
  }
};

export const getTacticalAdvice = async (opponentLevel: SkillLevel, myLevel: SkillLevel): Promise<string> => {
  try {
    const modelId = "gemini-2.5-flash";
    const prompt = `
      Bizim seviyemiz: ${myLevel}.
      Rakip seviyesi: ${opponentLevel}.
      
      Halı sahada bu rakibe karşı nasıl oynamalıyız? 3 maddelik kısa taktik ver.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "Taktik oluşturulamadı.";
  } catch (error) {
    console.error("Gemini Tactics Error:", error);
    return "Topu yerde tutun ve pas yapın!";
  }
};