#!/bin/bash

# 🔧 快速重置并运行测试
# 用法: ./quick-test.sh

echo "======================================"
echo "🧹 清理旧的测试环境..."
echo "======================================"

# 杀死所有 solana-test-validator 进程
pkill -9 solana-test-validator 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ 已停止旧的验证器"
else
    echo "ℹ️  没有发现运行中的验证器"
fi

# 等待进程完全停止
sleep 2

# 可选：删除测试账本数据（完全重置）
# rm -rf test-ledger/ 2>/dev/null

echo ""
echo "======================================"
echo "🚀 启动新的验证器..."
echo "======================================"

# 启动验证器（带 reset 标志）
solana-test-validator --reset > /tmp/validator.log 2>&1 &
VALIDATOR_PID=$!

echo "✅ 验证器已启动 (PID: $VALIDATOR_PID)"
echo "📝 日志文件: /tmp/validator.log"

# 等待验证器完全启动
echo ""
echo "⏳ 等待验证器初始化 (5秒)..."
for i in 5 4 3 2 1; do
    echo "   $i..."
    sleep 1
done

# 检查验证器是否正常运行
echo ""
echo "🔍 检查验证器状态..."
if curl -s http://127.0.0.1:8899 > /dev/null 2>&1; then
    echo "✅ 验证器正常运行"
else
    echo "❌ 验证器启动失败，请查看日志: /tmp/validator.log"
    exit 1
fi

echo ""
echo "======================================"
echo "🧪 运行测试..."
echo "======================================"
echo ""

# 运行测试
anchor test --skip-local-validator

TEST_EXIT_CODE=$?

echo ""
echo "======================================"
echo "🛑 清理..."
echo "======================================"

# 可选：测试后停止验证器
# kill $VALIDATOR_PID 2>/dev/null
# echo "✅ 已停止验证器"

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "======================================"
    echo "✅ 测试完成！所有测试通过！"
    echo "======================================"
else
    echo "======================================"
    echo "❌ 测试失败（退出代码: $TEST_EXIT_CODE）"
    echo "======================================"
    echo ""
    echo "💡 如果仍然超时，请尝试："
    echo "   1. 手动停止验证器: pkill solana-test-validator"
    echo "   2. 删除测试数据: rm -rf test-ledger/"
    echo "   3. 重新运行此脚本"
fi

echo ""
echo "ℹ️  验证器仍在后台运行 (PID: $VALIDATOR_PID)"
echo "   停止命令: kill $VALIDATOR_PID"
echo ""

exit $TEST_EXIT_CODE

