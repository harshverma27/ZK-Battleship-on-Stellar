import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CBKJPCU7KI4MNAUS6P44SHNIFSZ2VQUNDJOM7ZUFE37UFKN2XA3BPG2K",
  }
} as const


/**
 * A single move record
 */
export interface Move {
  attacker: string;
  hit: boolean;
  proof_hash: Buffer;
  x: u32;
  y: u32;
}

export const Errors = {
  1: {message:"GameNotFound"},
  2: {message:"GameFull"},
  3: {message:"NotYourTurn"},
  4: {message:"GameNotActive"},
  5: {message:"InvalidCoordinate"},
  6: {message:"AlreadyAttacked"},
  7: {message:"InvalidProof"},
  8: {message:"AlreadyJoined"},
  9: {message:"BoardAlreadyCommitted"},
  10: {message:"GameNotReady"},
  11: {message:"NotAPlayer"}
}

/**
 * Storage keys
 */
export type DataKey = {tag: "GameCount", values: void} | {tag: "Game", values: readonly [u32]} | {tag: "GameMoves", values: readonly [u32]} | {tag: "HitMap", values: readonly [u32, u32]};


/**
 * Full game state
 */
export interface GameState {
  current_turn: u32;
  game_id: u32;
  move_count: u32;
  p1_board_hash: Buffer;
  p1_hits: u32;
  p2_board_hash: Buffer;
  p2_hits: u32;
  player1: string;
  player2: string;
  status: GameStatus;
  winner: u32;
}

/**
 * Game status enum
 */
export type GameStatus = {tag: "Waiting", values: void} | {tag: "Placing", values: void} | {tag: "Active", values: void} | {tag: "Complete", values: void};

export interface Client {
  /**
   * Construct and simulate a attack transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Submit an attack. The defending player calls this with their ZK proof.
   * 
   * Flow:
   * 1. Attacker clicks a cell (off-chain signal to defender via polling)
   * 2. Defender generates ZK proof and calls attack() with proof
   * 3. Contract verifies and updates state
   */
  attack: ({game_id, attacker, x, y, hit, proof_hash}: {game_id: u32, attacker: string, x: u32, y: u32, hit: boolean, proof_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<boolean>>>

  /**
   * Construct and simulate a get_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current game state for polling.
   */
  get_game: ({game_id}: {game_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<GameState>>>

  /**
   * Construct and simulate a get_moves transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get all moves for a game.
   */
  get_moves: ({game_id}: {game_id: u32}, options?: MethodOptions) => Promise<AssembledTransaction<Result<Array<Move>>>>

  /**
   * Construct and simulate a join_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Join an existing game as player 2.
   */
  join_game: ({game_id, player2}: {game_id: u32, player2: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a game_count transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the total number of games created.
   */
  game_count: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a create_game transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a new game. Returns the game_id.
   */
  create_game: ({player1}: {player1: string}, options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a commit_board transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Commit a board hash. Both players must do this before the game starts.
   */
  commit_board: ({game_id, player, board_hash}: {game_id: u32, player: string, board_hash: Buffer}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAAAAAPZTdWJtaXQgYW4gYXR0YWNrLiBUaGUgZGVmZW5kaW5nIHBsYXllciBjYWxscyB0aGlzIHdpdGggdGhlaXIgWksgcHJvb2YuCgpGbG93OgoxLiBBdHRhY2tlciBjbGlja3MgYSBjZWxsIChvZmYtY2hhaW4gc2lnbmFsIHRvIGRlZmVuZGVyIHZpYSBwb2xsaW5nKQoyLiBEZWZlbmRlciBnZW5lcmF0ZXMgWksgcHJvb2YgYW5kIGNhbGxzIGF0dGFjaygpIHdpdGggcHJvb2YKMy4gQ29udHJhY3QgdmVyaWZpZXMgYW5kIHVwZGF0ZXMgc3RhdGUAAAAAAAZhdHRhY2sAAAAAAAYAAAAAAAAAB2dhbWVfaWQAAAAABAAAAAAAAAAIYXR0YWNrZXIAAAATAAAAAAAAAAF4AAAAAAAABAAAAAAAAAABeQAAAAAAAAQAAAAAAAAAA2hpdAAAAAABAAAAAAAAAApwcm9vZl9oYXNoAAAAAAPuAAAAIAAAAAEAAAPpAAAAAQAAAAM=",
        "AAAAAQAAABRBIHNpbmdsZSBtb3ZlIHJlY29yZAAAAAAAAAAETW92ZQAAAAUAAAAAAAAACGF0dGFja2VyAAAAEwAAAAAAAAADaGl0AAAAAAEAAAAAAAAACnByb29mX2hhc2gAAAAAA+4AAAAgAAAAAAAAAAF4AAAAAAAABAAAAAAAAAABeQAAAAAAAAQ=",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAACwAAAAAAAAAMR2FtZU5vdEZvdW5kAAAAAQAAAAAAAAAIR2FtZUZ1bGwAAAACAAAAAAAAAAtOb3RZb3VyVHVybgAAAAADAAAAAAAAAA1HYW1lTm90QWN0aXZlAAAAAAAABAAAAAAAAAARSW52YWxpZENvb3JkaW5hdGUAAAAAAAAFAAAAAAAAAA9BbHJlYWR5QXR0YWNrZWQAAAAABgAAAAAAAAAMSW52YWxpZFByb29mAAAABwAAAAAAAAANQWxyZWFkeUpvaW5lZAAAAAAAAAgAAAAAAAAAFUJvYXJkQWxyZWFkeUNvbW1pdHRlZAAAAAAAAAkAAAAAAAAADEdhbWVOb3RSZWFkeQAAAAoAAAAAAAAACk5vdEFQbGF5ZXIAAAAAAAs=",
        "AAAAAAAAACdHZXQgdGhlIGN1cnJlbnQgZ2FtZSBzdGF0ZSBmb3IgcG9sbGluZy4AAAAACGdldF9nYW1lAAAAAQAAAAAAAAAHZ2FtZV9pZAAAAAAEAAAAAQAAA+kAAAfQAAAACUdhbWVTdGF0ZQAAAAAAAAM=",
        "AAAAAAAAABlHZXQgYWxsIG1vdmVzIGZvciBhIGdhbWUuAAAAAAAACWdldF9tb3ZlcwAAAAAAAAEAAAAAAAAAB2dhbWVfaWQAAAAABAAAAAEAAAPpAAAD6gAAB9AAAAAETW92ZQAAAAM=",
        "AAAAAAAAACJKb2luIGFuIGV4aXN0aW5nIGdhbWUgYXMgcGxheWVyIDIuAAAAAAAJam9pbl9nYW1lAAAAAAAAAgAAAAAAAAAHZ2FtZV9pZAAAAAAEAAAAAAAAAAdwbGF5ZXIyAAAAABMAAAABAAAD6QAAA+0AAAAAAAAAAw==",
        "AAAAAgAAAAxTdG9yYWdlIGtleXMAAAAAAAAAB0RhdGFLZXkAAAAABAAAAAAAAAAAAAAACUdhbWVDb3VudAAAAAAAAAEAAAAAAAAABEdhbWUAAAABAAAABAAAAAEAAAAAAAAACUdhbWVNb3ZlcwAAAAAAAAEAAAAEAAAAAQAAAAAAAAAGSGl0TWFwAAAAAAACAAAABAAAAAQ=",
        "AAAAAAAAACZHZXQgdGhlIHRvdGFsIG51bWJlciBvZiBnYW1lcyBjcmVhdGVkLgAAAAAACmdhbWVfY291bnQAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAACdDcmVhdGUgYSBuZXcgZ2FtZS4gUmV0dXJucyB0aGUgZ2FtZV9pZC4AAAAAC2NyZWF0ZV9nYW1lAAAAAAEAAAAAAAAAB3BsYXllcjEAAAAAEwAAAAEAAAAE",
        "AAAAAQAAAA9GdWxsIGdhbWUgc3RhdGUAAAAAAAAAAAlHYW1lU3RhdGUAAAAAAAALAAAAAAAAAAxjdXJyZW50X3R1cm4AAAAEAAAAAAAAAAdnYW1lX2lkAAAAAAQAAAAAAAAACm1vdmVfY291bnQAAAAAAAQAAAAAAAAADXAxX2JvYXJkX2hhc2gAAAAAAAPuAAAAIAAAAAAAAAAHcDFfaGl0cwAAAAAEAAAAAAAAAA1wMl9ib2FyZF9oYXNoAAAAAAAD7gAAACAAAAAAAAAAB3AyX2hpdHMAAAAABAAAAAAAAAAHcGxheWVyMQAAAAATAAAAAAAAAAdwbGF5ZXIyAAAAABMAAAAAAAAABnN0YXR1cwAAAAAH0AAAAApHYW1lU3RhdHVzAAAAAAAAAAAABndpbm5lcgAAAAAABA==",
        "AAAAAAAAAEZDb21taXQgYSBib2FyZCBoYXNoLiBCb3RoIHBsYXllcnMgbXVzdCBkbyB0aGlzIGJlZm9yZSB0aGUgZ2FtZSBzdGFydHMuAAAAAAAMY29tbWl0X2JvYXJkAAAAAwAAAAAAAAAHZ2FtZV9pZAAAAAAEAAAAAAAAAAZwbGF5ZXIAAAAAABMAAAAAAAAACmJvYXJkX2hhc2gAAAAAA+4AAAAgAAAAAQAAA+kAAAPtAAAAAAAAAAM=",
        "AAAAAgAAABBHYW1lIHN0YXR1cyBlbnVtAAAAAAAAAApHYW1lU3RhdHVzAAAAAAAEAAAAAAAAAAAAAAAHV2FpdGluZwAAAAAAAAAAAAAAAAdQbGFjaW5nAAAAAAAAAAAAAAAABkFjdGl2ZQAAAAAAAAAAAAAAAAAIQ29tcGxldGU=" ]),
      options
    )
  }
  public readonly fromJSON = {
    attack: this.txFromJSON<Result<boolean>>,
        get_game: this.txFromJSON<Result<GameState>>,
        get_moves: this.txFromJSON<Result<Array<Move>>>,
        join_game: this.txFromJSON<Result<void>>,
        game_count: this.txFromJSON<u32>,
        create_game: this.txFromJSON<u32>,
        commit_board: this.txFromJSON<Result<void>>
  }
}