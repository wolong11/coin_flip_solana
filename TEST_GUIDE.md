# Coin Flip Solana - 测试指南

## 概述

这个综合测试套件涵盖了 Solana Coin Flip 智能合约的所有方面，包括：

1. **功能测试** - 正常的游戏流程和操作
2. **错误处理测试** - 各种错误场景和验证
3. **边界条件测试** - 边界条件和压力测试
4. **性能和 Gas 分析** - 交易成本和优化指标

## 前置要求

- 已安装 Solana CLI 工具
- Anchor 框架（v0.32.1+）
- Node.js 和 Yarn/NPM
- 钱包中有足够的 SOL 用于测试部署

## 运行测试

### 方式 1：运行所有测试（推荐）

```bash
# 在一个终端启动本地验证器
solana-test-validator

# 在另一个终端运行测试
anchor test --skip-local-validator
```

### 方式 2：运行带详细日志的测试

```bash
# 启动本地验证器
solana-test-validator

# 运行带完整日志的测试
ANCHOR_LOG=true anchor test --skip-local-validator
```

### 方式 3：运行特定测试类别

```bash
# 仅功能测试
anchor test --skip-local-validator -- --grep "Functional Tests"

# 仅错误处理测试
anchor test --skip-local-validator -- --grep "Error Handling"

# 仅边界条件测试
anchor test --skip-local-validator -- --grep "Edge Case"

# 仅性能测试
anchor test --skip-local-validator -- --grep "Performance"
```

## 测试覆盖

### 1. 功能测试（7个测试）

- ✅ 创建新的抛硬币游戏
- ✅ 结束游戏并宣布获胜者
- ✅ 使用不同 nonce 的多个游戏
- ✅ 相同 nonce 的不同玩家
- ✅ 余额变化验证
- ✅ 游戏状态转换
- ✅ 胜负者判定

### 2. 错误处理测试（3个测试）

- ❌ 拒绝重复结束已完成的游戏
- ❌ 拒绝超出 ±1% 范围的赌注
- ❌ 拒绝无效的 PDA 种子

### 3. 边界条件测试（6个测试）

- 🔍 最小赌注（1 lamport）
- 🔍 大额赌注（1+ SOL）
- 🔍 99% 边界处的赌注
- 🔍 101% 边界处的赌注
- 🔍 多个并发游戏（10+ 个游戏）
- 🔍 压力测试

### 4. 性能和 Gas 分析（2个测试）

- 📊 不同赌注金额的 Gas 费用
- 📊 账户租金成本分析
- 📊 计算单元测量
- 📊 交易费用跟踪

## 性能报告

运行测试后，会在以下位置生成详细的性能报告：

```
test-results/performance-report.json
```

### 报告内容

```json
{
  "summary": {
    "totalTests": 25,
    "averageCreateGameFee": 5000,
    "averageEndGameFee": 5000,
    "averageCreateGameComputeUnits": 15000,
    "averageEndGameComputeUnits": 20000,
    "totalFees": 125000,
    "generatedAt": "2024-01-01T00:00:00.000Z"
  },
  "transactions": [
    {
      "label": "创建游戏 (0.1 SOL)",
      "signature": "...",
      "fee": 5000,
      "computeUnitsConsumed": 15000,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 理解测试结果

### 成功指标

- ✅ 所有测试通过
- 📊 性能指标已生成
- 💰 Gas 费用合理（每笔交易 < 10,000 lamports）
- 🎯 计算单元在限制范围内

### 良好性能的标准

**目标指标（Solana）：**
- 创建游戏：约 5,000 lamports（按 $150/SOL 计算约 $0.000075）
- 结束游戏：约 5,000 lamports
- 计算单元：每笔交易 < 200,000

**与以太坊对比：**
- 以太坊 gas：约 50,000 - 100,000 gas 单位
- 按 50 gwei 计算：每笔交易 $2.50 - $5.00
- **Solana 便宜约 30,000 倍！**

## 优化建议

根据测试结果，考虑：

1. **账户大小**：当前 CoinFlip 账户为 154 字节
   - 最小大小 = 更低的租金成本
   - 考虑移除未使用的字段

2. **计算单元**：监控高消耗
   - 当前实现应使用 < 20,000 CU
   - 如果持续高于 50,000 CU 则需优化

3. **交易批处理**：对于多个游戏
   - 尽可能批量创建游戏
   - 减少总体交易数量

## 故障排除

### 测试启动失败

```bash
# 重置测试验证器
solana-test-validator --reset

# 清理并重建
anchor clean
anchor build
anchor test --skip-local-validator
```

### 余额不足

```bash
# 在本地网络空投到您的钱包
solana airdrop 10

# 在 devnet 上
solana airdrop 2 --url devnet
```

### 账户已存在

```bash
# 在每次测试运行之间使用不同的 nonce
# 或在运行之间重置验证器
solana-test-validator --reset
```

## CI/CD 集成

在 CI/CD 管道中运行测试：

```yaml
# GitHub Actions 工作流示例
- name: 安装 Solana
  run: |
    sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    
- name: 安装 Anchor
  run: |
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli
    
- name: 运行测试
  run: |
    anchor test
```

## 下一步

成功运行测试后：

1. 查看 `test-results/performance-report.json`
2. 将指标与项目要求进行比较
3. 根据发现进行必要的优化
4. 记录所做的任何权衡
5. 考虑添加与前端的集成测试

## 有问题？

- 查看 `tests/coin_flip_comprehensive.ts` 中的测试代码
- 查阅 Anchor 文档：https://www.anchor-lang.com
- Solana 文档：https://docs.solana.com
