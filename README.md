# LLM Skill System MVP

> 通过阅读源码理解 LLM Skill 的完整生命周期。以 [oh-my-claudecode](https://github.com/nicekid1/oh-my-claudecode) 为蓝本的最小化实现。

## 什么是 Skill？

**Skill 就是一段被动态注入到 LLM System Prompt 中的指令文本。** 没有魔法，没有特殊协议。当用户输入触发了某个 Skill，系统把 Skill 的 prompt 模板拼接到 system prompt 里，LLM 读到这段指令后就会按要求行动。

## 架构图

```
用户输入 "hello there"
    │
    ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│ trigger   │────>│  prompt   │────>│ executor │
│ 触发匹配  │     │ Prompt拼接│     │ LLM执行  │
│           │     │           │     │ +工具循环 │
└──────────┘     └──────────┘     └────┬─────┘
    ▲                                   │
    │                                   ▼
┌──────────┐                      ┌──────────┐
│ registry  │◄─────────────────────│  tools   │
│ Skill注册 │   invoke_skill       │ 工具系统  │
└──────────┘   (递归重入)          └────┬─────┘
                                       │
                                  ┌────▼─────┐
                                  │  state   │
                                  │ 状态存储  │
                                  └──────────┘
```

## 8 个生命周期阶段

| 阶段 | 文件 | 一句话解释 |
|------|------|-----------|
| 1. Skill 定义 | `skills/*/SKILL.md` | YAML 元数据 + Markdown prompt 模板 |
| 2. Skill 发现 | `src/registry.ts` | 扫描目录 → 解析 frontmatter → 构建 Map |
| 3. 触发匹配 | `src/trigger.ts` | 清洗输入 → 关键词匹配 → 优先级排序 |
| 4. Prompt 拼接 | `src/prompt.ts` | 将 Skill 模板包裹在标签中注入 system prompt |
| 5. LLM 执行 | `src/executor.ts` | API 调用 → 检查 tool_use → 执行 → 循环 |
| 6. 工具调用 | `src/tools.ts` | get_time / read_state / write_state / invoke_skill |
| 7. 状态管理 | `src/state.ts` | 内存 Map + JSON 文件持久化 |
| 8. 链式调用 | `src/tools.ts` | invoke_skill 递归重入同一条执行路径 |

## 推荐阅读顺序

```
types.ts          → 理解数据模型（Skill/Tool/Message 长什么样）
  ↓
skills/greet/     → 理解 Skill 文件格式（YAML + Markdown）
  ↓
registry.ts       → 理解系统如何发现和加载 Skill
  ↓
trigger.ts        → 理解用户输入如何匹配到 Skill
  ↓
prompt.ts         → 🔑 理解核心机制：Skill = 动态注入的 prompt
  ↓
tools.ts          → 理解 LLM 可调用的工具，尤其是 invoke_skill
  ↓
state.ts          → 理解 Skill 间如何通过状态共享数据
  ↓
executor.ts       → 理解 Agentic Loop（发送→工具调用→循环）
  ↓
index.ts          → 看完整流程如何串联在一起
```

## 运行

```bash
# 安装依赖
npm install

# Mock 模式（不需要 API key，模拟工具调用流程）
npm run dev

# OpenAI 模式
OPENAI_API_KEY=sk-xxx npm run dev

# 自定义 baseURL（对接 DeepSeek、Ollama、vLLM 等兼容服务）
OPENAI_API_KEY=sk-xxx OPENAI_BASE_URL=https://api.deepseek.com/v1 OPENAI_MODEL=deepseek-chat npm run dev

# Ollama 本地模型（无需 API key）
OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_MODEL=qwen2.5 npm run dev
```

**环境变量说明：**

| 变量 | 必填 | 说明 |
|------|------|------|
| `OPENAI_API_KEY` | 否 | API 密钥，不设则进入 Mock 模式 |
| `OPENAI_BASE_URL` | 否 | 自定义 API 地址，不设则用 OpenAI 默认 |
| `OPENAI_MODEL` | 否 | 模型名称，默认 `gpt-4o-mini` |

## 示例交互

```
You> hello
  ⚡ 触发 Skill: greet (关键词: "hello")
  🔧 Tool: get_time() → 2026-03-22T10:30:00.000Z

Assistant> Good morning! It's 10:30 AM — hope you're having a great day!

You> summarize 这是一段关于人工智能的文本...
  ⚡ 触发 Skill: summarize (关键词: "summarize")
  🔧 Tool: write_state("last_summary", ...) → 已保存

Assistant> 摘要: ...（已保存到 state）

You> research 这是一段关于人工智能的文本...
  ⚡ 触发 Skill: research (关键词: "research")
  🔗 链式调用: invoke_skill("summarize", ...)
  🔧 Tool: read_state("last_summary") → {...}

Assistant> 研究分析完成: ...
```

## 与 OMC 真实实现的对照

每个源文件头部都标注了在 OMC 中的对应实现位置。关键对照：

| 本项目 | OMC 真实实现 |
|--------|-------------|
| `registry.ts` | `skill-injector.mjs` + `src/features/builtin-skills/skills.ts` |
| `trigger.ts` | `hooks/keyword-detector/index.ts` |
| `prompt.ts` | `skill-injector.mjs`（注入 `<system-reminder>` 标签） |
| `executor.ts` | Claude Code CLI 主循环 |
| `tools.ts` | MCP Server + Built-in Tools |
| `state.ts` | `state_read` / `state_write` MCP tools |

## 练习

读完代码后，试试这些练习来验证你的理解：

1. **新增 Skill**: 创建 `skills/translate/SKILL.md`，让它翻译用户输入的文本
2. **新增工具**: 在 `tools.ts` 中添加一个 `word_count` 工具
3. **优先级排序**: 修改 `trigger.ts`，实现类似 OMC 的硬编码优先级而非位置排序
4. **Hook 系统**: 仿照 OMC，将 trigger 检测从同步调用改为 hook 事件驱动
