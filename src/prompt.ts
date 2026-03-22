/**
 * ============================================================================
 * 第 4 阶段 — Prompt 构建（OpenClaw 方案）
 * ============================================================================
 *
 * 核心变化：
 *   1. 将所有 skill 以紧凑 XML 格式注入 system prompt
 *   2. 添加强制指令：LLM 回复前扫描 <available_skills>，决定是否懒加载某个 skill
 *   3. LLM 通过 read_file 工具按需读取 SKILL.md 的完整指令
 */

import type { SkillDefinition } from "./types.js";

/** 基础 System Prompt */
export const BASE_SYSTEM_PROMPT = `你是一个拥有多项专项技能的智能助手。
根据用户的意图，自主决定是否使用某个技能，或直接回答。
使用工具时可以按需连续调用多个工具。
始终用与用户输入相同的语言回复。`;

/**
 * 构建 System Prompt（OpenClaw 方案）
 *
 * 将所有 skill 以 XML 格式注入，附带强制扫描指令。
 * LLM 自己决定是否需要读取某个 skill 的完整指令。
 */
export function buildSystemPrompt(skills: SkillDefinition[]): string {
  if (skills.length === 0) return BASE_SYSTEM_PROMPT;

  // 🔑 生成紧凑 XML 列表（仅 name + description + location）
  const skillsXML = skills
    .map(s => `  <skill>
    <name>${escapeXML(s.name)}</name>
    <description>${escapeXML(s.description)}</description>
    <location>${escapeXML(s.filePath)}</location>
  </skill>`)
    .join("\n");

  // 🔑 OpenClaw 的强制指令：回复前扫描，按需懒加载
  return `${BASE_SYSTEM_PROMPT}

## 技能（强制规则）

回复前：扫描 <available_skills> 中的 <description> 条目。
- 如果恰好有一个技能明确适用：用 read_file 工具读取其 <location> 路径的 SKILL.md，然后严格按其指令执行。
- 如果多个技能都可能适用：选择最具体的那个，读取并执行。
- 如果没有技能明确适用：不要读取任何 SKILL.md，直接回答。
约束：不要预先读取多个技能；只在选定后读取。

<available_skills>
${skillsXML}
</available_skills>`;
}

/** XML 转义（防止注入） */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
