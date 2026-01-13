import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, varchar, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"),
  password: varchar("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("group"), // 'group' or 'direct'
  createdBy: text("created_by").notNull(),
  allowUserEditing: boolean("allow_user_editing").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boardMembers = pgTable("board_members", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull(),
  userId: text("user_id").notNull(),
  canEdit: boolean("can_edit").default(false),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const timeCards = pgTable("time_cards", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  totalHours: real("total_hours"),
  notes: text("notes"),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: text("user_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const projectMessages = pgTable("project_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  senderId: text("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  notes: text("notes"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: integer("project_id"),
  boardId: integer("board_id"),
  contactId: integer("contact_id"),
  url: text("url").notNull(),
  fileType: text("file_type").default("image"), // 'image' or 'pdf'
  notes: text("notes"),
  markupData: jsonb("markup_data"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  boardId: integer("board_id"),
  receiverId: text("receiver_id"),
  content: text("content"),
  photoId: integer("photo_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isLocked: boolean("is_locked").default(false),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  timeCards: many(timeCards),
  locations: many(locations),
  photos: many(photos),
  messages: many(messages),
  boardMemberships: many(boardMembers),
  projectMemberships: many(projectMembers),
}));

export const timeCardsRelations = relations(timeCards, ({ one }) => ({
  user: one(users, { fields: [timeCards.userId], references: [users.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  user: one(users, { fields: [locations.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  photos: many(photos),
  creator: one(users, { fields: [projects.createdBy], references: [users.id] }),
  members: many(projectMembers),
  messages: many(projectMessages),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const projectMessagesRelations = relations(projectMessages, ({ one }) => ({
  project: one(projects, { fields: [projectMessages.projectId], references: [projects.id] }),
  sender: one(users, { fields: [projectMessages.senderId], references: [users.id] }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  creator: one(users, { fields: [contacts.createdBy], references: [users.id] }),
  photos: many(photos),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  user: one(users, { fields: [photos.userId], references: [users.id] }),
  project: one(projects, { fields: [photos.projectId], references: [projects.id] }),
  board: one(boards, { fields: [photos.boardId], references: [boards.id] }),
  contact: one(contacts, { fields: [photos.contactId], references: [contacts.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
  board: one(boards, { fields: [messages.boardId], references: [boards.id] }),
  photo: one(photos, { fields: [messages.photoId], references: [photos.id] }),
}));

export const boardsRelations = relations(boards, ({ many, one }) => ({
  members: many(boardMembers),
  messages: many(messages),
  photos: many(photos),
  creator: one(users, { fields: [boards.createdBy], references: [users.id] }),
}));

export const boardMembersRelations = relations(boardMembers, ({ one }) => ({
  board: one(boards, { fields: [boardMembers.boardId], references: [boards.id] }),
  user: one(users, { fields: [boardMembers.userId], references: [users.id] }),
}));
