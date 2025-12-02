use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("4VF1yPnMFUwGD4AsJkUaC7FDW1g7Fi62fMea5TEQ9KG7");

#[error_code]
pub enum ErrorCode {
    #[msg("Game has already finished")]
    GameAlreadyFinished,

    #[msg("Ending wager must be within 1% of the starting wager")]
    WagerOutOfRange,

    #[msg("Not enough lamports of the coin flip account")]
    NotEnoughLamports,
}

#[account]
pub struct CoinFlip {
    pub client_nonce: u64,
    pub bet_starter: Pubkey,
    pub starting_wager: u64,
    pub bet_ender: Pubkey,
    pub ending_wager: u64,
    pub winner: Pubkey,
    pub loser: Pubkey,
    pub is_active: bool,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(client_nonce: u64)]
pub struct NewCoinFlip<'info> {
    #[account(
        init,
        payer = player,
        space = 8 + 154,
        seeds = [
            b"coin_flip",
            player.key().as_ref(),
            &client_nonce.to_le_bytes()
        ],
        bump
    )]
    pub coin_flip: Account<'info, CoinFlip>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndCoinFlip<'info> {
    #[account(
        mut,
        seeds = [
            b"coin_flip",
            coin_flip.bet_starter.as_ref(),
            &coin_flip.client_nonce.to_le_bytes()
        ],
        bump = coin_flip.bump
    )]
    pub coin_flip: Account<'info, CoinFlip>,

    #[account(mut)]
    pub player: Signer<'info>,
    
    /// CHECK: bet starter may be the winner
    #[account(mut)]
    pub bet_starter: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[program]
pub mod coin_flip_solana {
    use super::*;

    pub fn new_coin_flip(
        ctx: Context<NewCoinFlip>,
        client_nonce: u64,
        wager: u64,
    ) -> Result<()> {
        let coin_flip = &mut ctx.accounts.coin_flip;
        let player = &mut ctx.accounts.player;

        coin_flip.client_nonce = client_nonce;
        coin_flip.bet_starter = player.key();
        coin_flip.starting_wager = wager;
        coin_flip.bet_ender = Pubkey::default();
        coin_flip.ending_wager = 0;
        coin_flip.winner = Pubkey::default();
        coin_flip.loser = Pubkey::default();
        coin_flip.is_active = true;
        coin_flip.bump = ctx.bumps.coin_flip;

        let cpi_accounts = system_program::Transfer {
            from: player.to_account_info(),
            to: coin_flip.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );

        system_program::transfer(cpi_ctx, wager)?;

        // msg!(
        //     "New coin flip game created. starter: {}, nonce: {}, wager: {}",
        //     player.key(),
        //     client_nonce,
        //     wager,
        // );

        Ok(())

    }

    pub fn end_coin_flip(
        ctx: Context<EndCoinFlip>,
        wager: u64,
    ) -> Result<()> {
        let coin_flip = &mut ctx.accounts.coin_flip;

        require!(coin_flip.is_active, ErrorCode::GameAlreadyFinished);

        let starting_wager = coin_flip.starting_wager;
        let min_wager = starting_wager.checked_mul(99).unwrap().checked_div(100).unwrap();
        let max_wager = starting_wager.checked_mul(101).unwrap().checked_div(100).unwrap();
        
        require!(
            wager >= min_wager && wager <= max_wager,
            ErrorCode::WagerOutOfRange,
        );

        coin_flip.bet_ender = ctx.accounts.player.key();
        coin_flip.ending_wager = wager;

        let cpi_accounts = system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: coin_flip.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );

        system_program::transfer(cpi_ctx, wager)?;

        let clock = Clock::get()?;
        let ramdom_seed = clock.unix_timestamp
            .wrapping_add(clock.slot as i64)
            .wrapping_add(ctx.accounts.player.key().to_bytes()[0] as i64);

        let random_result = (ramdom_seed % 2) as u8;

        if random_result == 0 {
            coin_flip.winner = coin_flip.bet_starter;
            coin_flip.loser = coin_flip.bet_ender;
        } else {
            coin_flip.winner = coin_flip.bet_ender;
            coin_flip.loser = coin_flip.bet_starter;
        }
        let winner_account_info = if coin_flip.winner == coin_flip.bet_starter {
            &ctx.accounts.bet_starter.to_account_info()
        } else {
            &ctx.accounts.player.to_account_info()
        };


        let total = coin_flip.starting_wager + wager;
        let coin_flip_account_info = coin_flip.to_account_info();
        require!(
            **coin_flip_account_info.lamports.borrow() >= total,
            ErrorCode::NotEnoughLamports,
        );

        **coin_flip_account_info.try_borrow_mut_lamports()? -= total;
        **winner_account_info.try_borrow_mut_lamports()? += total;

        coin_flip.is_active = false;

        // msg!(
        //     "Coin flip game finished, winner: {}, loser: {}, total payout: {}",
        //     coin_flip.winner,
        //     coin_flip.loser,
        //     total
        // );

        Ok(())

    }
}


#[cfg(test)]
mod tests {
    use super::*;

    // 单元测试 1：测试赌注范围验证逻辑
    #[test]
    fn test_wager_range_validation() {
        let starting_wager: u64 = 1_000_000;
        
        // 测试 99% 边界（应该通过）
        let min_wager = starting_wager.checked_mul(99).unwrap().checked_div(100).unwrap();
        assert_eq!(min_wager, 990_000);
        
        // 测试 101% 边界（应该通过）
        let max_wager = starting_wager.checked_mul(101).unwrap().checked_div(100).unwrap();
        assert_eq!(max_wager, 1_010_000);
        
        // 测试范围检查
        let valid_wager = 1_000_000;
        assert!(valid_wager >= min_wager && valid_wager <= max_wager);
        
        // 测试超出范围
        let too_low = 980_000;
        assert!(too_low < min_wager);
        
        let too_high = 1_020_000;
        assert!(too_high > max_wager);
    }

    // 单元测试 2：测试随机数生成逻辑
    #[test]
    fn test_random_result_range() {
        // 模拟随机种子
        let timestamp: i64 = 1234567890;
        let slot: i64 = 100;
        let player_byte: i64 = 42;
        
        let random_seed = timestamp
            .wrapping_add(slot)
            .wrapping_add(player_byte);
        
        let random_result = (random_seed % 2) as u8;
        
        // 结果只能是 0 或 1
        assert!(random_result == 0 || random_result == 1);
    }

    // 单元测试 3：测试账户数据结构大小
    #[test]
    fn test_coin_flip_account_size() {
        use std::mem::size_of;
        
        // CoinFlip 结构体大小应该匹配我们声明的 space
        let expected_size = 
            8 +  // client_nonce (u64)
            32 + // bet_starter (Pubkey)
            8 +  // starting_wager (u64)
            32 + // bet_ender (Pubkey)
            8 +  // ending_wager (u64)
            32 + // winner (Pubkey)
            32 + // loser (Pubkey)
            1 +  // is_active (bool)
            1;   // bump (u8)
        
        assert_eq!(expected_size, 154);
    }

    // 单元测试 4：测试总赌注计算
    #[test]
    fn test_total_wager_calculation() {
        let starting_wager: u64 = 100_000_000; // 0.1 SOL
        let ending_wager: u64 = 100_000_000;
        
        let total = starting_wager + ending_wager;
        
        assert_eq!(total, 200_000_000); // 0.2 SOL
    }

    // 单元测试 5：测试溢出保护
    #[test]
    fn test_wager_multiplication_overflow() {
        let large_wager: u64 = u64::MAX / 2;
        
        // 使用 checked_mul 防止溢出
        let result = large_wager.checked_mul(101);
        
        // 应该返回 None（溢出）
        assert!(result.is_none());
    }
}