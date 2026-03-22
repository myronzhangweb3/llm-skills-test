# LLM Skill System — OpenClaw 方案

> 通过阅读源码理解 LLM Skill 的 OpenClaw 实现方案：XML 注入 + 懒加载。
>
> 参考 OpenClaw 真实源码：[`src/agents/skills/workspace.ts`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/workspace.ts)（`buildWorkspaceSkillsPrompt` + `compactSkillPaths`）、[`src/agents/skills/frontmatter.ts`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/frontmatter.ts)（SKILL.md 解析）

## 什么是 OpenClaw 方案？

**Skill = 注入 system prompt 的 XML 条目 + 按需懒加载的指令文件。**

工作方式：

1. 启动时将所有 Skill 以**紧凑 XML 格式**注入 system prompt（仅 name/description/location，不含完整指令）— 参考 OpenClaw [`formatSkillsForPrompt`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/workspace.ts)
2. 每轮对话，LLM **自主扫描** `<available_skills>` 列表，根据语义判断是否需要某个 Skill
3. 若需要，LLM 调用 `read_file` 工具**按需读取** SKILL.md 的完整指令
4. LLM 直接按 SKILL.md 的指令执行（无子 LLM 调用，无工具包装）

## 架构图

```
启动时（一次性）：
  discoverSkills() → buildSystemPrompt() → XML 注入 system prompt
  createTools()    → [read_file, get_time]

每轮对话：
用户输入
    │
    ▼
┌─────────────────────────────────────┐
│  LLM（携带完整 system prompt）       │
│  扫描 <available_skills> XML 列表   │
│  自主决定：需要 skill？              │
└───────────┬─────────────────────────┘
            │ 需要                    │ 不需要
            ▼                         ▼
    调用 read_file              直接生成回复
    读取 SKILL.md
            │
            ▼
    按 SKILL.md 指令执行
    （可调用 get_time 等工具）
            │
            ▼
      生成最终回复
```

## 文件结构

| 文件 | 说明 |
|------|------|
| [`src/types.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/types.ts) | 数据模型，`SkillDefinition.filePath` 是懒加载的关键字段 |
| [`src/registry.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/registry.ts) | 扫描 `skills/` 目录，解析 frontmatter，保存文件路径 |
| [`src/prompt.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/prompt.ts) | 🔑 核心：生成 XML 技能列表，注入 system prompt + 强制扫描指令 |
| [`src/tools.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/tools.ts) | LLM 可调用工具：`read_file` / `get_time` |
| [`src/executor.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/executor.ts) | Agentic Loop：API 调用 → tool_calls → 循环，无 skill 工具包装 |
| [`src/index.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/index.ts) | REPL 入口，串联完整流程 |
| [`skills/greet/SKILL.md`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/skills/greet/SKILL.md) | 问候技能，调用 `get_time` 报告当前时段 |
| [`skills/summarize/SKILL.md`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/skills/summarize/SKILL.md) | 摘要技能 |
| [`skills/research/SKILL.md`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/skills/research/SKILL.md) | 研究技能：同一条回复内先摘要再深度分析 |

## 推荐阅读顺序

| 步骤 | 文件 | 关注点 |
|------|------|--------|
| 1 | [`src/types.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/types.ts) | `SkillDefinition.filePath` 字段 |
| 2 | [`skills/greet/SKILL.md`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/skills/greet/SKILL.md) | SKILL.md 格式：frontmatter + Markdown 指令 |
| 3 | [`src/registry.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/registry.ts) | `parseSkillFile` 保存 `filePath` |
| 4 | [`src/prompt.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/prompt.ts) | 🔑 XML 注入 + 强制扫描指令 |
| 5 | [`src/tools.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/tools.ts) | `read_file` 工具：懒加载的执行者 |
| 6 | [`src/executor.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/executor.ts) | Agentic Loop，无 skill 工具包装 |
| 7 | [`src/index.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/index.ts) | 完整流程串联 |

## 运行

```bash
# 安装依赖
npm install

# Mock 模式（不需要 API key）
npm run dev

# OpenAI 兼容 API
OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.openai.com/v1 OPENAI_MODEL=gpt-4o npm run dev

# 自定义服务（DeepSeek、Ollama 等）
OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.deepseek.com/v1 OPENAI_MODEL=deepseek-chat npm run dev

# Ollama 本地模型（无需 API key）
OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=qwen2.5 npm run dev
```

**环境变量：**

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 否 | API 密钥，不设则进入 Mock 模式 |
| `OPENAI_BASE_URL` | 否 | 自定义 API 地址 |
| `OPENAI_MODEL` | 否 | 模型名称，默认 `gpt-4o-mini` |

## 示例交互

```
你> 你好
  📤 [第 0 轮] LLM 扫描 available_skills XML 列表
  📥 LLM 调用 read_file → skills/greet/SKILL.md
  📤 [第 1 轮] LLM 读取到 greet 指令，调用 get_time
  📥 get_time() → 2026-03-22T09:27:00.000Z
  📤 [第 2 轮] LLM 生成最终回复

助手> 早上好！现在是 9:27，希望你今天有个美好的开始！

你> 帮我总结：人工智能正在改变软件开发...
  📤 LLM 扫描列表，匹配 summarize skill
  📥 read_file → skills/summarize/SKILL.md

助手> 摘要：...

你> 帮我深度分析：深度学习在 NLP 的应用...
  📤 LLM 匹配 research skill
  📥 read_file → skills/research/SKILL.md
  （同一条回复内先写短摘要，再写主题、情绪与追问）

助手> 研究分析完成：摘要 + 深度分析 + 后续问题
```

## OpenClaw 源码对照

| 本项目 | 对应 OpenClaw 源码 | 说明 |
|--------|-------------------|------|
| [`src/prompt.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/prompt.ts) | [`src/agents/skills/workspace.ts` → `buildWorkspaceSkillsPrompt`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/workspace.ts) | XML 注入 system prompt，`compactSkillPaths` 压缩路径节省 token |
| [`src/registry.ts`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/registry.ts) | [`src/agents/skills/frontmatter.ts` → `parseFrontmatter`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/frontmatter.ts) | 解析 SKILL.md frontmatter 元数据 |
| [`src/types.ts` → `SkillDefinition.filePath`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/types.ts) | [`src/agents/skills/types.ts` → `SkillEntry`](https://github.com/openclaw/openclaw/blob/v2026.3.13-1/src/agents/skills/types.ts) | Skill 数据模型，`filePath` 是懒加载的关键 |
| [`src/tools.ts` → `read_file`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/src/tools.ts) | OpenClaw 内置 `Read` 工具 | LLM 按需读取 SKILL.md 完整指令 |
| [`skills/*/SKILL.md`](https://github.com/myronzhangweb3/llm-skills-test/blob/main/skills/greet/SKILL.md) | [`skills/**/SKILL.md`](https://github.com/openclaw/openclaw/tree/v2026.3.13-1/skills) | frontmatter 元数据 + Markdown 指令体 |

## 练习

1. **新增 Skill**：创建 `skills/translate/SKILL.md`，让 LLM 翻译用户输入的文本
2. **新增工具**：在 `tools.ts` 中添加 `web_search` 工具，让 research skill 能联网搜索
3. **Skill 描述优化**：修改 SKILL.md 中的 `description` 字段，观察 LLM 触发准确率的变化
4. **链式调用**：仿照 research skill，创建一个调用多个其他 Skill 的复合 Skill
