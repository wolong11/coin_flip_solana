# 🎮 Solana CoinFlip 游戏

[![Solana](https://img.shields.io/badge/Solana-Devnet-purple)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-0.32-blue)](https://anchor-lang.com)
[![Rust](https://img.shields.io/badge/Rust-1.75-orange)](https://rust-lang.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

从Ethereum Solidity迁移到Solana的去中心化抛硬币游戏。

[快速开始](./QUICKSTART.md) | [使用指南](./USAGE_GUIDE.md) | [中文教程](./README_CN.md) | [项目总结](./PROJECT_SUMMARY.md)

## ✨ 特性

- 🎲 **公平游戏**: 链上随机数决定胜负
- 💰 **即时结算**: 赢家立即获得全部奖金
- 🔒 **安全可靠**: Anchor框架 + PDA管理
- 🚀 **高性能**: Solana高速交易
- 🛠️ **完整工具**: CLI工具 + Web Dapp

## 📦 项目结构

```
solana_coin_flip/
├── programs/
│   └── solana_coin_flip/
│       └── src/
│           └── lib.rs              # 智能合约（271行）
├── scripts/
│   └── play_game.ts               # CLI工具
├── tests/
│   ├── solana_coin_flip.ts        # 自动化测试
│   └── playground_test.js         # Playground测试
├── app/
│   └── index.html                 # Web Dapp
├── README_CN.md                   # 中文技术文档
├── USAGE_GUIDE.md                 # 使用指南
├── QUICKSTART.md                  # 快速开始
└── PROJECT_SUMMARY.md             # 项目总结
```

## 🚀 快速开始

### 方式1: CLI工具（推荐）

```bash
# 克隆项目
cd /Users/57block/Dev/Code/solana_coin_flip

# 初始化
ts-node scripts/play_game.ts init

# 创建游戏（赌注0.1 SOL）
ts-node scripts/play_game.ts create 0.1

# 查看活跃游戏
ts-node scripts/play_game.ts active

# 加入游戏
ts-node scripts/play_game.ts join 1
```

### 方式2: Solana Playground

1. 访问 https://beta.solpg.io/
2. 复制 `programs/solana_coin_flip/src/lib.rs`
3. Build → Deploy → Test

### 方式3: Web Dapp

```bash
cd app
python3 -m http.server 8080
open http://localhost:8080
```

## 📖 文档

- **[快速开始](./QUICKSTART.md)** - 3分钟上手
- **[使用指南](./USAGE_GUIDE.md)** - 完整使用文档
- **[中文教程](./README_CN.md)** - 详细技术讲解
- **[项目总结](./PROJECT_SUMMARY.md)** - 完成度报告

## 🎯 Phase 2 完成度

| 要求 | 状态 |
|------|------|
| Install Solana CLI tools and Rust | ✅ |
| Set up Solana development environment | ✅ |
| Learn Solana program architecture | ✅ |
| Rewrite EtherCoinFlip as Solana program | ✅ |
| Implement with account structure | ✅ |
| Handle game states using PDAs | ✅ |
| Deploy to Solana devnet | ✅ |
| **Client Integration (Node.js/Dapp)** | ✅ |

**总完成度: 100% ✅**

## 🎮 游戏规则

1. **Player1** 创建游戏并质押SOL
2. **Player2** 加入游戏并质押相同数量SOL
3. 系统随机决定胜负（50/50概率）
4. 赢家获得全部SOL

## 🏗️ 技术栈

- **智能合约**: Rust + Anchor Framework
- **CLI工具**: TypeScript + @solana/web3.js
- **Web界面**: HTML + JavaScript
- **测试**: Anchor Test + Mocha

## 🛠️ 开发命令

```bash
# 构建
anchor build

# 测试
anchor test

# 部署到devnet
anchor deploy --provider.cluster devnet

# 使用CLI
ts-node scripts/play_game.ts [command]
```

## 📊 功能对比

| 功能 | Solidity | Solana |
|------|---------|--------|
| 创建游戏 | ✅ | ✅ |
| 加入游戏 | ✅ | ✅ |
| 查询活跃游戏 | ✅ | ✅ |
| CLI工具 | ❌ | ✅ |
| Web Dapp | ❌ | ✅ |

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📝 License

MIT License

## 👨‍💻 作者

57block Web3 Onboarding Project

## 🔗 相关链接

- [Solana官网](https://solana.com/)
- [Anchor文档](https://www.anchor-lang.com/)
- [Solana Playground](https://beta.solpg.io/)
- [原始需求](https://github.com/shan57blocks/web3-onboarding/tree/main/phase2_coinFlopSolana)

---

**🎉 恭喜完成Phase 2！继续探索Solana生态系统！** 🚀


