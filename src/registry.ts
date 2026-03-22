/**
 * ============================================================================
 * 第 2 阶段 — Skill 发现与注册
 * ============================================================================
 *
 * 与之前的区别：parseSkillFile 现在保存 filePath，供 LLM 懒加载使用
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SkillDefinition, SkillRegistry } from "./types.js";

export function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };

  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      metadata[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return { metadata, body: match[2].trim() };
}

function parseArrayValue(value: string): string[] {
  const inner = value.replace(/^\[/, "").replace(/\]$/, "");
  return inner.split(",").map(s => s.trim()).filter(Boolean);
}

/** 解析单个 SKILL.md 文件 → SkillDefinition（含 filePath） */
export function parseSkillFile(filePath: string): SkillDefinition {
  const content = readFileSync(filePath, "utf-8");
  const { metadata, body } = parseFrontmatter(content);
  return {
    name: metadata.name ?? "unknown",
    description: metadata.description ?? "",
    triggers: parseArrayValue(metadata.triggers ?? "[]"),
    template: body,
    filePath,  // 🔑 保存路径，供 LLM 懒加载
  };
}

export function discoverSkills(skillsDir: string): SkillRegistry {
  const registry: SkillRegistry = new Map();
  const entries = readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    try {
      const skill = parseSkillFile(skillFile);
      registry.set(skill.name, skill);
    } catch { /* 跳过 */ }
  }

  return registry;
}
