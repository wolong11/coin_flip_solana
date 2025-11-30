import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaCoinFlip } from "../target/types/solana_coin_flip";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("solana_coin_flip", () => {
  // 配置使用本地集群
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaCoinFlip as Program<SolanaCoinFlip>;
  
  // 创建两个测试玩家
  const player1 = Keypair.generate();
  const player2 = Keypair.generate();

  // 计算Vendor PDA地址
  const [vendorPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vendor")],
    program.programId
  );

  it("Step 1: Initialize vendor", async () => {
    console.log("\n=== 步骤1：初始化Vendor账户 ===");
    
    // 给测试账户空投SOL
    console.log("正在给player1和player2空投测试SOL...");
    const airdrop1 = await provider.connection.requestAirdrop(
      player1.publicKey, 
      2 * LAMPORTS_PER_SOL
    );
    const airdrop2 = await provider.connection.requestAirdrop(
      player2.publicKey, 
      2 * LAMPORTS_PER_SOL
    );
    
    // 等待确认
    await provider.connection.confirmTransaction(airdrop1);
    await provider.connection.confirmTransaction(airdrop2);
    
    console.log(`Player1 地址: ${player1.publicKey.toString()}`);
    console.log(`Player2 地址: ${player2.publicKey.toString()}`);
    
    // 初始化vendor
    console.log("\n正在初始化Vendor...");
    await program.methods
      .initialize()
      .accounts({
        vendor: vendorPDA,
        signer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // 验证初始化结果
    const vendor = await program.account.vendor.fetch(vendorPDA);
    assert.equal(vendor.counter.toNumber(), 0, "Counter应该初始化为0");
    
    console.log(`✅ Vendor初始化成功！`);
    console.log(`   Vendor地址: ${vendorPDA.toString()}`);
    console.log(`   初始计数器: ${vendor.counter.toNumber()}`);
  });

  it("Step 2: Player1 creates a coin flip game", async () => {
    console.log("\n=== 步骤2：Player1创建游戏 ===");
    
    const gameId = 1;
    const wager = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
    
    // 计算游戏PDA地址
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(`游戏ID: ${gameId}`);
    console.log(`游戏PDA地址: ${coinFlipPDA.toString()}`);
    console.log(`Player1赌注: ${wager / LAMPORTS_PER_SOL} SOL`);
    
    // Player1的余额（创建游戏前）
    const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);
    console.log(`Player1创建前余额: ${player1BalanceBefore / LAMPORTS_PER_SOL} SOL`);

    // Player1创建游戏
    console.log("\n正在创建游戏...");
    const tx = await program.methods
      .newCoinFlip(new anchor.BN(wager))
      .accounts({
        vendor: vendorPDA,
        coinFlip: coinFlipPDA,
        player: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log(`✅ 游戏创建成功！交易签名: ${tx}`);

    // 验证游戏数据
    const game = await program.account.coinFlip.fetch(coinFlipPDA);
    assert.equal(game.id.toNumber(), gameId, "游戏ID应该是1");
    assert.equal(game.betStarter.toString(), player1.publicKey.toString(), "bet_starter应该是player1");
    assert.equal(game.startingWager.toNumber(), wager, "starting_wager应该等于wager");
    assert.equal(game.isActive, true, "游戏应该是活跃状态");
    
    // 验证vendor计数器增加了
    const vendor = await program.account.vendor.fetch(vendorPDA);
    assert.equal(vendor.counter.toNumber(), 1, "计数器应该增加到1");

    // 验证游戏账户收到了SOL
    const gameBalance = await provider.connection.getBalance(coinFlipPDA);
    console.log(`\n游戏账户余额: ${gameBalance / LAMPORTS_PER_SOL} SOL`);
    
    // Player1的余额（创建游戏后）
    const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
    console.log(`Player1创建后余额: ${player1BalanceAfter / LAMPORTS_PER_SOL} SOL`);
    
    console.log("\n游戏详情:");
    console.log(`  - ID: ${game.id.toNumber()}`);
    console.log(`  - Player1: ${game.betStarter.toString()}`);
    console.log(`  - 赌注: ${game.startingWager.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`  - 状态: ${game.isActive ? '活跃' : '已结束'}`);
  });

  it("Step 3: Player2 joins and completes the game", async () => {
    console.log("\n=== 步骤3：Player2加入游戏并决出胜负 ===");
    
    const gameId = 1;
    
    // 计算游戏PDA地址
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // 获取游戏数据
    const gameBefore = await program.account.coinFlip.fetch(coinFlipPDA);
    console.log(`Player2正在加入游戏 #${gameId}...`);
    console.log(`Player2赌注: ${gameBefore.startingWager.toNumber() / LAMPORTS_PER_SOL} SOL`);

    // Player1和Player2的余额（游戏前）
    const player1BalanceBefore = await provider.connection.getBalance(player1.publicKey);
    const player2BalanceBefore = await provider.connection.getBalance(player2.publicKey);
    
    console.log(`\n游戏前余额:`);
    console.log(`  Player1: ${player1BalanceBefore / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Player2: ${player2BalanceBefore / LAMPORTS_PER_SOL} SOL`);

    // Player2加入游戏
    // 注意：winner账户需要提供，我们这里提供player1作为可能的赢家
    // 实际上这个参数只是用来接收资金，程序会根据随机数决定真正的赢家
    console.log("\n正在执行游戏...");
    const tx = await program.methods
      .endCoinFlip(new anchor.BN(gameId))
      .accounts({
        coinFlip: coinFlipPDA,
        player: player2.publicKey,
        winner: player1.publicKey, // 这里我们先传player1的地址，程序会决定真正的赢家
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    console.log(`✅ 游戏完成！交易签名: ${tx}`);

    // 获取最终游戏结果
    const gameAfter = await program.account.coinFlip.fetch(coinFlipPDA);
    
    // Player1和Player2的余额（游戏后）
    const player1BalanceAfter = await provider.connection.getBalance(player1.publicKey);
    const player2BalanceAfter = await provider.connection.getBalance(player2.publicKey);

    console.log(`\n游戏后余额:`);
    console.log(`  Player1: ${player1BalanceAfter / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Player2: ${player2BalanceAfter / LAMPORTS_PER_SOL} SOL`);

    // 验证游戏状态
    assert.equal(gameAfter.isActive, false, "游戏应该已结束");
    assert.notEqual(
      gameAfter.winner.toString(), 
      PublicKey.default.toString(), 
      "应该有赢家"
    );

    // 确定谁是赢家谁是输家
    const isPlayer1Winner = gameAfter.winner.toString() === player1.publicKey.toString();
    const winnerName = isPlayer1Winner ? "Player1" : "Player2";
    const loserName = isPlayer1Winner ? "Player2" : "Player1";

    console.log(`\n🎉 游戏结果:`);
    console.log(`  - 赢家: ${winnerName} (${gameAfter.winner.toString()})`);
    console.log(`  - 输家: ${loserName} (${gameAfter.loser.toString()})`);
    console.log(`  - 总奖池: ${gameAfter.totalWager.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`  - 游戏状态: ${gameAfter.isActive ? '活跃' : '已结束'}`);

    // 验证余额变化
    if (isPlayer1Winner) {
      // Player1赢了，应该比之前多（赢得了0.1 SOL）
      assert.isTrue(
        player1BalanceAfter > player1BalanceBefore,
        "Player1赢家的余额应该增加"
      );
    } else {
      // Player2赢了，应该比之前少一些（支付了0.1 SOL，但赢回了0.2 SOL，净赚0.1 SOL减去手续费）
      // player2 支付了starting_wager，但收到了total_wager（2倍）
      const expectedMinBalance = player2BalanceBefore - gameBefore.startingWager.toNumber() * 0.01; // 允许1%的手续费误差
      assert.isTrue(
        player2BalanceAfter > expectedMinBalance,
        `Player2赢家应该收到奖金，期望余额 > ${expectedMinBalance / LAMPORTS_PER_SOL} SOL，实际: ${player2BalanceAfter / LAMPORTS_PER_SOL} SOL`
      );
    }
  });

  it("Step 4: Create and complete another game", async () => {
    console.log("\n=== 步骤4：创建并完成第二个游戏 ===");
    
    const gameId = 2;
    const wager = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL
    
    // 计算游戏PDA地址
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    console.log(`\n创建游戏 #${gameId}...`);
    
    // Player2创建游戏（这次换player2先创建）
    await program.methods
      .newCoinFlip(new anchor.BN(wager))
      .accounts({
        vendor: vendorPDA,
        coinFlip: coinFlipPDA,
        player: player2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    console.log(`✅ Player2创建了游戏 #${gameId}`);

    // Player1加入游戏
    console.log(`\nPlayer1加入游戏 #${gameId}...`);
    
    await program.methods
      .endCoinFlip(new anchor.BN(gameId))
      .accounts({
        coinFlip: coinFlipPDA,
        player: player1.publicKey,
        winner: player2.publicKey, // 先假设player2是赢家
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log(`✅ 游戏 #${gameId} 完成！`);

    // 获取游戏结果
    const game = await program.account.coinFlip.fetch(coinFlipPDA);
    const isPlayer2Winner = game.winner.toString() === player2.publicKey.toString();
    const winnerName = isPlayer2Winner ? "Player2" : "Player1";

    console.log(`\n🎉 游戏 #${gameId} 结果:`);
    console.log(`  - 赢家: ${winnerName}`);
    console.log(`  - 奖池: ${game.totalWager.toNumber() / LAMPORTS_PER_SOL} SOL`);

    // 验证vendor计数器
    const vendor = await program.account.vendor.fetch(vendorPDA);
    assert.equal(vendor.counter.toNumber(), 2, "应该创建了2个游戏");
    
    console.log(`\n总游戏数: ${vendor.counter.toNumber()}`);
  });

  it("Step 5: Test error cases", async () => {
    console.log("\n=== 步骤5：测试错误情况 ===");
    
    const gameId = 3;
    const wager = 0.1 * LAMPORTS_PER_SOL;
    
    // 计算游戏PDA地址
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // 创建游戏
    await program.methods
      .newCoinFlip(new anchor.BN(wager))
      .accounts({
        vendor: vendorPDA,
        coinFlip: coinFlipPDA,
        player: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log(`创建了游戏 #${gameId} 用于测试`);

    // 测试1：尝试用错误的game_id结束游戏
    console.log("\n测试1：使用错误的game_id...");
    try {
      await program.methods
        .endCoinFlip(new anchor.BN(999)) // 错误的ID
        .accounts({
          coinFlip: coinFlipPDA,
          player: player2.publicKey,
          winner: player1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player2])
        .rpc();
      
      assert.fail("应该抛出错误");
    } catch (error) {
      console.log(`✅ 正确捕获错误: ${error.message}`);
      // Anchor的seeds约束错误
      assert.include(error.message.toLowerCase(), "seed");
    }

    // 完成这个游戏
    await program.methods
      .endCoinFlip(new anchor.BN(gameId))
      .accounts({
        coinFlip: coinFlipPDA,
        player: player2.publicKey,
        winner: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    // 测试2：尝试再次结束已完成的游戏
    console.log("\n测试2：尝试结束已完成的游戏...");
    try {
      await program.methods
        .endCoinFlip(new anchor.BN(gameId))
        .accounts({
          coinFlip: coinFlipPDA,
          player: player2.publicKey,
          winner: player1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player2])
        .rpc();
      
      assert.fail("应该抛出GameAlreadyFinished错误");
    } catch (error) {
      console.log(`✅ 正确捕获错误: ${error.message}`);
      assert.include(error.message, "Game has already finished");
    }

    console.log("\n✅ 所有错误测试通过！");
  });
});
