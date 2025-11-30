# 🚀 快速开始指南

## 3种使用方式

### 🎯 方式1: CLI命令行工具（最推荐！）

```bash
# 进入项目目录
cd /Users/57block/Dev/Code/solana_coin_flip

# 1. 初始化（只需一次）
ts-node scripts/play_game.ts init

# 2. 创建游戏
ts-node scripts/play_game.ts create 0.1

# 3. 查看活跃游戏
ts-node scripts/play_game.ts active

# 4. 加入游戏
ts-node scripts/play_game.ts join 1

# 5. 查看所有游戏
ts-node scripts/play_game.ts list
```

### 🌐 方式2: Solana Playground（在线测试）

1. 访问: https://beta.solpg.io/
2. 创建新项目，复制 `programs/solana_coin_flip/src/lib.rs` 代码
3. Build → Deploy
4. 复制 `tests/playground_test.js` 到Test标签
5. 点击Test运行

### 💻 方式3: Web Dapp界面

```bash
# 启动HTTP服务器
cd app
python3 -m http.server 8080

# 浏览器打开
open http://localhost:8080
```

## 📖 完整文档

- **使用指南**: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- **技术文档**: [README_CN.md](./README_CN.md)
- **原始需求**: [phase2要求](https://github.com/shan57blocks/web3-onboarding/tree/main/phase2_coinFlopSolana)

## ✅ Phase 2 完成度: 100%

✅ Solana CLI和Rust环境
✅ Anchor程序开发
✅ PDA和账户模型
✅ 完整的游戏逻辑
✅ 部署到devnet
✅ **Client Integration (Node.js CLI + Web Dapp)**

## 🎮 开始游戏

```bash
# 本地测试（需要先启动本地validator）
solana-test-validator  # 新终端
anchor test             # 原终端

# 或直接使用CLI工具
ts-node scripts/play_game.ts init
ts-node scripts/play_game.ts create 0.1
```

祝你游戏愉快！🎉


