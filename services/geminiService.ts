import { BlockData } from "../types";

export const generateBlockFromPrompt = async (prompt: string, centerPos: {x:number,y:number}): Promise<BlockData | null> => {
  try {
    const r = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const json = await r.json();
    if (!json.success) return null;
    const block = json.result;
    return {
      id: block.id ?? crypto.randomUUID(),
      type: block.type ?? "text",
      text: block.text ?? block.raw ?? "",
      width: block.width ?? 300,
      height: block.height ?? 100,
      x: centerPos.x,
      y: centerPos.y
    };
  } catch (e) {
    return null;
  }
};
