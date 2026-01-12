import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import * as schema from "../shared/schema";
import { eq, desc, and, isNull, gte, lte, inArray } from "drizzle-orm";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Trust proxy for Railway/production
app.set("trust proxy", 1);

// Session setup
const PgSession = connectPg(session);
const isProduction = process.env.NODE_ENV === "production";
app.use(session({
  store: new PgSession({ pool, tableName: 'sessions', createTableIfMissing: false }),
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: isProduction,
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000 
  },
}));

// Hash password helper
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
  req.user = user;
  next();
};

// ============ AUTH ROUTES ============

app.get("/api/auth/user", async (req: any, res) => {
  if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (!user) return res.status(401).json({ message: "User not found" });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.post("/api/auth/login", async (req: any, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  
  const hashedPassword = hashPassword(password);
  if (user.password !== hashedPassword) return res.status(401).json({ message: "Invalid credentials" });
  
  req.session.userId = user.id;
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.post("/api/auth/change-password", requireAuth, async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
  
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (!user) return res.status(404).json({ message: "User not found" });
  
  if (user.password && user.password !== hashPassword(currentPassword)) {
    return res.status(401).json({ message: "Current password incorrect" });
  }
  
  await db.update(schema.users)
    .set({ password: hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(schema.users.id, req.session.userId));
  
  res.json({ message: "Password updated" });
});

app.get("/api/logout", (req: any, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Demo login for development
app.get("/api/login", (req, res) => {
  res.redirect("/api/callback?demo=true");
});

app.get("/api/callback", async (req: any, res) => {
  let [user] = await db.select().from(schema.users).where(eq(schema.users.email, "demo@fieldops.app"));
  if (!user) {
    [user] = await db.insert(schema.users).values({
      id: "demo-user-1",
      email: "demo@fieldops.app",
      firstName: "Demo",
      lastName: "Admin",
      role: "admin",
      password: hashPassword("demo123"),
    }).returning();
  }
  req.session.userId = user.id;
  res.redirect("/");
});

// ============ USER MANAGEMENT (Admin) ============

app.get("/api/users", requireAuth, async (req, res) => {
  const users = await db.select({
    id: schema.users.id,
    email: schema.users.email,
    firstName: schema.users.firstName,
    lastName: schema.users.lastName,
    role: schema.users.role,
    profileImageUrl: schema.users.profileImageUrl,
    createdAt: schema.users.createdAt,
  }).from(schema.users);
  res.json(users);
});

app.post("/api/users", requireAdmin, async (req: any, res) => {
  const { firstName, lastName, email, password, role = "user" } = req.body;
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }
  
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase()));
  if (existing.length > 0) return res.status(400).json({ message: "Email already exists" });
  
  const [user] = await db.insert(schema.users).values({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashPassword(password),
    role,
  }).returning();
  
  const { password: _, ...safeUser } = user;
  res.status(201).json(safeUser);
});

app.put("/api/users/:id", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, role } = req.body;
  
  const [user] = await db.update(schema.users)
    .set({ firstName, lastName, email: email?.toLowerCase(), role, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  
  if (!user) return res.status(404).json({ message: "User not found" });
  
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

app.put("/api/users/:id/role", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  
  const [user] = await db.update(schema.users)
    .set({ role, updatedAt: new Date() })
    .where(eq(schema.users.id, id))
    .returning();
  
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ message: "Role updated" });
});

app.delete("/api/users/:id", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { adminPassword } = req.body;
  
  if (!adminPassword) return res.status(400).json({ message: "Admin password required" });
  
  const [admin] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (admin.password !== hashPassword(adminPassword)) {
    return res.status(401).json({ message: "Invalid admin password" });
  }
  
  if (id === req.session.userId) {
    return res.status(400).json({ message: "Cannot delete yourself" });
  }
  
  await db.delete(schema.users).where(eq(schema.users.id, id));
  res.json({ message: "User deleted" });
});

// ============ TIME CARDS ============

app.get("/api/time-cards/status", requireAuth, async (req: any, res) => {
  const [active] = await db.select().from(schema.timeCards)
    .where(and(eq(schema.timeCards.userId, req.session.userId), isNull(schema.timeCards.endTime)));
  res.json({ active: !!active, currentSession: active || null });
});

app.post("/api/time-cards/clock-in", requireAuth, async (req: any, res) => {
  const [existing] = await db.select().from(schema.timeCards)
    .where(and(eq(schema.timeCards.userId, req.session.userId), isNull(schema.timeCards.endTime)));
  if (existing) return res.status(400).json({ message: "Already clocked in" });
  
  const [card] = await db.insert(schema.timeCards).values({ userId: req.session.userId }).returning();
  res.status(201).json(card);
});

app.post("/api/time-cards/clock-out", requireAuth, async (req: any, res) => {
  const { notes } = req.body;
  const [active] = await db.select().from(schema.timeCards)
    .where(and(eq(schema.timeCards.userId, req.session.userId), isNull(schema.timeCards.endTime)));
  if (!active) return res.status(400).json({ message: "Not clocked in" });
  
  const endTime = new Date();
  const totalHours = (endTime.getTime() - active.startTime.getTime()) / (1000 * 60 * 60);
  const [card] = await db.update(schema.timeCards)
    .set({ endTime, totalHours, notes })
    .where(eq(schema.timeCards.id, active.id))
    .returning();
  res.json(card);
});

app.get("/api/time-cards", requireAuth, async (req: any, res) => {
  const cards = await db.select().from(schema.timeCards)
    .where(eq(schema.timeCards.userId, req.session.userId))
    .orderBy(desc(schema.timeCards.startTime));
  res.json(cards);
});

// Admin: Get all time cards with user info
app.get("/api/admin/time-cards", requireAdmin, async (req: any, res) => {
  const { userId, startDate, endDate } = req.query;
  
  const cards = await db.query.timeCards.findMany({
    with: { user: true },
    orderBy: [desc(schema.timeCards.startTime)],
  });
  
  let filtered = cards;
  if (userId) {
    filtered = filtered.filter((c: any) => c.userId === userId);
  }
  if (startDate) {
    filtered = filtered.filter((c: any) => new Date(c.startTime) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter((c: any) => new Date(c.startTime) <= new Date(endDate as string));
  }
  
  res.json(filtered);
});

// Admin: Get calendar data for a month
app.get("/api/admin/time-cards/calendar", requireAdmin, async (req: any, res) => {
  const { year, month } = req.query;
  const y = parseInt(year as string) || new Date().getFullYear();
  const m = parseInt(month as string) || new Date().getMonth() + 1;
  
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);
  
  const cards = await db.query.timeCards.findMany({
    where: and(
      gte(schema.timeCards.startTime, startDate),
      lte(schema.timeCards.startTime, endDate)
    ),
    with: { user: true },
    orderBy: [desc(schema.timeCards.startTime)],
  });
  
  res.json(cards);
});

// Admin: Get user time card summary
app.get("/api/admin/time-cards/user/:userId", requireAdmin, async (req: any, res) => {
  const { userId } = req.params;
  const { period } = req.query; // 'day', 'week', 'month', 'year'
  
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(0);
  }
  
  const cards = await db.select().from(schema.timeCards)
    .where(and(
      eq(schema.timeCards.userId, userId),
      gte(schema.timeCards.startTime, startDate)
    ))
    .orderBy(desc(schema.timeCards.startTime));
  
  const totalHours = cards.reduce((sum, card) => sum + (card.totalHours || 0), 0);
  
  res.json({ cards, totalHours, period });
});

// ============ LOCATIONS ============

app.post("/api/locations", requireAuth, async (req: any, res) => {
  const { lat, lng } = req.body;
  const [loc] = await db.insert(schema.locations).values({ userId: req.session.userId, lat, lng }).returning();
  res.json(loc);
});

app.get("/api/locations/live", requireAuth, async (req, res) => {
  const locs = await db.query.locations.findMany({ 
    orderBy: [desc(schema.locations.timestamp)], 
    limit: 100, 
    with: { user: true } 
  });
  const seen = new Set();
  const result = locs.filter((l: any) => { 
    if (seen.has(l.userId)) return false; 
    seen.add(l.userId); 
    return true; 
  }).map((l: any) => ({ user: l.user, location: l }));
  res.json(result);
});

// ============ PROJECTS ============

app.get("/api/projects", requireAuth, async (req, res) => {
  const projects = await db.query.projects.findMany({
    with: { photos: true },
    orderBy: [desc(schema.projects.createdAt)],
  });
  res.json(projects);
});

app.post("/api/projects", requireAuth, async (req: any, res) => {
  const { name, description } = req.body;
  const [project] = await db.insert(schema.projects).values({ 
    name, 
    description,
    createdBy: req.session.userId,
  }).returning();
  res.status(201).json(project);
});

app.put("/api/projects/:id", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  
  const [project] = await db.update(schema.projects)
    .set({ name, description })
    .where(eq(schema.projects.id, parseInt(id)))
    .returning();
  
  if (!project) return res.status(404).json({ message: "Project not found" });
  res.json(project);
});

app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.delete(schema.photos).where(eq(schema.photos.projectId, parseInt(id)));
  await db.delete(schema.projects).where(eq(schema.projects.id, parseInt(id)));
  res.json({ message: "Project deleted" });
});

// ============ PHOTOS ============

app.get("/api/photos", requireAuth, async (req: any, res) => {
  const { projectId, boardId } = req.query;
  
  let whereClause;
  if (projectId) {
    whereClause = eq(schema.photos.projectId, parseInt(projectId as string));
  } else if (boardId) {
    whereClause = eq(schema.photos.boardId, parseInt(boardId as string));
  }
  
  const photos = await db.query.photos.findMany({
    where: whereClause,
    with: { user: true, project: true },
    orderBy: [desc(schema.photos.createdAt)],
  });
  res.json(photos);
});

app.post("/api/photos", requireAuth, async (req: any, res) => {
  const { url, notes, projectId, boardId, markupData, fileType } = req.body;
  const [photo] = await db.insert(schema.photos).values({ 
    userId: req.session.userId, 
    url, 
    notes, 
    projectId: projectId ? parseInt(projectId) : null,
    boardId: boardId ? parseInt(boardId) : null,
    markupData, 
    fileType: fileType || 'image',
  }).returning();
  res.status(201).json(photo);
});

app.put("/api/photos/:id", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  const { notes, markupData, isLocked } = req.body;
  
  const [existingPhoto] = await db.select().from(schema.photos).where(eq(schema.photos.id, parseInt(id)));
  if (!existingPhoto) return res.status(404).json({ message: "Photo not found" });
  
  // Check if user can edit
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  const isAdmin = user.role === 'admin';
  const isOwner = existingPhoto.userId === req.session.userId;
  
  // Check board editing permissions
  let canEdit = isAdmin || isOwner;
  if (!canEdit && existingPhoto.boardId) {
    const [board] = await db.select().from(schema.boards).where(eq(schema.boards.id, existingPhoto.boardId));
    if (board?.allowUserEditing) {
      const [membership] = await db.select().from(schema.boardMembers)
        .where(and(
          eq(schema.boardMembers.boardId, existingPhoto.boardId),
          eq(schema.boardMembers.userId, req.session.userId)
        ));
      canEdit = membership?.canEdit || false;
    }
  }
  
  if (!canEdit) return res.status(403).json({ message: "Not authorized to edit this photo" });
  if (existingPhoto.isLocked && !isAdmin) return res.status(403).json({ message: "Photo is locked" });
  
  const [photo] = await db.update(schema.photos)
    .set({ notes, markupData, isLocked: isAdmin ? isLocked : existingPhoto.isLocked })
    .where(eq(schema.photos.id, parseInt(id)))
    .returning();
  
  res.json(photo);
});

app.delete("/api/photos/:id", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  
  const [photo] = await db.select().from(schema.photos).where(eq(schema.photos.id, parseInt(id)));
  if (!photo) return res.status(404).json({ message: "Photo not found" });
  
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (photo.userId !== req.session.userId && user.role !== 'admin') {
    return res.status(403).json({ message: "Not authorized" });
  }
  
  await db.delete(schema.photos).where(eq(schema.photos.id, parseInt(id)));
  res.json({ message: "Photo deleted" });
});

// ============ BOARDS (CHATS) ============

app.get("/api/boards", requireAuth, async (req: any, res) => {
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  
  if (user.role === 'admin') {
    const boards = await db.query.boards.findMany({ 
      with: { members: { with: { user: true } } }, 
      orderBy: [desc(schema.boards.createdAt)] 
    });
    return res.json(boards);
  }
  
  // Regular users only see boards they're members of
  const memberships = await db.select().from(schema.boardMembers)
    .where(eq(schema.boardMembers.userId, req.session.userId));
  const boardIds = memberships.map(m => m.boardId);
  
  if (boardIds.length === 0) return res.json([]);
  
  const boards = await db.query.boards.findMany({
    where: inArray(schema.boards.id, boardIds),
    with: { members: { with: { user: true } } },
    orderBy: [desc(schema.boards.createdAt)],
  });
  res.json(boards);
});

app.post("/api/boards", requireAdmin, async (req: any, res) => {
  const { name, memberIds, allowUserEditing } = req.body;
  
  const [board] = await db.insert(schema.boards).values({ 
    name, 
    type: 'group',
    createdBy: req.session.userId,
    allowUserEditing: allowUserEditing || false,
  }).returning();
  
  // Add members
  if (memberIds?.length) {
    const memberValues = memberIds.map((userId: string) => ({ 
      boardId: board.id, 
      userId,
      canEdit: false,
    }));
    await db.insert(schema.boardMembers).values(memberValues);
  }
  
  // Add creator as member too
  await db.insert(schema.boardMembers).values({
    boardId: board.id,
    userId: req.session.userId,
    canEdit: true,
  }).onConflictDoNothing();
  
  const fullBoard = await db.query.boards.findFirst({
    where: eq(schema.boards.id, board.id),
    with: { members: { with: { user: true } } },
  });
  
  res.status(201).json(fullBoard);
});

app.put("/api/boards/:id", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { name, allowUserEditing } = req.body;
  
  const [board] = await db.update(schema.boards)
    .set({ name, allowUserEditing })
    .where(eq(schema.boards.id, parseInt(id)))
    .returning();
  
  if (!board) return res.status(404).json({ message: "Board not found" });
  res.json(board);
});

app.delete("/api/boards/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.delete(schema.messages).where(eq(schema.messages.boardId, parseInt(id)));
  await db.delete(schema.boardMembers).where(eq(schema.boardMembers.boardId, parseInt(id)));
  await db.delete(schema.boards).where(eq(schema.boards.id, parseInt(id)));
  res.json({ message: "Board deleted" });
});

// Board members management
app.get("/api/boards/:id/members", requireAuth, async (req, res) => {
  const { id } = req.params;
  const members = await db.query.boardMembers.findMany({
    where: eq(schema.boardMembers.boardId, parseInt(id)),
    with: { user: true },
  });
  res.json(members);
});

app.post("/api/boards/:id/members", requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { userId, canEdit } = req.body;
  
  const existing = await db.select().from(schema.boardMembers)
    .where(and(
      eq(schema.boardMembers.boardId, parseInt(id)),
      eq(schema.boardMembers.userId, userId)
    ));
  
  if (existing.length > 0) {
    return res.status(400).json({ message: "User already a member" });
  }
  
  const [member] = await db.insert(schema.boardMembers).values({
    boardId: parseInt(id),
    userId,
    canEdit: canEdit || false,
  }).returning();
  
  res.status(201).json(member);
});

app.put("/api/boards/:id/members/:userId", requireAdmin, async (req: any, res) => {
  const { id, odId } = req.params;
  const { canEdit } = req.body;
  
  const [member] = await db.update(schema.boardMembers)
    .set({ canEdit })
    .where(and(
      eq(schema.boardMembers.boardId, parseInt(id)),
      eq(schema.boardMembers.userId, req.params.userId)
    ))
    .returning();
  
  if (!member) return res.status(404).json({ message: "Member not found" });
  res.json(member);
});

app.delete("/api/boards/:id/members/:userId", requireAdmin, async (req, res) => {
  const { id, userId } = req.params;
  
  await db.delete(schema.boardMembers)
    .where(and(
      eq(schema.boardMembers.boardId, parseInt(id)),
      eq(schema.boardMembers.userId, userId)
    ));
  
  res.json({ message: "Member removed" });
});

// ============ MESSAGES ============

app.get("/api/boards/:id/messages", requireAuth, async (req: any, res) => {
  const { id } = req.params;
  
  // Check if user has access to this board
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (user.role !== 'admin') {
    const [membership] = await db.select().from(schema.boardMembers)
      .where(and(
        eq(schema.boardMembers.boardId, parseInt(id)),
        eq(schema.boardMembers.userId, req.session.userId)
      ));
    if (!membership) return res.status(403).json({ message: "Not a member of this board" });
  }
  
  const messages = await db.query.messages.findMany({ 
    where: eq(schema.messages.boardId, parseInt(id)), 
    orderBy: [desc(schema.messages.createdAt)], 
    limit: 100, 
    with: { sender: true, photo: true } 
  });
  res.json(messages.reverse());
});

app.post("/api/messages", requireAuth, async (req: any, res) => {
  const { boardId, content, photoId } = req.body;
  
  // Check if user has access to this board
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, req.session.userId));
  if (user.role !== 'admin') {
    const [membership] = await db.select().from(schema.boardMembers)
      .where(and(
        eq(schema.boardMembers.boardId, boardId),
        eq(schema.boardMembers.userId, req.session.userId)
      ));
    if (!membership) return res.status(403).json({ message: "Not a member of this board" });
  }
  
  const [msg] = await db.insert(schema.messages).values({ 
    senderId: req.session.userId, 
    boardId, 
    content, 
    photoId 
  }).returning();
  
  const fullMessage = await db.query.messages.findFirst({
    where: eq(schema.messages.id, msg.id),
    with: { sender: true, photo: true },
  });
  
  res.status(201).json(fullMessage);
});

// ============ STATIC FILES ============

const distPath = path.resolve(__dirname, "public");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
}

const port = parseInt(process.env.PORT || "5000");
app.listen(port, "0.0.0.0", () => console.log(`Server running on port ${port}`));
