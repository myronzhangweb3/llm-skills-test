/**
 * ============================================================================
 * 📍 生命周期位置：第 7 阶段 — 状态管理
 * ============================================================================
 *
 * Skill 执行过程中需要在多轮对话间保持数据。State 就是一个简单的 KV 存储。
 *
 * 核心思想：Skill 通过 write_state/read_state 工具来持久化数据，
 * 这样一个 Skill 写入的数据，另一个 Skill 可以读取（实现 Skill 间通信）。
 *
 * 💡 在 OMC 中，状态存储在 .omc/state/ 目录下的 JSON 文件：
 *    - state_write(mode, state) → 写入 .omc/state/{mode}-state.json
 *    - state_read(mode) → 读取对应文件
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface StateStore {
  read: (key: string) => unknown;
  write: (key: string, value: unknown) => void;
  clear: (key: string) => void;
  list: () => string[];
}

const STATE_FILE = ".skill-state.json";

export function createStateStore(baseDir: string = "."): StateStore {
  // 内存存储 + 文件持久化
  const store = new Map<string, unknown>();
  const filePath = join(baseDir, STATE_FILE);

  // 启动时从文件恢复（如果存在）
  if (existsSync(filePath)) {
    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      for (const [k, v] of Object.entries(data)) store.set(k, v);
    } catch { /* 文件损坏则忽略，从空状态开始 */ }
  }

  // 每次写入后同步到文件
  function persist() {
    const obj = Object.fromEntries(store);
    writeFileSync(filePath, JSON.stringify(obj, null, 2));
  }

  return {
    read(key) { return store.get(key) ?? null; },
    write(key, value) { store.set(key, value); persist(); },
    clear(key) { store.delete(key); persist(); },
    list() { return [...store.keys()]; },
  };
}
