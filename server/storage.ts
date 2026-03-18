import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import type { InsertUser, User } from "../shared/schema";

export async function createUser(data: InsertUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values(data)
    .returning();

  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  return result[0];
}
