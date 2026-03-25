/**
 * ============================================================================
 * 第 6 阶段 — 工具定义（Tool Definitions）
 * ============================================================================
 *
 * LLM 可调用的工具：
 *   - read_file:   读取文件内容（OpenClaw 懒加载 SKILL.md 的核心工具）
 *   - get_time:    获取当前时间
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import type { ToolDefinition } from "./types.js";

export function createTools(): ToolDefinition[] {
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
      name: "exec_command",
      description: "执行本机 shell 命令并返回输出结果",
      input_schema: {
        type: "object",
        properties: { command: { type: "string", description: "要执行的 shell 命令" } },
        required: ["command"],
      },
      handler: async (input) => {
        try {
          const output = execSync(input.command as string, { encoding: "utf-8", maxBuffer: 1024 * 1024 });
          return output;
        } catch (e: any) {
          return `错误：命令执行失败\n${e.message}\n${e.stderr || ""}`;
        }
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
