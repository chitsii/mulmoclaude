import type { ToolPlugin } from "../../tools/types";
import type { ToolResult } from "gui-chat-protocol";
import type { MulmoScript } from "mulmocast";
import toolDefinition, { TOOL_NAME } from "./definition";
import View from "./View.vue";
import Preview from "./Preview.vue";
import { apiPost } from "../../utils/api";
import { API_ROUTES } from "../../config/apiRoutes";
import { makeUuid } from "../../utils/id";

export interface MulmoScriptData {
  script: MulmoScript;
  filePath: string;
}

interface PresentMulmoScriptArgs {
  script?: MulmoScript;
  filename?: string;
  filePath?: string;
  autoGenerateMovie?: boolean;
}

const presentMulmoScriptPlugin: ToolPlugin<MulmoScriptData> = {
  toolDefinition,

  async execute(_context, args) {
    const { script, filename, filePath, autoGenerateMovie } = args as PresentMulmoScriptArgs;

    // Enforce "exactly one of script / filePath" — the JSON schema can't
    // express oneOf cleanly, so we validate here and surface a structured
    // tool error the LLM can recover from on its next turn.
    const hasScript = script !== undefined && script !== null;
    const hasFilePath = typeof filePath === "string" && filePath !== "";
    if (hasScript === hasFilePath) {
      return {
        toolName: TOOL_NAME,
        uuid: makeUuid(),
        message: hasScript
          ? "Provide either `script` or `filePath`, not both."
          : "Provide either `script` (new presentation) or `filePath` (existing presentation).",
      };
    }

    const result = hasFilePath
      ? await apiPost<ToolResult<MulmoScriptData>>(API_ROUTES.mulmoScript.load, { filePath })
      : await apiPost<ToolResult<MulmoScriptData>>(API_ROUTES.mulmoScript.save, { script, filename });

    if (!result.ok) {
      return {
        toolName: TOOL_NAME,
        uuid: makeUuid(),
        message: result.error,
      };
    }

    const savedFilePath = result.data.data?.filePath;
    if (autoGenerateMovie === true && savedFilePath) {
      // Fire-and-forget. The server returns 200 immediately and runs
      // the heavy work detached; progress flows through the session
      // pendingGenerations channel that the View already watches.
      void apiPost(API_ROUTES.mulmoScript.generateMovieBackground, {
        filePath: savedFilePath,
      });
    }

    return {
      ...result.data,
      toolName: TOOL_NAME,
      uuid: makeUuid(),
    };
  },

  isEnabled: () => true,
  generatingMessage: "Generating MulmoScript storyboard…",
  viewComponent: View,
  previewComponent: Preview,
};

export default presentMulmoScriptPlugin;
