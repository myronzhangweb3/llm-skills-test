/**
 * ============================================================================
 * 基础层 — 所有模块共享的类型定义
 * ============================================================================
 */

// ─── Skill 定义（SKILL.md 解析后的内存表示）
export interface SkillDefinition {
  name: string;         // Skill 名称（如 "greet"）
  description: string;  // 简短描述，注入 XML 列表供 LLM 扫描
  triggers: string[];   // 保留字段（frontmatter 解析用），不参与路由
  template: string;     // Markdown prompt 模板（SKILL.md body，LLM 按需懒加载）
  filePath: string;     // SKILL.md 的绝对路径（注入 <location> 标签，LLM 用 read_file 加载）
}

// ─── Skill 注册表（name → Skill 的映射）
export type SkillRegistry = Map<string, SkillDefinition>;

// ─── 工具定义（LLM 可调用的工具）
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<string>;
}

// ─── 对话消息
export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}
