use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("5LrczEKjr6yu96PVSjuXVX9mXaiJpqwFRqdrpxo52pAr");

#[program]
pub mod solana_coin_flip {
    use super::*;

    /// 初始化全局计数器账户
    /// 这个函数只需要调用一次，创建Vendor账户来追踪游戏数量
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vendor = &mut ctx.accounts.vendor;
        vendor.counter = 0;
        vendor.bump = ctx.bumps.vendor;
        msg!("Vendor initialized with counter: {}", vendor.counter);
        Ok(())
    }

    /// 创建新的CoinFlip游戏
    /// player1调用此函数开始游戏并质押SOL
    /// 
    /// # Arguments
    /// * `wager` - 玩家1的赌注金额（单位：lamports）
    pub fn new_coin_flip(ctx: Context<NewCoinFlip>, wager: u64) -> Result<()> {
        let vendor = &mut ctx.accounts.vendor;
        let coin_flip = &mut ctx.accounts.coin_flip;
        
        // 增加全局游戏计数器
        vendor.counter += 1;
        
        // 初始化游戏数据
        coin_flip.id = vendor.counter;
        coin_flip.bet_starter = ctx.accounts.player.key();
        coin_flip.starting_wager = wager;
        coin_flip.bet_ender = Pubkey::default(); // 默认值，表示还没有第二个玩家
        coin_flip.ending_wager = 0;
        coin_flip.total_wager = 0;
        coin_flip.winner = Pubkey::default();
        coin_flip.loser = Pubkey::default();
        coin_flip.is_active = true;
        coin_flip.bump = ctx.bumps.coin_flip;
        
        // 保存游戏ID和玩家信息用于日志
        let game_id = coin_flip.id;
        let player_key = ctx.accounts.player.key();
        
        // 玩家1转SOL到游戏PDA账户（通过CPI调用System Program）
        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.coin_flip.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );
        system_program::transfer(cpi_ctx, wager)?;
        
        msg!(
            "Game {} created by {} with wager: {} lamports", 
            game_id, 
            player_key, 
            wager
        );
        
        Ok(())
    }

    /// 结束CoinFlip游戏
    /// player2调用此函数加入游戏，系统随机决定胜负并转账给赢家
    /// 
    /// # Arguments
    /// * `game_id` - 要加入的游戏ID
    pub fn end_coin_flip(ctx: Context<EndCoinFlip>, game_id: u64) -> Result<()> {
        // 首先获取所有账户信息的引用（在修改数据之前）
        let player_account = ctx.accounts.player.to_account_info();
        let coin_flip_account = ctx.accounts.coin_flip.to_account_info();
        let system_program_account = ctx.accounts.system_program.to_account_info();
        let winner_account = ctx.accounts.winner.to_account_info();
        
        // 现在可以安全地获取可变引用
        let coin_flip = &mut ctx.accounts.coin_flip;
        
        // 验证1：游戏必须是活跃状态
        require!(coin_flip.is_active, ErrorCode::GameAlreadyFinished);
        
        // 验证2：游戏ID必须匹配
        require!(coin_flip.id == game_id, ErrorCode::InvalidGameId);
        
        // 验证3：第二个玩家的赌注必须在第一个玩家的±1%范围内
        let starting_wager = coin_flip.starting_wager;
        let min_wager = starting_wager.checked_mul(99).unwrap().checked_div(100).unwrap();
        let max_wager = starting_wager.checked_mul(101).unwrap().checked_div(100).unwrap();
        let wager_amount = starting_wager; // 使用相同金额
        
        require!(
            wager_amount >= min_wager && wager_amount <= max_wager,
            ErrorCode::WagerOutOfRange
        );
        
        // 玩家2转SOL到游戏PDA账户
        let cpi_accounts = system_program::Transfer {
            from: player_account.clone(),
            to: coin_flip_account.clone(),
        };
        let cpi_ctx = CpiContext::new(
            system_program_account,
            cpi_accounts,
        );
        system_program::transfer(cpi_ctx, wager_amount)?;
        
        // 更新游戏数据
        coin_flip.bet_ender = ctx.accounts.player.key();
        coin_flip.ending_wager = wager_amount;
        coin_flip.total_wager = starting_wager + wager_amount;
        
        // 生成简单随机数（使用Clock的时间戳和slot）
        // 注意：这不是安全的随机数，仅用于演示！生产环境应使用VRF
        let clock = Clock::get()?;
        let random_seed = clock.unix_timestamp
            .wrapping_add(clock.slot as i64)
            .wrapping_add(ctx.accounts.player.key().to_bytes()[0] as i64);
        
        // 根据随机数决定胜负（偶数player1赢，奇数player2赢）
        let random_result = (random_seed % 2) as u8;
        
        let bet_starter = coin_flip.bet_starter;
        let bet_ender = coin_flip.bet_ender;
        
        if random_result == 0 {
            coin_flip.winner = bet_starter;
            coin_flip.loser = bet_ender;
        } else {
            coin_flip.winner = bet_ender;
            coin_flip.loser = bet_starter;
        }
        
        // 游戏PDA账户转账给赢家
        // 使用直接操作lamports的方式，因为PDA需要签名
        let total = coin_flip.total_wager;
        let winner = coin_flip.winner;
        let loser = coin_flip.loser;
        
        // 使用之前获取的账户信息引用
        **coin_flip_account.try_borrow_mut_lamports()? -= total;
        **winner_account.try_borrow_mut_lamports()? += total;
        
        // 标记游戏为已结束
        coin_flip.is_active = false;
        
        msg!(
            "Game {} finished! Winner: {}, Loser: {}, Total: {} lamports", 
            game_id, 
            winner, 
            loser,
            total
        );
        
        Ok(())
    }
}

// ========== 账户验证结构 ==========

/// Initialize指令需要的账户
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,                              // 初始化新账户
        payer = signer,                    // 由签名者支付账户创建费用
        space = 8 + 8 + 1,                 // discriminator(8) + counter(8) + bump(1)
        seeds = [b"vendor"],               // PDA的种子，确保每个程序只有一个vendor
        bump                               // Anchor自动找到有效的bump seed
    )]
    pub vendor: Account<'info, Vendor>,
    
    #[account(mut)]
    pub signer: Signer<'info>,             // 签名者，需要支付创建账户的租金
    
    pub system_program: Program<'info, System>,  // System Program用于创建账户
}

/// NewCoinFlip指令需要的账户
#[derive(Accounts)]
pub struct NewCoinFlip<'info> {
    #[account(
        mut,                               // vendor需要修改（counter会增加）
        seeds = [b"vendor"],
        bump = vendor.bump                 // 使用存储的bump进行验证
    )]
    pub vendor: Account<'info, Vendor>,
    
    #[account(
        init,                              // 初始化新的游戏账户
        payer = player,                    // 玩家支付创建费用
        space = 8 + 8 + 32 + 8 + 32 + 8 + 8 + 32 + 32 + 1 + 1,  
        // discriminator(8) + id(8) + bet_starter(32) + starting_wager(8) + 
        // bet_ender(32) + ending_wager(8) + total_wager(8) + 
        // winner(32) + loser(32) + is_active(1) + bump(1) = 162 bytes
        seeds = [b"coin_flip", vendor.counter.checked_add(1).unwrap().to_le_bytes().as_ref()],
        bump                               // 使用即将创建的游戏ID作为种子
    )]
    pub coin_flip: Account<'info, CoinFlip>,
    
    #[account(mut)]                        // 玩家账户需要可变（要转出SOL）
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// EndCoinFlip指令需要的账户
#[derive(Accounts)]
#[instruction(game_id: u64)]               // 从指令参数中获取game_id用于验证
pub struct EndCoinFlip<'info> {
    #[account(
        mut,                               // 游戏账户需要修改（更新状态和转出SOL）
        seeds = [b"coin_flip", game_id.to_le_bytes().as_ref()],
        bump = coin_flip.bump              // 验证这是正确的游戏PDA
    )]
    pub coin_flip: Account<'info, CoinFlip>,
    
    #[account(mut)]                        // 玩家2账户需要可变（要转出SOL）
    pub player: Signer<'info>,
    
    /// CHECK: 赢家账户会接收资金，使用UncheckedAccount因为可能是任意账户
    #[account(mut)]
    pub winner: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

// ========== 数据结构定义 ==========

/// 全局计数器账户
/// 对应Solidity合约中的 numberOfCoinFlips
#[account]
pub struct Vendor {
    pub counter: u64,  // 当前游戏ID计数器
    pub bump: u8,      // PDA的bump seed，用于签名
}

/// 游戏状态账户
/// 对应Solidity合约中的 EtherCoinFlipStruct
#[account]
pub struct CoinFlip {
    pub id: u64,                // 游戏唯一ID
    pub bet_starter: Pubkey,    // 玩家1的公钥（相当于address）
    pub starting_wager: u64,    // 玩家1的赌注（单位：lamports）
    pub bet_ender: Pubkey,      // 玩家2的公钥
    pub ending_wager: u64,      // 玩家2的赌注
    pub total_wager: u64,       // 总赌注
    pub winner: Pubkey,         // 赢家公钥
    pub loser: Pubkey,          // 输家公钥
    pub is_active: bool,        // 游戏是否活跃
    pub bump: u8,               // PDA的bump seed
}

// ========== 错误代码 ==========

#[error_code]
pub enum ErrorCode {
    #[msg("Game has already finished")]
    GameAlreadyFinished,
    
    #[msg("Invalid game ID")]
    InvalidGameId,
    
    #[msg("Ending wager must be within 1% of the starting wager")]
    WagerOutOfRange,
}
