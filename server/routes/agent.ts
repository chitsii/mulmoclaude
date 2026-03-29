import { Router, Request, Response } from "express";
import { getRole } from "../../src/config/roles.js";
import { runAgent } from "../agent.js";
import { workspacePath } from "../workspace.js";

const router = Router();

router.post("/agent", async (req: Request, res: Response) => {
  const { message, roleId } = req.body as { message: string; roleId: string };

  if (!message || !roleId) {
    res.status(400).json({ error: "message and roleId are required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const role = getRole(roleId);

  try {
    for await (const event of runAgent(message, role, workspacePath)) {
      send(event);
    }
    send({ type: "status", message: "Done" });
  } catch (err) {
    send({ type: "error", message: String(err) });
  } finally {
    res.end();
  }
});

export default router;
