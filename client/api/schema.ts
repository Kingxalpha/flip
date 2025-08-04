import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  publicKey: text("public_key"),
  username: text("username"),
  balance: decimal("balance", { precision: 18, scale: 9 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  gameType: text("game_type").notNull(), // 'coinflip'
  betAmount: decimal("bet_amount", { precision: 18, scale: 9 }).notNull(),
  selectedSide: text("selected_side").notNull(), // 'heads' | 'tails'
  result: text("result"), // 'heads' | 'tails'
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }),
  winAmount: decimal("win_amount", { precision: 18, scale: 9 }),
  vrfProof: text("vrf_proof"),
  vrfSeed: text("vrf_seed"),
  transactionSignature: text("transaction_signature"),
  status: text("status").notNull().default("pending"), // 'pending' | 'completed' | 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  publicKey: text("public_key"),
});

export const gameStreaks = pgTable("game_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  currentMultiplier: decimal("current_multiplier", { precision: 10, scale: 2 }).notNull().default("1.0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vrfProofs = pgTable("vrf_proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").references(() => games.id).notNull(),
  proof: text("proof").notNull(),
  seed: text("seed").notNull(),
  publicKey: text("public_key").notNull(),
  message: text("message").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  username: true,
  publicKey: true,
});

export const insertGameSchema = createInsertSchema(games).pick({
  userId: true,
  gameType: true,
  betAmount: true,
  selectedSide: true,
  publicKey: true,
});

export const insertGameStreakSchema = createInsertSchema(gameStreaks).pick({
  userId: true,
  currentStreak: true,
  maxStreak: true,
  currentMultiplier: true,
});

export const insertVrfProofSchema = createInsertSchema(vrfProofs).pick({
  gameId: true,
  proof: true,
  seed: true,
  publicKey: true,
  message: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGameStreak = z.infer<typeof insertGameStreakSchema>;
export type GameStreak = typeof gameStreaks.$inferSelect;
export type InsertVrfProof = z.infer<typeof insertVrfProofSchema>;
export type VrfProof = typeof vrfProofs.$inferSelect;
