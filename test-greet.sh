#!/bin/bash
export OPENAI_API_KEY=hk-rzgh1a1000054580577c9c19d1578ee4761b63ff56371f41
export OPENAI_BASE_URL=https://api.openai-hk.com/v1
export OPENAI_MODEL=gpt-4o
echo "你好" | npx tsx src/index.ts
