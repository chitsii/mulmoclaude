import { Router, Request, Response } from "express";
import { executeMindMap } from "@gui-chat-plugin/mindmap";
import { executeSpreadsheet } from "@gui-chat-plugin/spreadsheet";

const router = Router();

// presentDocument — just formats the markdown data; image generation not supported
router.post("/present-document", (req: Request, res: Response) => {
  const { title, markdown } = req.body as { title: string; markdown: string };
  res.json({
    message: `Document "${title}" is ready.`,
    title,
    data: { markdown },
  });
});

// presentSpreadsheet — uses package execute for validation/processing
router.post("/present-spreadsheet", async (req: Request, res: Response) => {
  try {
    const result = await executeSpreadsheet(null as never, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

// createMindMap — uses package execute for node layout computation
router.post("/mindmap", async (req: Request, res: Response) => {
  try {
    const result = await executeMindMap(null as never, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: String(err) });
  }
});

export default router;
