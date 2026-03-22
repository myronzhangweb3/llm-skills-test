# Deep Interview Spec: LLM Skill 生命周期源码级拆解教学

## Metadata
- Interview ID: skills-learning-20260322
- Rounds: 4
- Final Ambiguity Score: 16%
- Type: greenfield (教学/学习场景)
- Generated: 2026-03-22
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.9 | 40% | 0.36 |
| Constraint Clarity | 0.85 | 30% | 0.255 |
| Success Criteria | 0.75 | 30% | 0.225 |
| **Total Clarity** | | | **0.84** |
| **Ambiguity** | | | **16%** |

## Goal
以 oh-my-claudecode (OMC) 的 skill 系统为实例，通过源码级逐行拆解的方式，教会一位有 agent 框架经验的开发者理解 LLM Skill 的完整生命周期（定义 → 注册 → 触发 → prompt 拼接 → 执行 → 输出），使其达到能独立设计 skill 系统架构的水平。

## Constraints
- 学习者背景：有 agent 框架经验的开发者，了解 system prompt 注入、tool use、hook 等机制
- 教学形式：源码级逐行拆解，以一个具体 skill 为例跟踪全流程
- 拆解对象：oh-my-claudecode 的 skill 系统（当前运行环境中的真实系统）
- 语言：中文为主
- 深度：底层原理级，不是使用教程

## Non-Goals
- 不是教如何使用 Claude Code 的用户指南
- 不是 OMC 的安装/配置教程
- 不需要覆盖所有 OMC 功能，只聚焦 skill 机制

## Acceptance Criteria
- [ ] 能解释 skill 文件的结构和每个字段的作用
- [ ] 能画出 skill 从用户输入到执行完成的完整数据流图
- [ ] 能解释 hook 系统如何拦截用户输入并触发 skill
- [ ] 能解释 prompt 拼接过程：skill 模板如何与上下文合并
- [ ] 能解释 skill 与 agent、tool 的关系和边界
- [ ] 能识别 skill 系统的关键设计决策（为什么这么设计）
- [ ] 能提出自己设计 skill 系统时的架构方案

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| 需要达到"能设计系统"的深度 | Contrarian: 先理解一个现有系统是否更实际？ | 坚持要达到设计级理解，但以拆解现有系统为路径 |
| 系统分析文档是最佳形式 | 提供了三种选项 | 选择源码级逐行拆解，比文档更深入 |

## Technical Context
- 拆解目标：OMC skill 系统
- Skill 文件位置：`~/.claude/plugins/cache/omc/oh-my-claudecode/4.8.0/skills/`
- 核心组件：skill .md 文件（prompt 模板）、hooks（触发机制）、Skill tool（调用接口）
- 运行环境：Claude Code CLI + OMC plugin

## Ontology (Key Entities)
| Entity | Fields | Relationships |
|--------|--------|---------------|
| Skill | name, trigger_patterns, prompt_template, steps, tool_usage | 被 Hook 触发，被 Skill Tool 调用 |
| Hook | event_type, trigger_condition, action | 拦截用户输入，注入 system-reminder |
| Skill Tool | skill_name, args | 调用 Skill 的接口 |
| Agent | subagent_type, model, tools | Skill 可委派给 Agent 执行 |
| System Prompt | sections, injections | Skill 内容被拼接进 system prompt |

## Interview Transcript
<details>
<summary>Full Q&A (4 rounds)</summary>

### Round 1
**Q:** 当你说「想知道 LLM 是怎么使用 skill 的」，你具体指的是哪个层面？
**A:** Skill 的完整生命周期
**Ambiguity:** 64% (Goal: 0.6, Constraints: 0.2, Criteria: 0.2)

### Round 2
**Q:** 你目前对 LLM 和 Claude Code 的了解程度是？
**A:** 有 agent 框架经验（+ 补充：我是一名开发者，需要了解底层原理）
**Ambiguity:** 48% (Goal: 0.7, Constraints: 0.6, Criteria: 0.2)

### Round 3
**Q:** 学完之后，你希望达到什么水平？
**A:** 能设计 skill 系统
**Ambiguity:** 27% (Goal: 0.85, Constraints: 0.6, Criteria: 0.7)

### Round 4 (Contrarian Mode)
**Q:** 你喜欢什么样的学习方式？（附 Contrarian 挑战：你真的需要达到「能设计 skill 系统」的程度吗？）
**A:** 源码级逐行拆解
**Ambiguity:** 16% (Goal: 0.9, Constraints: 0.85, Criteria: 0.75)

</details>
