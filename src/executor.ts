/**
 * ============================================================================
 * 第 5 阶段 — LLM 执行引擎（OpenClaw 方案）
 * ============================================================================
 *
 * OpenClaw 方案核心：
 *   1. System prompt 包含所有 skill 的 XML 列表（name/description/location）
 *   2. LLM 扫描列表，自主决定是否需要某个 skill
 *   3. LLM 通过 read_file 工具按需读取 SKILL.md 的完整指令
 *   4. LLM 直接执行 skill 指令（无子 LLM 调用，无 skill 工具包装）
 */

import OpenAI from "openai";
import type { ToolDefinition } from "./types.js";
import { formatToolsForAPI, handleToolCall } from "./tools.js";

const MAX_TOOL_ROUNDS = 10;

export interface Executor {
  execute: (systemPrompt: string, userMessage: string) => Promise<string>;
}

export interface LLMConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
}

export function createExecutor(
  tools: ToolDefinition[],
  config: LLMConfig = {},
): Executor {
  if (config.apiKey || config.baseURL) return createRealExecutor(tools, config);
  return createMockExecutor(tools);
}

/** ─── 真实 API 模式 ──────────────────────────────────────────────────────── */
function createRealExecutor(
  tools: ToolDefinition[],
  config: LLMConfig,
): Executor {
  const client = new OpenAI({
    apiKey: config.apiKey ?? "dummy-key",
    baseURL: config.baseURL,
  });

  const model = config.model ?? "gpt-4o-mini";
  const apiTools = formatToolsForAPI(tools);

  async function execute(systemPrompt: string, userMessage: string): Promise<string> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const requestBody = { model, max_tokens: 1024, messages, tools: apiTools };
      console.log(`\n📤 [第 ${round} 轮] 请求体：\n`, JSON.stringify(requestBody, null, 2));

      const response = await client.chat.completions.create(requestBody);
      console.log(`\n📥 [第 ${round} 轮] 响应体：\n`, JSON.stringify(response, null, 2));

      const assistantMessage = response.choices[0].message;
      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls?.length) {
        return assistantMessage.content ?? "[无响应内容]";
      }

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        const result = await handleToolCall(fnName, fnArgs, tools);
        console.log(`  🔧 工具调用：${fnName}(${JSON.stringify(fnArgs)}) → ${result.slice(0, 100)}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    return "[达到最大工具调用轮次]";
  }

  return { execute };
}

/** ─── Mock 模式（不需要 API Key）────────────────────────────────────────── */
function createMockExecutor(tools: ToolDefinition[]): Executor {
  return {
    async execute(systemPrompt: string, userMessage: string): Promise<string> {
      console.log("  📋 [Mock] System Prompt 已构建，长度：", systemPrompt.length, "字符");
      console.log("  📋 [Mock] 模拟 LLM 处理...");

      const lower = userMessage.toLowerCase();

      if (lower.includes("hello") || lower.includes("hi") || lower.includes("你好") || lower.includes("greet")) {
        const timeResult = await handleToolCall("get_time", {}, tools);
        console.log(`  🔧 工具调用：get_time() → ${timeResult}`);
        return `[Mock] 你好！现在是 ${timeResult}，祝你今天愉快！`;
      }

      if (lower.includes("总结") || lower.includes("summarize")) {
        return `[Mock] 摘要：${userMessage.slice(0, 80)}...`;
      }

      return `[Mock] 收到："${userMessage}"`;
    },
  };
}
