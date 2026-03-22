/**
 * ============================================================================
 * 第 6 阶段 — 工具定义（Tool Definitions）
 * ============================================================================
 *
 * LLM 可调用的工具：
 *   - read_file:   读取文件内容（OpenClaw 懒加载 SKILL.md 的核心工具）
 *   - get_time:    获取当前时间
 *   - read_state:  读取状态（Skill 间数据共享）
 *   - write_state: 写入状态（持久化数据）
 */

import { readFileSync } from "node:fs";
import type { ToolDefinition } from "./types.js";
import type { StateStore } from "./state.js";

export function createTools(state: StateStore): ToolDefinition[] {
  return [
    {
      name: "read_file",
      description: "读取指定路径的文件内容（用于按需加载 SKILL.md 指令）",
      input_schema: {
        type: "object",
        properties: { path: { type: "string", description: "要读取的文件绝对路径" } },
        required: ["path"],
      },
      handler: async (input) => {
        try {
          return readFileSync(input.path as string, "utf-8");
        } catch (e) {
          return `错误：无法读取文件 "${input.path}"`;
        }
      },
    },
    {
      name: "get_time",
      description: "获取当前的日期和时间（ISO 格式）",
      input_schema: { type: "object", properties: {}, required: [] },
      handler: async () => new Date().toISOString(),
    },
    {
      name: "read_state",
      description: "通过 key 从状态存储中读取数据",
      input_schema: {
        type: "object",
        properties: { key: { type: "string", description: "要读取的状态键名" } },
        required: ["key"],
      },
      handler: async (input) => JSON.stringify(state.read(input.key as string)),
    },
    {
      name: "write_state",
      description: "向状态存储中写入数据",
      input_schema: {
        type: "object",
        properties: {
          key: { type: "string", description: "状态键名" },
          value: { description: "要存储的值（任意 JSON 可序列化类型）" },
        },
        required: ["key", "value"],
      },
      handler: async (input) => {
        state.write(input.key as string, input.value);
        return `状态 "${input.key}" 写入成功`;
      },
    },
  ];
}

/**
 * 将工具定义转换为 OpenAI function calling 格式
 *
 * OpenAI 格式：{ type: "function", function: { name, description, parameters } }
 * Anthropic 格式：{ name, description, input_schema }
 * 语义相同，仅字段名不同。
 */
export function formatToolsForAPI(tools: ToolDefinition[]): OpenAITool[] {
  return tools.map(({ name, description, input_schema }) => ({
    type: "function" as const,
    function: { name, description, parameters: input_schema },
  }));
}

export interface OpenAITool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** 根据名称找到对应的工具并执行 */
export async function handleToolCall(
  toolName: string,
  toolInput: Record<string, unknown>,
  tools: ToolDefinition[],
): Promise<string> {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) return `错误：未知工具 "${toolName}"`;
  return tool.handler(toolInput);
}
