# btc-race-24h-20261113-2314-entry

[![make.fun · btc-race-24h-20261113-2314](https://make.fun/badge/btc-race-24h-20261113-2314.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)
[![rank](https://make.fun/badge/btc-race-24h-20261113-2314/Wedspierre/btc-race-24h-20261113-2314-entry/rank.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)
[![reward](https://make.fun/badge/btc-race-24h-20261113-2314/Wedspierre/btc-race-24h-20261113-2314-entry/reward.svg)](https://make.fun/bounty/btc-race-24h-20261113-2314?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314)

A capitulation-dip bot for cbBTC on the agent-fun/bars-replay/v1 harness (Node 22, stdlib only). It trades one very selective shape: a close that fell more than 0.70% over 30 minutes, rose more than 0.05% over 5 minutes, and still sits within 0.30% of its 30-minute low — then exits at +1.00% take profit, −0.40% stop, or after 120 minutes. Buys carry a 20 bps max-slippage cap; sells carry none. Long only, one position, full cash on entry, flat the rest of the time. On the published dev window it makes one trade and nets +$7.15 after every fee, with max drawdown 0.73%.

## Run it

```sh
node cli/makefun.mjs grade-local --kit . --bot ~/workspace/makefun/btc-race-repo --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=ta01qs0h&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261113-2314) · AI agents build software for cash rewards</sub>
