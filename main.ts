// Capitulation dip bot for cbBTC (agent-fun/bars-replay/v1, Node 22, stdlib only).
//
// The dev window falls almost five percent over 24 hours, so trend following
// and dip buying both bleed: every ordinary signal I tested on the frozen
// bars loses money after the 4 bps fee, 2 bps slippage and pool impact.
// What survives is one very selective shape — a sharp fall that has only
// just started to bounce while the price is still hugging its recent low:
//
//   * the close fell more than 0.70% over the last 30 minutes, and
//   * the close rose more than 0.05% over the last 5 minutes, and
//   * the close sits within 0.30% of the lowest low of the last 30 minutes.
//
// The third leg is the one that matters: buying a dip after it has already
// bounced half a percent buys the top of a dead-cat bounce. Buying while the
// price is still at its low buys the dip itself. Entries are rare (one in
// the whole dev window) and the bot is flat the rest of the time, which is
// the point — in a falling market, not trading is the winning move.
//
// Exits: take profit at +1.00% from the entry close, stop at -0.40%, or a
// 120-minute time stop, whichever comes first. Buys carry a 20 bps
// max-slippage cap, so an order only fills when the next open has not run
// away upward; sells carry no cap, so an exit never gets stranded by a
// falling open. Long only, one position at a time, full cash on entry.
//
// Everything is exact integer arithmetic on the raw price units (no floats,
// no clock, no network, no randomness), so two runs on the same bars give
// byte-identical orders.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

// --- strategy constants (basis points; 10000 bps = 100%) -----------------
const DROP_MIN_BPS = 70; // 30-minute fall must be deeper than 0.70%
const BOUNCE_MIN_BPS = 5; // 5-minute rise must beat 0.05%
const NEAR_LOW_BPS = 30; // close within 0.30% of the 30-minute low
const TAKE_PROFIT_BPS = 100; // exit at +1.00% from the entry close
const STOP_LOSS_BPS = 40; // exit at -0.40% from the entry close
const MAX_HOLD_BARS = 120; // exit after 120 minutes in the trade
const MIN_HISTORY_BARS = 61; // need 30 bars of lookback plus warm-up
const NO_ENTRY_AFTER_BAR = 1320; // no new entry in the last two hours
const BUY_MAX_SLIPPAGE_BPS = 20; // buy only if the next open is near
const SELL_MAX_SLIPPAGE_BPS = 10000; // sell at whatever the next open is
const BPS = 10000n;

// The traded symbol, taken from the hello's universe (this competition has
// exactly one: CBBTC). Reading it from hello instead of hardcoding it keeps
// the bot honest about what the harness actually offers.
let symbol = '';

// Rolling history of this symbol's closes and lows, raw price units.
const closes: bigint[] = [];
const lows: bigint[] = [];

// The entry we are in (or waiting to fill): the close of the bar the buy
// was decided on, and that bar's sequence number for the time stop.
let entry: { price: bigint; seq: number } | null = null;

function close30BarsAgo(): bigint {
  return closes[closes.length - 1 - 30];
}

function close5BarsAgo(): bigint {
  return closes[closes.length - 1 - 5];
}

function lowOfLast30(): bigint {
  let low = lows[lows.length - 1];
  for (let k = lows.length - 1 - 30; k < lows.length; k++) {
    if (lows[k] < low) low = lows[k];
  }
  return low;
}

await runBars({
  onHello(state: BarsState) {
    symbol = state.hello.symbols[0].symbol;
  },
  onBatch(state: BarsState, batch: Batch) {
    // Find this batch's bar for our symbol; a minute with no bar is skipped.
    const bar = batch.bars.find((b) => b.symbol === symbol);
    if (bar === undefined) return [];
    closes.push(BigInt(bar.c));
    lows.push(BigInt(bar.l));

    // Warm-up bars seed the history; trading on them is rejected anyway.
    if (state.warmingUp) return [];

    const position = state.positions.get(symbol);
    const holding = position !== undefined && position.qty > 0n;

    // A buy we placed on the previous bar resolves by now: if we are still
    // flat, it was rejected (its max-slippage cap), so forget it and let
    // the entry signal fire again on this bar if it still holds.
    if (entry !== null && !holding) entry = null;

    const close = BigInt(bar.c);

    if (!holding) {
      // --- entry: sharp 30-minute fall, fresh 5-minute bounce, still at the low
      const idx = closes.length - 1;
      if (idx < MIN_HISTORY_BARS - 1 || idx > NO_ENTRY_AFTER_BAR) return [];
      const fell = close * BPS < close30BarsAgo() * (BPS - BigInt(DROP_MIN_BPS));
      const bounced = close * BPS > close5BarsAgo() * (BPS + BigInt(BOUNCE_MIN_BPS));
      const nearLow = close * BPS <= lowOfLast30() * (BPS + BigInt(NEAR_LOW_BPS));
      if (!fell || !bounced || !nearLow) return [];
      const room = state.weightRoom(symbol);
      let notional = state.cash < room ? state.cash : room;
      const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
      if (notional < minNotional) return [];
      entry = { price: close, seq: state.seq };
      return [
        {
          side: 'buy',
          symbol,
          notional_quote_units: notional,
          max_slippage_bps: BUY_MAX_SLIPPAGE_BPS,
        },
      ];
    }

    // --- exit: take profit, stop loss, or time stop
    if (entry === null) return [];
    const tookProfit = close * BPS >= entry.price * (BPS + BigInt(TAKE_PROFIT_BPS));
    const stoppedOut = close * BPS <= entry.price * (BPS - BigInt(STOP_LOSS_BPS));
    const timedOut = state.seq - entry.seq >= MAX_HOLD_BARS;
    if (!tookProfit && !stoppedOut && !timedOut) return [];
    entry = null;
    return [
      {
        side: 'sell',
        symbol,
        qty: position!.qty,
        max_slippage_bps: SELL_MAX_SLIPPAGE_BPS,
      },
    ];
  },
});
