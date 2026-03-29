import type {
  ToolPlugin as BaseToolPlugin,
  InputHandler,
  ToolContext,
  ToolResultComplete,
  ToolContextApp,
} from "gui-chat-protocol/vue";

/**
 * Extended app context with file system access for workspace-aware plugins
 */
export interface MulmoClaudeToolContextApp extends ToolContextApp {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  workspacePath: () => string;
}

/**
 * MulmoClaude ToolPlugin — no app-specific server response type needed
 */
export type ToolPlugin<
  T = unknown,
  J = unknown,
  A extends object = object,
> = BaseToolPlugin<T, J, A, InputHandler, Record<string, unknown>>;

export type ToolExecuteFn = (
  context: ToolContext,
  name: string,
  args: Record<string, unknown>,
) => Promise<ToolResultComplete>;

export type GetToolPluginFn = (
  name: string,
) => ToolPlugin<unknown, unknown, object> | null;
