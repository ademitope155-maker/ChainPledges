# 🎁 ChainPledges: Decentralized Recurring Gifts

Welcome to ChainPledges, the Web3 solution for hassle-free recurring gifts and pledges! Tired of forgetting birthdays, anniversaries, or monthly donations? This Stacks-based project automates peer-to-peer gifts and charitable pledges using Clarity smart contracts, ensuring funds are escrowed, scheduled, and executed on-chain without banks or centralized services. Solve the real-world problem of unreliable recurring payments—whether it's gifting a friend coffee every month or supporting a cause consistently—while maintaining full transparency and control.

## ✨ Features

🔄 **Auto-Executing Recurring Gifts**: Set it and forget it—monthly (or custom interval) transfers happen automatically via on-chain triggers.
💰 **Escrow-Secured Pledges**: Funds are locked until execution, preventing defaults and building trust.
👥 **Multi-Beneficiary Support**: Pledge to individuals, groups, or charities with easy recipient management.
📊 **Transparent Audits**: Track every pledge, execution, and transfer with immutable blockchain records.
⚡ **Gas-Efficient Scheduling**: Uses Stacks' time-based functions for low-cost, reliable automation.
🔒 **Ownership & Revocation**: Creators can pause, edit, or cancel pledges anytime with multi-sig verification.
📱 **Simple Integration**: Connect via wallets like Leather for seamless Clarity interactions.

## 🛠 How It Works

**For Pledgers (Givers)**

1. Connect your Stacks wallet and generate a pledge via the `pledge-creator` contract:
   - Specify amount (in STX or sBTC), frequency (e.g., monthly), and duration.
   - Add recipient details (wallet address or ENS-like identifier).
   - Deposit funds into escrow.

2. The system auto-schedules executions using `schedule-executor`. On trigger dates, gifts transfer directly—no intermediaries!

3. Monitor via `audit-viewer`: View pledge history, upcoming payments, and fulfillment status.

**For Beneficiaries (Receivers)**

1. Receive notifications (via off-chain integrations or on-chain events) when a gift executes.
2. Use `verify-receipt` to confirm incoming funds and pledge details.
3. Opt-in/out of future gifts with `beneficiary-manager` for full control.

**Under the Hood**

Powered by 8 interconnected Clarity smart contracts on the Stacks blockchain:
- **pledge-creator**: Initializes new pledges with hash-based IDs for uniqueness.
- **escrow-vault**: Locks funds securely until execution conditions are met.
- **schedule-executor**: Handles time-based triggers (using block heights for monthly intervals).
- **transfer-handler**: Executes atomic transfers to beneficiaries.
- **beneficiary-manager**: Registers and verifies recipients, supports multi-party pledges.
- **revocation-guard**: Allows pledge owners to pause/cancel with time-locks for safety.
- **audit-viewer**: Public read-only contract for querying pledge histories and proofs.
- **fee-collector**: Optional micro-fees for sustainability (e.g., to cover oracle calls).

Boom! Your recurring generosity is now unstoppable and verifiable on the blockchain.

## 🚀 Getting Started

1. Clone the repo and deploy contracts to testnet using Clarinet.
2. Fund your wallet with STX.
3. Interact via the frontend (coming soon) or direct Clarity calls.

Let's make giving as easy as blockchain magic! Contributions welcome—fork and pledge away. 🌟