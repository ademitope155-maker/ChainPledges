import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV, principalCV, bufferCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_INVALID_FREQUENCY = 102;
const ERR_INVALID_DURATION = 103;
const ERR_INVALID_BENEFICIARY = 104;
const ERR_PLEDGE_ALREADY_EXISTS = 105;
const ERR_PLEDGE_NOT_FOUND = 106;
const ERR_MAX_PLEDGES_EXCEEDED = 110;
const ERR_INVALID_METADATA = 111;
const ERR_INVALID_CURRENCY = 112;
const ERR_INVALID_INTERVAL = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 114;
const ERR_PLEDGE_INACTIVE = 116;

interface Pledge {
  owner: string;
  amount: number;
  frequency: number;
  duration: number;
  beneficiary: string;
  active: boolean;
  timestamp: number;
  metadata: string;
  currency: string;
  interval: number;
  executions: number;
}

interface PledgeUpdate {
  updateAmount: number;
  updateFrequency: number;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PledgeCreatorMock {
  state: {
    nextPledgeId: number;
    maxPledges: number;
    creationFee: number;
    authorityContract: string | null;
    escrowContract: string;
    pledges: Map<number, Pledge>;
    pledgeUpdates: Map<number, PledgeUpdate>;
    pledgesByHash: Map<string, number>;
  } = {
    nextPledgeId: 0,
    maxPledges: 500,
    creationFee: 500,
    authorityContract: null,
    escrowContract: "SP2J6ZY48GV1EZ5V2V5F5NGYTPY3G1Z3P9Q4J6YJ.escrow-vault",
    pledges: new Map(),
    pledgeUpdates: new Map(),
    pledgesByHash: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];
  escrowDeposits: Array<{ from: string; amount: number }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPledgeId: 0,
      maxPledges: 500,
      creationFee: 500,
      authorityContract: null,
      escrowContract: "SP2J6ZY48GV1EZ5V2V5F5NGYTPY3G1Z3P9Q4J6YJ.escrow-vault",
      pledges: new Map(),
      pledgeUpdates: new Map(),
      pledgesByHash: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
    this.escrowDeposits = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === this.caller) {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createPledge(
    amt: number,
    freq: number,
    dur: number,
    ben: string,
    meta: string,
    cur: string,
    inter: number
  ): Result<number> {
    if (this.state.nextPledgeId >= this.state.maxPledges) return { ok: false, value: ERR_MAX_PLEDGES_EXCEEDED };
    if (amt <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (freq <= 0 || freq > 365) return { ok: false, value: ERR_INVALID_FREQUENCY };
    if (dur < 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (!ben) return { ok: false, value: ERR_INVALID_BENEFICIARY };
    if (meta.length > 100) return { ok: false, value: ERR_INVALID_METADATA };
    if (!["STX", "sBTC"].includes(cur)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (inter <= 0 || inter > 4320) return { ok: false, value: ERR_INVALID_INTERVAL };
    if (this.state.authorityContract === null) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    const pledgeHash = Buffer.from(ben + meta).toString("hex");
    if (this.state.pledgesByHash.has(pledgeHash)) return { ok: false, value: ERR_PLEDGE_ALREADY_EXISTS };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });
    this.escrowDeposits.push({ from: this.caller, amount: amt });

    const id = this.state.nextPledgeId;
    const pledge: Pledge = {
      owner: this.caller,
      amount: amt,
      frequency: freq,
      duration: dur,
      beneficiary: ben,
      active: true,
      timestamp: this.blockHeight,
      metadata: meta,
      currency: cur,
      interval: inter,
      executions: 0,
    };
    this.state.pledges.set(id, pledge);
    this.state.pledgesByHash.set(pledgeHash, id);
    this.state.nextPledgeId++;
    return { ok: true, value: id };
  }

  getPledge(id: number): Pledge | null {
    return this.state.pledges.get(id) || null;
  }

  updatePledge(id: number, updateAmt: number, updateFreq: number): Result<boolean> {
    const pledge = this.state.pledges.get(id);
    if (!pledge) return { ok: false, value: false };
    if (pledge.owner !== this.caller) return { ok: false, value: false };
    if (!pledge.active) return { ok: false, value: false };
    if (updateAmt <= 0) return { ok: false, value: false };
    if (updateFreq <= 0 || updateFreq > 365) return { ok: false, value: false };

    const updated: Pledge = {
      ...pledge,
      amount: updateAmt,
      frequency: updateFreq,
      timestamp: this.blockHeight,
    };
    this.state.pledges.set(id, updated);
    this.state.pledgeUpdates.set(id, {
      updateAmount: updateAmt,
      updateFrequency: updateFreq,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  getPledgeCount(): Result<number> {
    return { ok: true, value: this.state.nextPledgeId };
  }

  checkPledgeExistence(hash: string): Result<boolean> {
    return { ok: true, value: this.state.pledgesByHash.has(hash) };
  }
}

describe("PledgeCreator", () => {
  let contract: PledgeCreatorMock;

  beforeEach(() => {
    contract = new PledgeCreatorMock();
    contract.reset();
  });

  it("creates a pledge successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const pledge = contract.getPledge(0);
    expect(pledge?.amount).toBe(100);
    expect(pledge?.frequency).toBe(30);
    expect(pledge?.duration).toBe(12);
    expect(pledge?.beneficiary).toBe("ST3TEST");
    expect(pledge?.metadata).toBe("Monthly gift");
    expect(pledge?.currency).toBe("STX");
    expect(pledge?.interval).toBe(4320);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
    expect(contract.escrowDeposits).toEqual([{ from: "ST1TEST", amount: 100 }]);
  });

  it("rejects pledge creation without authority contract", () => {
    const result = contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid amount", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPledge(
      0,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects invalid frequency", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPledge(
      100,
      366,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_FREQUENCY);
  });

  it("rejects invalid currency", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "USD",
      4320
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CURRENCY);
  });

  it("updates a pledge successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    const result = contract.updatePledge(0, 150, 45);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const pledge = contract.getPledge(0);
    expect(pledge?.amount).toBe(150);
    expect(pledge?.frequency).toBe(45);
    const update = contract.state.pledgeUpdates.get(0);
    expect(update?.updateAmount).toBe(150);
    expect(update?.updateFrequency).toBe(45);
  });

  it("rejects update for non-existent pledge", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updatePledge(99, 150, 45);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update for inactive pledge", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    contract.state.pledges.get(0)!.active = false;
    const result = contract.updatePledge(0, 150, 45);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("checks pledge existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = Buffer.from("ST3TESTMonthly gift").toString("hex");
    contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    const result = contract.checkPledgeExistence(hash);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPledgeExistence("nonexistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("rejects pledge creation with max pledges exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxPledges = 1;
    contract.createPledge(
      100,
      30,
      12,
      "ST3TEST",
      "Monthly gift",
      "STX",
      4320
    );
    const result = contract.createPledge(
      200,
      60,
      24,
      "ST4TEST",
      "Annual gift",
      "sBTC",
      8640
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_PLEDGES_EXCEEDED);
  });
});