import type { ToolPlugin } from "./types";

/**
 * Plugin registry
 * Add gui-chat-protocol plugins here as they are implemented.
 */
const plugins: Record<string, ToolPlugin> = {
  // e.g.:
  // todo: todoPlugin,
  // calendar: calendarPlugin,
};

export function getPlugin(name: string): ToolPlugin | null {
  return plugins[name] ?? null;
}

export function getPlugins(names: string[]): Record<string, ToolPlugin> {
  return Object.fromEntries(
    names.flatMap(name => {
      const plugin = plugins[name];
      return plugin ? [[name, plugin]] : [];
    })
  );
}

export function getAllPluginNames(): string[] {
  return Object.keys(plugins);
}
