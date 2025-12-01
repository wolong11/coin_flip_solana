use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("4VF1yPnMFUwGD4AsJkUaC7FDW1g7Fi62fMea5TEQ9KG7");

#[error_code]
pub enum ErrorCode {
    #[msg("Game has already finished")]
    GameAlreadyFinished,

    #[msg("Invalid game ID")]
    InvalidGameId,

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

        msg!(
            "New coin flip game created. starter: {}, nonce: {}, wager: {}",
            player.key(),
            client_nonce,
            wager,
        );

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


        coin_flip.is_active = false;

        let total = coin_flip.starting_wager + wager;
        let coin_flip_account_info = coin_flip.to_account_info();
        require!(
            **coin_flip_account_info.lamports.borrow() >= total,
            ErrorCode::NotEnoughLamports,
        );

        **coin_flip_account_info.try_borrow_mut_lamports()? -= total;
        **winner_account_info.try_borrow_mut_lamports()? += total;

        msg!(
            "Coin flip game finished, winner: {}, loser: {}, total payout: {}",
            coin_flip.winner,
            coin_flip.loser,
            total
        );

        Ok(())

    }
}
