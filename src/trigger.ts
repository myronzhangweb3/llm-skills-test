/**
 * ============================================================================
 * 工具函数 — Skill 注册表展示
 * ============================================================================
 *
 * 关键词触发匹配（detectSkill / sanitizeInput）已移除。
 * openclaw 方案中，路由决策由 LLM 自主完成，无需预处理关键词。
 *
 * 本文件只保留 listSkills，用于启动时打印当前可用技能。
 */

import type { SkillRegistry } from "./types.js";

/** 列出所有已注册的 Skill（供启动时展示） */
export function listSkills(registry: SkillRegistry): string {
  const lines = ["可用技能："];
  for (const skill of registry.values()) {
    lines.push(`  - ${skill.name}：${skill.description}`);
  }
  return lines.join("\n");
}
