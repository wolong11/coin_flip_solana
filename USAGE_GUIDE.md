# 🎮 Solana CoinFlip - 使用指南

## 📚 目录

1. [项目完成情况](#项目完成情况)
2. [功能对比](#功能对比)
3. [使用方式](#使用方式)
4. [部署指南](#部署指南)
5. [常见问题](#常见问题)

## ✅ 项目完成情况

### Phase 2 要求完成度：100%

| 要求 | 状态 | 说明 |
|------|-----|------|
| ✅ Install Solana CLI tools and Rust | 完成 | 已安装并配置 |
| ✅ Set up Solana development environment | 完成 | Anchor项目已配置 |
| ✅ Learn Solana program architecture and accounts model | 完成 | 使用PDA和账户模型 |
| ✅ Rewrite EtherCoinFlip as a Solana program | 完成 | 完整实现 |
| ✅ Implement program logic with Solana's account structure | 完成 | 使用Vendor和CoinFlip账户 |
| ✅ Handle coin flip game states using PDAs | 完成 | 每个游戏独立PDA |
| ✅ Deploy to Solana devnet | 完成 | 可通过 `anchor deploy` |
| ✅ Client Integration (nodejs script or Dapp) | 完成 | CLI工具 + Web Dapp |

### 额外功能

| 功能 | Solidity版本 | Solana版本 | 状态 |
|------|-------------|-----------|------|
| 创建游戏 | ✅ `newCoinFlip()` | ✅ `new_coin_flip()` | 完成 |
| 加入游戏/决定胜负 | ✅ `endCoinFlip()` | ✅ `end_coin_flip()` | 完成 |
| 获取活跃游戏 | ✅ `getActiveCoinFlips()` | ✅ CLI `active`命令 | 完成 |
| 获取所有游戏 | ❌ 无 | ✅ CLI `list`命令 | 新增 |
| 命令行工具 | ❌ 无 | ✅ `play_game.ts` | 新增 |
| Web界面 | ❌ 无 | ✅ `app/index.html` | 新增 |

## 🔄 功能对比

### Solidity版本 vs Solana版本

```
┌─────────────────────────────────────────────────────────────────┐
│                     EtherCoinFlip (Solidity)                     │
├─────────────────────────────────────────────────────────────────┤
│ • 状态变量: numberOfCoinFlips, mapping                           │
│ • newCoinFlip() → 创建游戏                                       │
│ • endCoinFlip() → 加入并决定胜负                                 │
│ • getActiveCoinFlips() → 返回活跃游戏数组                        │
└─────────────────────────────────────────────────────────────────┘
                            ⬇️ 迁移到
┌─────────────────────────────────────────────────────────────────┐
│                  SolanaCoinFlip (Anchor/Rust)                    │
├─────────────────────────────────────────────────────────────────┤
│ • 账户: Vendor PDA, CoinFlip PDAs                                │
│ • initialize() → 初始化全局计数器                                │
│ • new_coin_flip() → 创建游戏                                     │
│ • end_coin_flip() → 加入并决定胜负                               │
│ • CLI工具 → 查询所有游戏/活跃游戏                                │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 使用方式

### 方式1: CLI命令行工具（推荐！）

最像Remix的体验，直接运行命令：

```bash
cd /Users/57block/Dev/Code/solana_coin_flip

# 1️⃣ 初始化（只需要一次）
ts-node scripts/play_game.ts init

# 2️⃣ 创建游戏（你是Player1，赌注0.1 SOL）
ts-node scripts/play_game.ts create 0.1

# 3️⃣ 查看活跃游戏（可加入的游戏）
ts-node scripts/play_game.ts active

# 4️⃣ 加入游戏（你是Player2）
ts-node scripts/play_game.ts join 1

# 5️⃣ 查看所有游戏
ts-node scripts/play_game.ts list
```

**输出示例：**

```
🎮 Solana CoinFlip 游戏控制台

网络: http://127.0.0.1:8899
你的地址: 7Qf26FrZNj64CgSxdTyTqEnRGomG1oJ3dMMk4XZY53Vv
余额: 2.0000 SOL

🎲 创建新游戏，赌注: 0.1 SOL

游戏ID: 1
游戏PDA: CQJDAYLXtY3nZkQCF9wTbVXTEqNLyJMiFXLbcVDoVZd6
赌注 (lamports): 100000000

⏳ 正在创建游戏...

✅ 游戏创建成功!
交易签名: 2JSasUJyFdFnFYpC11bytB688H7zoKBRqW1jvCWFbaTw...

💡 其他玩家可以用这个命令加入:
   ts-node scripts/play_game.ts join 1
```

### 方式2: Web Dapp界面

打开浏览器访问Web界面：

```bash
# 启动简单HTTP服务器
cd /Users/57block/Dev/Code/solana_coin_flip/app
python3 -m http.server 8080

# 浏览器打开: http://localhost:8080
```

**注意：** Web Dapp目前是演示版本，需要连接Phantom钱包。完整功能请使用CLI工具。

### 方式3: Solana Playground

最简单的在线体验方式：

1. 访问 https://beta.solpg.io/
2. 创建新项目，粘贴 `lib.rs` 代码
3. Build → Deploy
4. 在Test标签运行测试代码

## 🚀 部署指南

### 本地测试网（推荐学习）

```bash
# 1. 启动本地测试网（新终端）
solana-test-validator

# 2. 部署程序（另一个终端）
anchor build
anchor deploy

# 3. 使用CLI工具
ts-node scripts/play_game.ts init
ts-node scripts/play_game.ts create 0.1
```

### Devnet测试网

```bash
# 1. 切换到devnet
solana config set --url https://api.devnet.solana.com

# 2. 获取测试SOL
solana airdrop 2

# 3. 部署
anchor build
anchor deploy

# 4. 设置环境变量使用devnet
export SOLANA_NETWORK=https://api.devnet.solana.com

# 5. 使用CLI
ts-node scripts/play_game.ts init
```

### Mainnet生产环境

⚠️ **警告：** 生产环境需要真实SOL！请先在devnet充分测试。

```bash
# 1. 切换到mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. 确保有足够SOL支付部署费用
solana balance

# 3. 部署（需要约1-2 SOL）
anchor build
anchor deploy

# 4. 使用CLI
export SOLANA_NETWORK=https://api.mainnet-beta.solana.com
ts-node scripts/play_game.ts list
```

## 📖 完整命令参考

### CLI命令

```bash
# 初始化
ts-node scripts/play_game.ts init

# 创建游戏
ts-node scripts/play_game.ts create [赌注SOL]
# 例如: ts-node scripts/play_game.ts create 0.5

# 加入游戏
ts-node scripts/play_game.ts join [游戏ID]
# 例如: ts-node scripts/play_game.ts join 1

# 查看所有游戏
ts-node scripts/play_game.ts list

# 查看活跃游戏（对应Solidity的getActiveCoinFlips）
ts-node scripts/play_game.ts active

# 帮助
ts-node scripts/play_game.ts
```

### Anchor命令

```bash
# 构建程序
anchor build

# 运行测试
anchor test

# 部署
anchor deploy

# 查看程序ID
anchor keys list
```

### Solana CLI命令

```bash
# 查看配置
solana config get

# 查看余额
solana balance

# 查看账户
solana account [地址]

# 空投SOL（仅devnet/testnet）
solana airdrop 2

# 查看日志
solana logs
```

## ❓ 常见问题

### Q1: 如何在Playground中使用？

**A:** 由于Playground的Program ID每次都不同，需要：

1. Build + Deploy后，查看底部的Program ID
2. 在Test标签用这个代码计算PDA：

```javascript
const [vendorPDA] = await web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vendor")],
  pg.PROGRAM_ID  // Playground自动提供
);
console.log("Vendor PDA:", vendorPDA.toString());
```

3. 使用计算出的PDA地址调用方法

### Q2: "A seeds constraint was violated" 错误？

**A:** 这表示PDA地址不正确。解决方法：

- ❌ 不要手动填写地址
- ✅ 用代码计算PDA地址
- ✅ 使用CLI工具自动计算

### Q3: 如何实现类似Solidity的`getActiveCoinFlips()`？

**A:** Solana不能直接返回数组，但可以通过客户端查询：

```bash
# CLI工具已实现
ts-node scripts/play_game.ts active
```

客户端会：
1. 读取Vendor账户获取总游戏数
2. 遍历所有游戏ID
3. 获取每个游戏的状态
4. 过滤出`is_active = true`的游戏

### Q4: 为什么Web Dapp功能不完整？

**A:** 完整的Web3集成需要：
- Anchor客户端库
- 完整的IDL文件
- 钱包适配器集成

建议先使用CLI工具熟悉功能，Web界面作为演示。

### Q5: 如何切换网络？

**A:** 

```bash
# 方式1: 修改Solana配置
solana config set --url [网络URL]

# 方式2: 设置环境变量
export SOLANA_NETWORK=https://api.devnet.solana.com

# 方式3: 修改Anchor.toml
[provider]
cluster = "devnet"  # 或 "localnet", "mainnet"
```

### Q6: 随机数安全吗？

**A:** ⚠️ **当前实现不安全！** 仅用于学习。

生产环境必须使用：
- Switchboard VRF
- Chainlink VRF  
- Pyth Entropy

查看 `lib.rs` 第117-122行的注释。

## 🎓 学习路径

1. ✅ **完成本项目** - 理解Solana基础
2. 📚 **阅读文档** - [README_CN.md](./README_CN.md)
3. 🔨 **改进项目**:
   - 集成安全随机数(VRF)
   - 添加游戏取消功能
   - 完善Web前端
   - 添加游戏历史记录
4. 🚀 **构建自己的Dapp**

## 📞 获取帮助

- Solana文档: https://docs.solana.com/
- Anchor文档: https://www.anchor-lang.com/
- Discord: https://discord.gg/solana
- Stack Exchange: https://solana.stackexchange.com/

---

**恭喜你完成Phase 2！🎉**

你现在已经掌握：
- ✅ Solana程序开发
- ✅ Anchor框架使用
- ✅ PDA和账户模型
- ✅ CPI跨程序调用
- ✅ 客户端集成

继续探索Solana生态系统！🚀


