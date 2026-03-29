export interface Role {
  id: string;
  name: string;
  icon: string;
  prompt: string;
  availablePlugins: string[];
}

export const ROLES: Role[] = [
  {
    id: "general",
    name: "General",
    icon: "star",
    prompt:
      "You are a helpful assistant with access to the user's workspace. Help with tasks, answer questions, and use available tools when appropriate.",
    availablePlugins: ["manageTodoList", "switchRole"],
  },
  {
    id: "office",
    name: "Office",
    icon: "business_center",
    prompt:
      "You are a professional office assistant. Create and edit documents, spreadsheets, and presentations. Read existing files in the workspace for context.",
    availablePlugins: [
      "presentDocument",
      "presentSpreadsheet",
      "generateImage",
      "switchRole",
    ],
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: "lightbulb",
    prompt:
      "You are a creative brainstorming facilitator. Help visualize and explore ideas using mind maps, images, and documents. Read workspace files for context when relevant.",
    availablePlugins: [
      "createMindMap",
      "presentDocument",
      "generateImage",
      "switchRole",
    ],
  },
];

export const DEFAULT_ROLE_ID = "general";

export function getRole(id: string): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0];
}
