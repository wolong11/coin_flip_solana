# 测试故障排除指南

## 🐛 问题：第二次运行测试时全部超时

### 症状
```
TransactionExpiredTimeoutError: Transaction was not confirmed in 30.00 seconds
```

### 原因
当您连续运行测试时，Solana 本地验证器可能会遇到以下问题：
1. **验证器卡住** - 处理太多交易后卡住
2. **账户状态冲突** - 之前的测试账户状态未清理
3. **Blockhash 缓存** - 旧的 blockhash 导致交易失败
4. **资源耗尽** - 验证器占用太多内存

---

## ✅ 解决方案（按顺序尝试）

### 方案 1：重启验证器（最简单，推荐）⭐

```bash
# 步骤 1：停止当前验证器
# 按 Ctrl+C 在运行 solana-test-validator 的终端中

# 步骤 2：重新启动
solana-test-validator --reset

# 步骤 3：在另一个终端运行测试
anchor test --skip-local-validator
```

**为什么有效：** `--reset` 标志会清除所有之前的状态，给您一个干净的环境。

---

### 方案 2：杀死验证器进程并重启

如果验证器没有响应 Ctrl+C：

```bash
# 查找验证器进程
ps aux | grep solana-test-validator

# 或使用
pgrep -f solana-test-validator

# 杀死进程（替换 <PID> 为实际进程 ID）
kill <PID>

# 如果进程仍然存在，强制杀死
kill -9 <PID>

# 重新启动验证器
solana-test-validator --reset
```

---

### 方案 3：完整清理并重启

完全清除验证器数据：

```bash
# 停止验证器
pkill -9 solana-test-validator

# 删除验证器数据目录
rm -rf test-ledger/

# 重新启动
solana-test-validator

# 运行测试
anchor test --skip-local-validator
```

---

### 方案 4：增加超时时间（治标不治本）

如果网络确实很慢，可以增加超时：

修改测试代码中的提供者配置：

```typescript
// 在测试文件顶部
const provider = anchor.AnchorProvider.env();
provider.opts.skipPreflight = false;
provider.opts.commitment = "confirmed";
// 增加超时到 60 秒
provider.opts.preflightCommitment = "confirmed";
```

---

## 🎯 最佳实践（避免此问题）

### 1. 每次测试前重置验证器

```bash
# 始终使用 --reset 标志
solana-test-validator --reset
```

### 2. 使用 Anchor 的完整测试命令

```bash
# 这会自动启动和清理验证器
anchor test

# 或者在两次运行之间等待几秒
anchor test --skip-local-validator
sleep 3
anchor test --skip-local-validator
```

### 3. 定期清理

```bash
# 每天或每周清理一次
rm -rf test-ledger/
rm -rf .anchor/
```

---

## 🔍 诊断检查清单

运行测试前检查这些：

```bash
# ✅ 1. 验证器是否在运行？
pgrep -f solana-test-validator

# ✅ 2. 端口 8899 是否可用？
lsof -i :8899

# ✅ 3. 可以连接到验证器吗？
solana cluster-version --url http://127.0.0.1:8899

# ✅ 4. 账户是否有余额？
solana balance --url http://127.0.0.1:8899

# ✅ 5. 最近的区块是否在生成？
solana block-height --url http://127.0.0.1:8899
```

---

## 💡 快速修复命令

### 一键重置并运行测试

```bash
# 杀死旧进程，重启验证器，运行测试
pkill solana-test-validator; \
sleep 2; \
solana-test-validator --reset > /dev/null 2>&1 & \
sleep 5; \
anchor test --skip-local-validator
```

### 创建测试脚本

创建 `run-tests.sh`：

```bash
#!/bin/bash

echo "🧹 Cleaning up old validator..."
pkill solana-test-validator
sleep 2

echo "🚀 Starting fresh validator..."
solana-test-validator --reset > /tmp/validator.log 2>&1 &
VALIDATOR_PID=$!

echo "⏳ Waiting for validator to start..."
sleep 5

echo "🧪 Running tests..."
anchor test --skip-local-validator

echo "🛑 Stopping validator..."
kill $VALIDATOR_PID

echo "✅ Done!"
```

使用：
```bash
chmod +x run-tests.sh
./run-tests.sh
```

---

## 🚨 常见错误及解决方案

### Error: "Connection refused"
**原因：** 验证器未运行
**解决：** 启动验证器 `solana-test-validator`

### Error: "Account not found"
**原因：** 账户状态未清理
**解决：** 使用 `--reset` 重启验证器

### Error: "Blockhash not found"
**原因：** 缓存的 blockhash 过期
**解决：** 重启验证器

### Error: "Transaction simulation failed"
**原因：** 账户余额不足或程序错误
**解决：** 检查账户余额和程序逻辑

---

## 📚 相关资源

- [Solana Test Validator 文档](https://docs.solana.com/developing/test-validator)
- [Anchor 测试指南](https://www.anchor-lang.com/docs/testing)
- [Solana 常见问题](https://solana.com/docs/debugging)

---

## 🎯 您当前的问题

**观察到的行为：**
- 第一次运行：✅ 14个测试全部通过
- 第二次运行：❌ 所有测试超时

**最可能的原因：** 验证器卡住或状态冲突

**推荐解决方案：**

1. **立即尝试：** 在运行验证器的终端按 `Ctrl+C`，然后运行：
   ```bash
   solana-test-validator --reset
   ```

2. **然后在另一个终端：**
   ```bash
   anchor test --skip-local-validator
   ```

3. **如果还是不行：**
   ```bash
   pkill -9 solana-test-validator
   rm -rf test-ledger/
   solana-test-validator --reset
   ```

这应该能解决您的问题！🎉

