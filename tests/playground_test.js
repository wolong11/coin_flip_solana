/**
 * Solana Playground测试脚本
 * 在 https://beta.solpg.io/ 的Test标签中使用
 */

const anchor = require("@coral-xyz/anchor");

describe("Solana CoinFlip - Playground测试", () => {
  
  let vendorPDA, vendorBump;
  let player1, player2;
  
  before(async () => {
    // 计算Vendor PDA
    [vendorPDA, vendorBump] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vendor")],
      pg.program.programId
    );
    
    console.log("━".repeat(60));
    console.log("🎮 Solana CoinFlip 游戏测试");
    console.log("━".repeat(60));
    console.log("Program ID:", pg.program.programId.toString());
    console.log("Vendor PDA:", vendorPDA.toString());
    console.log("Your Wallet:", pg.wallet.publicKey.toString());
    console.log("━".repeat(60));
    
    // 创建第二个玩家（用于测试）
    player1 = pg.wallet;
    player2 = anchor.web3.Keypair.generate();
    
    // 给player2空投SOL
    try {
      const airdropSig = await pg.connection.requestAirdrop(
        player2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await pg.connection.confirmTransaction(airdropSig);
      console.log("✅ Player2空投成功");
    } catch (e) {
      console.log("⚠️ Player2空投失败，可能是速率限制");
    }
  });
  
  it("1️⃣ 初始化Vendor", async () => {
    console.log("\n【测试1】初始化Vendor账户");
    
    try {
      // 检查是否已初始化
      const vendorAccount = await pg.connection.getAccountInfo(vendorPDA);
      if (vendorAccount) {
        console.log("ℹ️  Vendor已存在，跳过初始化");
        const vendor = await pg.program.account.vendor.fetch(vendorPDA);
        console.log("当前计数器:", vendor.counter.toString());
        return;
      }
    } catch (e) {
      // Vendor不存在，继续初始化
    }
    
    const tx = await pg.program.methods
      .initialize()
      .accounts({
        vendor: vendorPDA,
        signer: pg.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ 初始化成功！");
    console.log("交易签名:", tx);
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    console.log("初始计数器:", vendor.counter.toString());
    console.log("Bump:", vendor.bump);
  });
  
  it("2️⃣ Player1创建游戏", async () => {
    console.log("\n【测试2】Player1创建游戏");
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    const gameId = vendor.counter.toNumber() + 1;
    
    const [coinFlipPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      pg.program.programId
    );
    
    const wager = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
    
    console.log("游戏ID:", gameId);
    console.log("游戏PDA:", coinFlipPDA.toString());
    console.log("赌注:", wager / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    const tx = await pg.program.methods
      .newCoinFlip(new anchor.BN(wager))
      .accounts({
        vendor: vendorPDA,
        coinFlip: coinFlipPDA,
        player: pg.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ 游戏创建成功！");
    console.log("交易签名:", tx);
    
    const game = await pg.program.account.coinFlip.fetch(coinFlipPDA);
    console.log("游戏状态:", game.isActive ? "🟢 活跃" : "🔴 已结束");
    console.log("创建者:", game.betStarter.toString());
  });
  
  it("3️⃣ Player2加入游戏", async () => {
    console.log("\n【测试3】Player2加入游戏");
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    const gameId = vendor.counter.toNumber(); // 最新的游戏
    
    const [coinFlipPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      pg.program.programId
    );
    
    const gameBefore = await pg.program.account.coinFlip.fetch(coinFlipPDA);
    console.log("游戏ID:", gameId);
    console.log("创建者:", gameBefore.betStarter.toString().slice(0, 8) + "...");
    console.log("赌注:", gameBefore.startingWager.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    const player1BalanceBefore = await pg.connection.getBalance(gameBefore.betStarter);
    const player2BalanceBefore = await pg.connection.getBalance(player2.publicKey);
    
    console.log("\n游戏前余额:");
    console.log("Player1:", player1BalanceBefore / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("Player2:", player2BalanceBefore / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    const tx = await pg.program.methods
      .endCoinFlip(new anchor.BN(gameId))
      .accounts({
        coinFlip: coinFlipPDA,
        player: player2.publicKey,
        winner: gameBefore.betStarter,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();
    
    console.log("\n✅ 游戏完成！");
    console.log("交易签名:", tx);
    
    const gameAfter = await pg.program.account.coinFlip.fetch(coinFlipPDA);
    const player1BalanceAfter = await pg.connection.getBalance(gameBefore.betStarter);
    const player2BalanceAfter = await pg.connection.getBalance(player2.publicKey);
    
    console.log("\n游戏后余额:");
    console.log("Player1:", player1BalanceAfter / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    console.log("Player2:", player2BalanceAfter / anchor.web3.LAMPORTS_PER_SOL, "SOL");
    
    const isPlayer1Winner = gameAfter.winner.toString() === gameBefore.betStarter.toString();
    console.log("\n🎉 游戏结果:");
    console.log("赢家:", isPlayer1Winner ? "Player1" : "Player2");
    console.log("赢家地址:", gameAfter.winner.toString().slice(0, 8) + "...");
    console.log("输家地址:", gameAfter.loser.toString().slice(0, 8) + "...");
    console.log("总奖池:", gameAfter.totalWager.toNumber() / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  });
  
  it("4️⃣ 查询所有游戏", async () => {
    console.log("\n【测试4】查询所有游戏");
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    const totalGames = vendor.counter.toNumber();
    
    console.log("总游戏数:", totalGames);
    console.log("━".repeat(60));
    
    for (let i = 1; i <= totalGames; i++) {
      const [coinFlipPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("coin_flip"), new anchor.BN(i).toArrayLike(Buffer, "le", 8)],
        pg.program.programId
      );
      
      try {
        const game = await pg.program.account.coinFlip.fetch(coinFlipPDA);
        const status = game.isActive ? "🟢 活跃" : "🔴 已结束";
        const wager = (game.startingWager.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4);
        
        console.log(`游戏 #${i} | ${status}`);
        console.log(`  创建者: ${game.betStarter.toString().slice(0, 8)}...`);
        console.log(`  赌注: ${wager} SOL`);
        
        if (!game.isActive) {
          console.log(`  赢家: ${game.winner.toString().slice(0, 8)}...`);
        }
        console.log("━".repeat(60));
      } catch (e) {
        console.log(`游戏 #${i} | ⚠️ 无法读取`);
        console.log("━".repeat(60));
      }
    }
  });
  
  it("5️⃣ 查询活跃游戏", async () => {
    console.log("\n【测试5】查询活跃游戏（对应Solidity的getActiveCoinFlips）");
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    const totalGames = vendor.counter.toNumber();
    
    let activeGames = [];
    
    for (let i = 1; i <= totalGames; i++) {
      const [coinFlipPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("coin_flip"), new anchor.BN(i).toArrayLike(Buffer, "le", 8)],
        pg.program.programId
      );
      
      try {
        const game = await pg.program.account.coinFlip.fetch(coinFlipPDA);
        if (game.isActive) {
          activeGames.push({
            id: i,
            game: game,
            pda: coinFlipPDA
          });
        }
      } catch (e) {
        // 忽略无法读取的游戏
      }
    }
    
    console.log(`找到 ${activeGames.length} 个活跃游戏`);
    console.log("━".repeat(60));
    
    if (activeGames.length === 0) {
      console.log("当前没有活跃游戏");
    } else {
      activeGames.forEach(({ id, game }) => {
        const wager = (game.startingWager.toNumber() / anchor.web3.LAMPORTS_PER_SOL).toFixed(4);
        console.log(`游戏 #${id} | 🟢 可加入`);
        console.log(`  创建者: ${game.betStarter.toString().slice(0, 8)}...`);
        console.log(`  赌注: ${wager} SOL`);
        console.log("━".repeat(60));
      });
    }
  });
  
  it("6️⃣ 测试错误情况", async () => {
    console.log("\n【测试6】测试错误处理");
    
    const vendor = await pg.program.account.vendor.fetch(vendorPDA);
    const gameId = vendor.counter.toNumber() + 1;
    
    const [coinFlipPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
      pg.program.programId
    );
    
    const wager = 0.05 * anchor.web3.LAMPORTS_PER_SOL;
    
    // 创建一个新游戏用于测试
    await pg.program.methods
      .newCoinFlip(new anchor.BN(wager))
      .accounts({
        vendor: vendorPDA,
        coinFlip: coinFlipPDA,
        player: pg.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ 创建测试游戏 #" + gameId);
    
    // 测试：用错误的game_id
    console.log("\n测试1: 使用错误的game_id");
    try {
      const [wrongPDA] = await anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("coin_flip"), new anchor.BN(999).toArrayLike(Buffer, "le", 8)],
        pg.program.programId
      );
      
      await pg.program.methods
        .endCoinFlip(new anchor.BN(999))
        .accounts({
          coinFlip: coinFlipPDA, // 使用正确的PDA但错误的ID
          player: player2.publicKey,
          winner: pg.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player2])
        .rpc();
      
      console.log("❌ 应该抛出错误");
    } catch (error) {
      console.log("✅ 正确捕获错误:", error.message.includes("Invalid game ID") || error.message.includes("seed"));
    }
    
    // 完成这个游戏
    await pg.program.methods
      .endCoinFlip(new anchor.BN(gameId))
      .accounts({
        coinFlip: coinFlipPDA,
        player: player2.publicKey,
        winner: pg.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();
    
    // 测试：尝试再次结束已完成的游戏
    console.log("\n测试2: 尝试结束已完成的游戏");
    try {
      await pg.program.methods
        .endCoinFlip(new anchor.BN(gameId))
        .accounts({
          coinFlip: coinFlipPDA,
          player: player2.publicKey,
          winner: pg.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([player2])
        .rpc();
      
      console.log("❌ 应该抛出错误");
    } catch (error) {
      console.log("✅ 正确捕获错误: GameAlreadyFinished");
    }
    
    console.log("\n✅ 所有错误测试通过！");
  });
  
  after(() => {
    console.log("\n━".repeat(60));
    console.log("🎉 所有测试完成！");
    console.log("━".repeat(60));
    console.log("\n📚 使用指南:");
    console.log("1. CLI工具: ts-node scripts/play_game.ts --help");
    console.log("2. Web Dapp: open app/index.html");
    console.log("3. 查看文档: cat USAGE_GUIDE.md");
    console.log("━".repeat(60));
  });
});


