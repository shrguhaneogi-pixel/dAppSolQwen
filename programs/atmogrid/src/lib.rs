use anchor_lang::prelude::*;

// PLACEHOLDER — replace with the real deployed id:
//   anchor keys sync        (writes the id back into this file + Anchor.toml)
//   export NEXT_PUBLIC_PROGRAM_ID=<id>
declare_id!("FcftsuNT9C921cAIfPuH7Kb3YmL5PVg8ifKFwMKcqCHc");

/// PDA seed prefix. The frontend derives the same address with
/// `["sensor", authority_pubkey]` — keep these in lock-step.
pub const SENSOR_SEED: &[u8] = b"sensor";

/// Valid AQI range per the US EPA scale (0 = clean, 500 = hazardous).
pub const AQI_MAX: u16 = 500;

#[program]
pub mod atmogrid {
    use super::*;

    /// Creates the caller's `SensorNode` PDA. Idempotent by construction:
    /// `init` fails if the account already exists.
    pub fn initialize_node(ctx: Context<InitializeNode>) -> Result<()> {
        let node = &mut ctx.accounts.sensor_node;
        node.authority = ctx.accounts.authority.key();
        node.data_submissions = 0;
        node.last_aqi_reading = 0;
        node.bump = ctx.bumps.sensor_node;

        msg!("AtmoGrid: sensor node {} registered", node.key());
        Ok(())
    }

    /// Records an air-quality reading and bumps the node's reputation counter.
    pub fn submit_data(ctx: Context<SubmitData>, aqi_reading: u16) -> Result<()> {
        require!(aqi_reading <= AQI_MAX, AtmoGridError::InvalidAqi);

        let node = &mut ctx.accounts.sensor_node;
        node.data_submissions = node
            .data_submissions
            .checked_add(1)
            .ok_or(AtmoGridError::Overflow)?;
        node.last_aqi_reading = aqi_reading;

        Ok(())
    }
}

#[account]
pub struct SensorNode {
    /// Wallet that owns and may write to this node.
    pub authority: Pubkey,
    /// Lifetime number of AQI readings pushed by the operator.
    pub data_submissions: u64,
    /// Most recent AQI reading (0 = never reported).
    pub last_aqi_reading: u16,
    /// PDA bump seed, stored for cheap re-derivation.
    pub bump: u8,
}

impl SensorNode {
    /// 8 (discriminator) + 32 + 8 + 2 + 1
    pub const LEN: usize = 8 + 32 + 8 + 2 + 1;
}

#[derive(Accounts)]
pub struct InitializeNode<'info> {
    #[account(
        init,
        payer = authority,
        space = SensorNode::LEN,
        seeds = [SENSOR_SEED, authority.key().as_ref()],
        bump,
    )]
    pub sensor_node: Account<'info, SensorNode>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitData<'info> {
    #[account(
        mut,
        seeds = [SENSOR_SEED, authority.key().as_ref()],
        bump = sensor_node.bump,
        has_one = authority,
    )]
    pub sensor_node: Account<'info, SensorNode>,

    /// Only the registering wallet may transmit for its own node.
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[error_code]
pub enum AtmoGridError {
    #[msg("AQI reading must be within the 0-500 EPA scale.")]
    InvalidAqi,
    #[msg("Submission counter overflowed.")]
    Overflow,
}
