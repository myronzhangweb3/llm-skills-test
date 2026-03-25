/**
 * ============================================================================
 * 入口 — OpenClaw 方案 REPL
 * ============================================================================
 *
 * OpenClaw 启动流程：
 *
 *   启动时：
 *     1. discoverSkills()   → 扫描 skills/ 目录，构建注册表
 *     2. createTools()      → 注册工具（read_file / get_time）
 *     3. buildSystemPrompt(allSkills) → 生成含 XML 技能列表的 System Prompt
 *     4. createExecutor(tools, config) → 创建执行器
 *
 *   每轮对话：
 *     5. executor.execute(systemPrompt, userMessage) → 发给 LLM
 *        └─ LLM 扫描 <available_skills> XML 列表
 *        └─ LLM 决定是否需要某个 skill
 *        └─ 若需要：调用 read_file 工具读取 SKILL.md，然后执行指令
 *        └─ 若不需要：直接回答
 */

import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "./registry.js";
import { listSkills } from "./trigger.js";
import { buildSystemPrompt } from "./prompt.js";
import { createTools } from "./tools.js";
import { createExecutor } from "./executor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIRS = [
  join(__dirname, "..", "skills"),
  join(__dirname, "..", "private-skills"),
];

async function main() {
  console.log("=== LLM Skill 系统（openclaw 方案）===\n");

  // ─── 阶段 1：Skill 发现 ───────────────────────────────────
  const registry = new Map();
  for (const dir of SKILLS_DIRS) {
    const dirSkills = discoverSkills(dir);
    for (const [name, skill] of dirSkills) {
      registry.set(name, skill);
    }
  }
  console.log(listSkills(registry));
  console.log();

  // ─── 阶段 2：工具注册 ────────────────────────────────────
  const tools = createTools();

  // ─── 阶段 3：构建 System Prompt（OpenClaw：XML 注入所有技能）────────
  const allSkills = [...registry.values()];
  const systemPrompt = buildSystemPrompt(allSkills);

  // ─── 阶段 4：执行器创建 ──────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  const model = process.env.OPENAI_MODEL;
  const executor = createExecutor(tools, { apiKey, baseURL, model });

  if (apiKey || baseURL) {
    console.log(`🟢 API 模式（model: ${model ?? "gpt-4o-mini"}, baseURL: ${baseURL ?? "默认"}）`);
  } else {
    console.log("🟡 Mock 模式（设置 OPENAI_API_KEY 和/或 OPENAI_BASE_URL 启用真实 API）");
  }
  console.log('输入消息开始对话，输入 "quit" 退出\n');

  // ─── REPL 主循环 ─────────────────────────────────────────
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const prompt = () => new Promise<string>((resolve, reject) => {
    rl.question("你> ", resolve);
    rl.once("close", () => reject(new Error("EOF")));
  });

  while (true) {
    let input: string;
    try { input = await prompt(); } catch { break; }
    if (input.trim().toLowerCase() === "quit") break;
    if (!input.trim()) continue;

    // 直接执行，无关键词触发步骤
    // LLM 在执行器内部自主决定是否激活技能
    try {
      await executor.execute(systemPrompt, input);
      console.log(); // 额外换行
    } catch (err) {
      console.error(`  ❌ 执行错误：${err instanceof Error ? err.message : err}\n`);
    }
  }

  rl.close();
  console.log("再见！");
}

main();
