import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, date, real } from "drizzle-orm/pg-core";

// ── USERS ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("donor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── DONORS ───────────────────────────────────────────────────────────────
export const donors = pgTable("donors", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  bloodType: text("blood_type").notNull(),
  phone: text("phone").notNull(),
  location: text("location").notNull(),
  age: integer("age"),
  weight: integer("weight"),
  lastDonation: text("last_donation"),
  available: boolean("available").default(true).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  email: text("email"),
  dob: date("dob"),
  totalDonations: integer("total_donations").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDonorSchema = createInsertSchema(donors).pick({
  userId: true,
  name: true,
  bloodType: true,
  phone: true,
  location: true,
  age: true,
  weight: true,
  lastDonation: true,
  available: true,
});

export type InsertDonor = z.infer<typeof insertDonorSchema>;
export type Donor = typeof donors.$inferSelect;

// ── HOSPITALS ────────────────────────────────────────────────────────────
export const hospitals = pgTable("hospitals", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  phone: text("phone").notNull(),
  licenseNumber: text("license_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHospitalSchema = createInsertSchema(hospitals).pick({
  userId: true,
  name: true,
  location: true,
  phone: true,
  licenseNumber: true,
});

export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitals.$inferSelect;

// ── BLOOD INVENTORY ──────────────────────────────────────────────────────
export const bloodInventory = pgTable("blood_inventory", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: text("hospital_id").references(() => hospitals.id),
  bloodType: text("blood_type").notNull(),
  units: integer("units").default(0).notNull(),
  dateAdded: text("date_added"),
  expiryDate: text("expiry_date"),
  urgencyLevel: text("urgency_level").default("SAFE"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBloodInventorySchema = createInsertSchema(bloodInventory).pick({
  hospitalId: true,
  bloodType: true,
  units: true,
  dateAdded: true,
  expiryDate: true,
  urgencyLevel: true,
});

export type InsertBloodInventory = z.infer<typeof insertBloodInventorySchema>;
export type BloodInventory = typeof bloodInventory.$inferSelect;

// ── BLOOD REQUESTS ───────────────────────────────────────────────────────
export const bloodRequests = pgTable("blood_requests", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  hospitalId: text("hospital_id").references(() => hospitals.id),
  bloodType: text("blood_type").notNull(),
  units: integer("units").notNull(),
  urgency: text("urgency").notNull().default("Normal"),
  status: text("status").notNull().default("Pending"),
  department: text("department"),
  patientId: text("patient_id"),
  requestedBy: text("requested_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBloodRequestSchema = createInsertSchema(bloodRequests).pick({
  hospitalId: true,
  bloodType: true,
  units: true,
  urgency: true,
  department: true,
  patientId: true,
  requestedBy: true,
});

export type InsertBloodRequest = z.infer<typeof insertBloodRequestSchema>;
export type BloodRequest = typeof bloodRequests.$inferSelect;