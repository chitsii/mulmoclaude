import { Router, Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

router.post("/generate-image", async (req: Request, res: Response) => {
  const { prompt, model } = req.body as { prompt: string; model?: string };

  if (!prompt) {
    res.status(400).json({ success: false, message: "prompt is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res
      .status(500)
      .json({ success: false, message: "GEMINI_API_KEY is not set" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelName = model ?? "gemini-2.5-flash-image";

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ text: prompt }],
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    let imageData: string | undefined;
    let message: string | undefined;

    for (const part of parts) {
      if (part.text) message = part.text;
      if (part.inlineData?.data) imageData = part.inlineData.data;
    }

    if (imageData) {
      res.json({
        message: "image generation succeeded",
        instructions:
          "Acknowledge that the image was generated and has been presented to the user.",
        title: "Generated Image",
        data: {
          imageData: `data:image/png;base64,${imageData}`,
          prompt,
        },
      });
    } else {
      res.json({ message: message ?? "no image data in response" });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, message: msg });
  }
});

export default router;
