/**
 * 非交互式测试脚本 — 验证 openclaw 方案的完整 Skill 生命周期
 * 运行: npx tsx src/test.ts
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverSkills } from "./registry.js";
import { listSkills } from "./trigger.js";
import { buildSystemPrompt } from "./prompt.js";
import { createTools } from "./tools.js";
import { createStateStore } from "./state.js";
import { createExecutor } from "./executor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "..", "skills");

async function test() {
  console.log("=== openclaw 方案：Skill 生命周期验证测试 ===\n");

  // 阶段 1：发现所有 Skill
  const registry = discoverSkills(SKILLS_DIR);
  console.log(listSkills(registry));
  console.log(`\n✅ 阶段 1：发现了 ${registry.size} 个 Skill\n`);

  // 阶段 2：初始化
  const state = createStateStore();
  const tools = createTools(state);

  // 阶段 3：构建含所有技能列表的 System Prompt（整个会话复用）
  const allSkills = [...registry.values()];
  const systemPrompt = buildSystemPrompt(allSkills);
  console.log(`✅ 阶段 3：System Prompt 已构建（${systemPrompt.length} 字符，含 ${allSkills.length} 个技能工具）\n`);

  // 阶段 4：创建执行器（OpenClaw 方案：LLM 通过 read_file 按需加载 skill）
  const executor = createExecutor(tools);
  console.log(`✅ 阶段 4：执行器已创建，可用工具：${tools.map(t => t.name).join(", ")}\n`);

  // ─── 测试 1：greet（LLM 扫描 XML 列表后读取 skill，执行问候）───────
  console.log("─── 测试 1：greet 技能 ───");
  const input1 = "你好！";
  console.log(`  输入：${input1}`);
  console.log(`  （LLM 扫描 available_skills，决定是否 read_file 加载 greet）`);
  const result1 = await executor.execute(systemPrompt, input1);
  console.log(`  结果：${result1}`);
  console.log();

  // ─── 测试 2：summarize（AI 自主选择调用 skill_summarize）
  console.log("─── 测试 2：summarize 技能 ───");
  const input2 = "帮我总结一下：人工智能正在改变软件开发的方式，从代码生成到测试自动化，再到系统架构设计";
  console.log(`  输入：${input2.slice(0, 60)}...`);
  const result2 = await executor.execute(systemPrompt, input2);
  console.log(`  结果：${result2}`);
  console.log(`  状态存储：${JSON.stringify(state.read("last_summary")).slice(0, 80)}...`);
  console.log();

  // ─── 测试 3：research（AI 先调 skill_research，内部再调 skill_summarize）
  console.log("─── 测试 3：research 技能（链式调用）───");
  const input3 = "帮我深度分析：深度学习在自然语言处理领域的应用越来越广泛，特别是大语言模型";
  console.log(`  输入：${input3.slice(0, 60)}...`);
  const result3 = await executor.execute(systemPrompt, input3);
  console.log(`  结果：${result3}`);
  console.log();

  // ─── 测试 4：无技能（AI 直接回答）──────────────────────
  console.log("─── 测试 4：无技能匹配，AI 直接回答 ───");
  const input4 = "今天天气怎么样";
  console.log(`  输入：${input4}`);
  const result4 = await executor.execute(systemPrompt, input4);
  console.log(`  结果：${result4}`);
  console.log();

  console.log("=== 所有测试完成 ===");
}

test();
