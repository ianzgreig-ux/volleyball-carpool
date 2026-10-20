import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const signups = sqliteTable("signups", {id:text("id").primaryKey(), date:text("date").notNull(), parent:text("parent").notNull(), direction:text("direction").notNull(), role:text("role").notNull(), seats:integer("seats").notNull(), note:text("note").notNull()});
export const families=sqliteTable("families",{id:integer("id").primaryKey(),child:text("child").notNull(),parent:text("parent").notNull()});
export const assignments=sqliteTable("assignments",{id:text("id").primaryKey(),date:text("date").notNull(),direction:text("direction").notNull(),family:integer("family").notNull()});
export const changes=sqliteTable("changes",{id:text("id").primaryKey(),date:text("date").notNull(),direction:text("direction").notNull(),previous:text("previous").notNull(),next:text("next").notNull(),changedAt:text("changed_at").notNull()});
export const practices=sqliteTable("practices",{id:text("id").primaryKey(),key:text("key").notNull(),date:text("date").notNull(),start:text("start").notNull(),end:text("end").notNull(),title:text("title").notNull(),location:text("location").notNull(),status:text("status").notNull()});
export const feedState=sqliteTable("feed_state",{id:integer("id").primaryKey(),syncedAt:text("synced_at").notNull()});
export const absences=sqliteTable("absences",{id:text("id").primaryKey(),date:text("date").notNull(),family:integer("family").notNull()});
