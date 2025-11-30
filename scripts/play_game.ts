#!/usr/bin/env ts-node

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { SolanaCoinFlip } from "../target/types/solana_coin_flip";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// 配置
const NETWORK = process.env.SOLANA_NETWORK || "http://127.0.0.1:8899"; // 本地测试网
const PROGRAM_ID = new PublicKey("5LrczEKjr6yu96PVSjuXVX9mXaiJpqwFRqdrpxo52pAr");

/**
 * 🎮 Solana CoinFlip 游戏CLI工具
 * 
 * 用法:
 *   ts-node scripts/play_game.ts init                    - 初始化
 *   ts-node scripts/play_game.ts create [wager]          - 创建游戏
 *   ts-node scripts/play_game.ts join [gameId]           - 加入游戏
 *   ts-node scripts/play_game.ts list                    - 查看所有游戏
 *   ts-node scripts/play_game.ts active                  - 查看活跃游戏
 */

async function main() {
  // 连接到网络
  const connection = new Connection(NETWORK, "confirmed");
  
  // 加载钱包
  const keypairPath = path.join(
    process.env.HOME || "",
    ".config/solana/id.json"
  );
  
  let wallet: Wallet;
  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    wallet = new Wallet(keypair);
  } catch (error) {
    console.error("❌ 无法加载钱包，请确保已运行: solana-keygen new");
    process.exit(1);
  }

  // 设置provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // 加载程序
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/solana_coin_flip.json", "utf-8")
  );
  const program = new Program(idl, PROGRAM_ID, provider) as Program<SolanaCoinFlip>;

  console.log("🎮 Solana CoinFlip 游戏控制台\n");
  console.log("网络:", NETWORK);
  console.log("你的地址:", wallet.publicKey.toString());
  
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("余额:", (balance / LAMPORTS_PER_SOL).toFixed(4), "SOL\n");
  } catch (e) {
    console.log("余额: 无法获取\n");
  }

  // 计算Vendor PDA
  const [vendorPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vendor")],
    PROGRAM_ID
  );

  // 解析命令
  const action = process.argv[2];

  try {
    switch (action) {
      case "init":
        await initialize(program, vendorPDA, wallet);
        break;
      
      case "create":
        const wager = parseFloat(process.argv[3] || "0.1");
        await createGame(program, vendorPDA, wallet, wager);
        break;
      
      case "join":
        const gameId = parseInt(process.argv[3]);
        if (isNaN(gameId)) {
          console.error("❌ 请提供有效的游戏ID");
          process.exit(1);
        }
        await joinGame(program, PROGRAM_ID, wallet, gameId);
        break;
      
      case "list":
        await listGames(program, vendorPDA, PROGRAM_ID);
        break;
      
      case "active":
        await listActiveGames(program, vendorPDA, PROGRAM_ID);
        break;
      
      default:
        showHelp();
    }
  } catch (error: any) {
    console.error("\n❌ 错误:", error.message);
    if (error.logs) {
      console.error("日志:", error.logs.join("\n"));
    }
    process.exit(1);
  }
}

// ========== 功能函数 ==========

/**
 * 初始化Vendor账户
 */
async function initialize(
  program: Program<SolanaCoinFlip>,
  vendorPDA: PublicKey,
  wallet: Wallet
) {
  console.log("📋 初始化Vendor账户...\n");
  
  // 检查是否已经初始化
  try {
    const vendor = await program.account.vendor.fetch(vendorPDA);
    console.log("ℹ️  Vendor已经初始化过了！");
    console.log("当前游戏数:", vendor.counter.toString());
    return;
  } catch (e) {
    // Vendor不存在，继续初始化
  }
  
  const tx = await program.methods
    .initialize()
    .accounts({
      vendor: vendorPDA,
      signer: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log("✅ 初始化成功!");
  console.log("交易签名:", tx);
  console.log("Vendor地址:", vendorPDA.toString());
  
  const vendor = await program.account.vendor.fetch(vendorPDA);
  console.log("初始计数器:", vendor.counter.toString());
}

/**
 * 创建新游戏
 */
async function createGame(
  program: Program<SolanaCoinFlip>,
  vendorPDA: PublicKey,
  wallet: Wallet,
  wager: number
) {
  console.log(`🎲 创建新游戏，赌注: ${wager} SOL\n`);
  
  // 获取当前计数器
  const vendor = await program.account.vendor.fetch(vendorPDA);
  const nextGameId = vendor.counter.toNumber() + 1;
  
  // 计算游戏PDA
  const [coinFlipPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("coin_flip"), new anchor.BN(nextGameId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  
  const wagerLamports = Math.floor(wager * LAMPORTS_PER_SOL);
  
  console.log("游戏ID:", nextGameId);
  console.log("游戏PDA:", coinFlipPDA.toString());
  console.log("赌注 (lamports):", wagerLamports);
  console.log("\n⏳ 正在创建游戏...");
  
  const tx = await program.methods
    .newCoinFlip(new anchor.BN(wagerLamports))
    .accounts({
      vendor: vendorPDA,
      coinFlip: coinFlipPDA,
      player: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  console.log("\n✅ 游戏创建成功!");
  console.log("交易签名:", tx);
  console.log(`\n💡 其他玩家可以用这个命令加入:`);
  console.log(`   ts-node scripts/play_game.ts join ${nextGameId}`);
}

/**
 * 加入游戏
 */
async function joinGame(
  program: Program<SolanaCoinFlip>,
  programId: PublicKey,
  wallet: Wallet,
  gameId: number
) {
  console.log(`🎯 加入游戏 #${gameId}\n`);
  
  // 计算游戏PDA
  const [coinFlipPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("coin_flip"), new anchor.BN(gameId).toArrayLike(Buffer, "le", 8)],
    programId
  );
  
  // 获取游戏信息
  const game = await program.account.coinFlip.fetch(coinFlipPDA);
  
  console.log("游戏信息:");
  console.log("  创建者:", game.betStarter.toString());
  console.log("  赌注:", (game.startingWager.toNumber() / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  console.log("  状态:", game.isActive ? "🟢 活跃" : "🔴 已结束");
  
  if (!game.isActive) {
    console.log("\n❌ 游戏已结束！");
    return;
  }
  
  if (game.betStarter.toString() === wallet.publicKey.toString()) {
    console.log("\n❌ 你不能加入自己创建的游戏！");
    return;
  }
  
  console.log("\n⏳ 加入游戏并抛硬币...");
  
  const tx = await program.methods
    .endCoinFlip(new anchor.BN(gameId))
    .accounts({
      coinFlip: coinFlipPDA,
      player: wallet.publicKey,
      winner: game.betStarter, // 先假设创建者是赢家（程序会重新决定）
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  
  // 获取结果
  const updatedGame = await program.account.coinFlip.fetch(coinFlipPDA);
  
  console.log("\n🎉 游戏结束!");
  console.log("交易签名:", tx);
  console.log("\n结果:");
  console.log("  赢家:", updatedGame.winner.toString());
  console.log("  输家:", updatedGame.loser.toString());
  console.log("  奖池:", (updatedGame.totalWager.toNumber() / LAMPORTS_PER_SOL).toFixed(4), "SOL");
  
  // 判断你是否赢了
  const youWon = updatedGame.winner.toString() === wallet.publicKey.toString();
  if (youWon) {
    console.log("\n🏆 🎊 恭喜你赢了！🎊 🏆");
  } else {
    console.log("\n😢 很遗憾，你输了...");
  }
}

/**
 * 列出所有游戏
 */
async function listGames(
  program: Program<SolanaCoinFlip>,
  vendorPDA: PublicKey,
  programId: PublicKey
) {
  console.log("📋 查询所有游戏\n");
  
  const vendor = await program.account.vendor.fetch(vendorPDA);
  const totalGames = vendor.counter.toNumber();
  
  if (totalGames === 0) {
    console.log("暂无游戏");
    return;
  }
  
  console.log(`总游戏数: ${totalGames}\n`);
  console.log("─".repeat(80));
  
  for (let i = 1; i <= totalGames; i++) {
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(i).toArrayLike(Buffer, "le", 8)],
      programId
    );
    
    try {
      const game = await program.account.coinFlip.fetch(coinFlipPDA);
      
      const status = game.isActive ? "🟢 活跃" : "🔴 已结束";
      const wager = (game.startingWager.toNumber() / LAMPORTS_PER_SOL).toFixed(4);
      
      console.log(`游戏 #${i} | ${status}`);
      console.log(`  创建者: ${game.betStarter.toString().slice(0, 8)}...`);
      console.log(`  赌注: ${wager} SOL`);
      
      if (!game.isActive) {
        const winner = game.winner.toString().slice(0, 8);
        console.log(`  赢家: ${winner}...`);
      }
      
      console.log("─".repeat(80));
    } catch (e) {
      console.log(`游戏 #${i} | ⚠️  无法读取`);
      console.log("─".repeat(80));
    }
  }
}

/**
 * 列出活跃游戏（对应Solidity的getActiveCoinFlips）
 */
async function listActiveGames(
  program: Program<SolanaCoinFlip>,
  vendorPDA: PublicKey,
  programId: PublicKey
) {
  console.log("🟢 查询活跃游戏（可以加入的游戏）\n");
  
  const vendor = await program.account.vendor.fetch(vendorPDA);
  const totalGames = vendor.counter.toNumber();
  
  if (totalGames === 0) {
    console.log("暂无游戏");
    return;
  }
  
  let activeCount = 0;
  console.log("─".repeat(80));
  
  for (let i = 1; i <= totalGames; i++) {
    const [coinFlipPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("coin_flip"), new anchor.BN(i).toArrayLike(Buffer, "le", 8)],
      programId
    );
    
    try {
      const game = await program.account.coinFlip.fetch(coinFlipPDA);
      
      if (game.isActive) {
        activeCount++;
        const wager = (game.startingWager.toNumber() / LAMPORTS_PER_SOL).toFixed(4);
        
        console.log(`游戏 #${i} | 🟢 可加入`);
        console.log(`  创建者: ${game.betStarter.toString()}`);
        console.log(`  赌注: ${wager} SOL`);
        console.log(`  加入命令: ts-node scripts/play_game.ts join ${i}`);
        console.log("─".repeat(80));
      }
    } catch (e) {
      // 忽略无法读取的游戏
    }
  }
  
  if (activeCount === 0) {
    console.log("当前没有活跃游戏");
  } else {
    console.log(`\n找到 ${activeCount} 个活跃游戏`);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🎮 Solana CoinFlip 游戏命令

初始化（只需要一次）:
  ts-node scripts/play_game.ts init

创建游戏:
  ts-node scripts/play_game.ts create [赌注SOL数量]
  例如: ts-node scripts/play_game.ts create 0.1

加入游戏:
  ts-node scripts/play_game.ts join [游戏ID]
  例如: ts-node scripts/play_game.ts join 1

查看所有游戏:
  ts-node scripts/play_game.ts list

查看活跃游戏（可加入）:
  ts-node scripts/play_game.ts active

环境变量:
  SOLANA_NETWORK - Solana网络地址
    默认: http://127.0.0.1:8899 (本地)
    Devnet: https://api.devnet.solana.com
    Mainnet: https://api.mainnet-beta.solana.com
  `);
}

// 运行
main().then(
  () => process.exit(0),
  (err) => {
    console.error("\n💥 发生错误:", err);
    process.exit(1);
  }
);


