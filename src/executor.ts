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
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { ToolDefinition } from "./types.js";
import { formatToolsForAPI, handleToolCall } from "./tools.js";

const MAX_TOOL_ROUNDS = 10;

// 日志文件路径
const LOG_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOG_DIR, `session-${Date.now()}.log`);

// 初始化日志目录
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

export interface Executor {
  execute: (systemPrompt: string, userMessage: string) => Promise<string>;
  reset: () => void;
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

  // 🔑 保持对话历史
  let messages: OpenAI.ChatCompletionMessageParam[] = [];

  async function execute(systemPrompt: string, userMessage: string): Promise<string> {
    // 首次调用时添加 system prompt
    if (messages.length === 0) {
      messages.push({ role: "system", content: systemPrompt });
      log("Session started");
    }

    // 添加用户消息
    messages.push({ role: "user", content: userMessage });
    log(`User: ${userMessage}`);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const requestBody = { model, max_tokens: 1024, messages, tools: apiTools, stream: true };
      log(`\n[Round ${round}] Request: { model: "${model}", messages: ${messages.length}, tools: ${apiTools.length} }`);
      log(JSON.stringify(requestBody, null, 2));

      const stream = await client.chat.completions.create(requestBody);

      let fullContent = "";
      let toolCalls: any[] = [];
      let currentToolCall: any = null;

      process.stdout.write("\n助手> ");

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          process.stdout.write(delta.content);
          fullContent += delta.content;
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || "",
                  type: "function",
                  function: { name: "", arguments: "" },
                };
              }
              currentToolCall = toolCalls[tc.index];
            }

            if (tc.id) currentToolCall.id = tc.id;
            if (tc.function?.name) currentToolCall.function.name += tc.function.name;
            if (tc.function?.arguments) currentToolCall.function.arguments += tc.function.arguments;
          }
        }
      }

      console.log();
      log(`Assistant: ${fullContent}`);

      const assistantMessage: OpenAI.ChatCompletionMessage = {
        role: "assistant",
        content: fullContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      };
      messages.push(assistantMessage);

      if (!toolCalls.length) {
        return fullContent || "[无响应内容]";
      }

      for (const toolCall of toolCalls) {
        const fnName = toolCall.function.name;
        const fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        const result = await handleToolCall(fnName, fnArgs, tools);

        log(`Tool call: ${fnName}(${JSON.stringify(fnArgs)})`);
        log(`Tool result: ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    }

    return "[达到最大工具调用轮次]";
  }

  function reset() {
    messages = [];
  }

  return { execute, reset };
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
    reset() {
      console.log("  🔄 [Mock] 重置对话历史");
    },
  };
}
