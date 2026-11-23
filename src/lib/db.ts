import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import {
  AppStateResponse,
  Book,
  BookNote,
  BookStatusEntry,
  DiaryLog,
  ReadingList,
  ReadingSession,
  UserProfile,
} from "@/types/tomo";
import {
  INITIAL_BOOKS,
  INITIAL_PROFILE,
  getInitialDiaryLogs,
  getInitialLists,
  getInitialNotes,
  getInitialSessions,
  getInitialStatuses,
} from "./seed-data";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tomo.sqlite");

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if seeded
  const checkStmt = db.prepare("SELECT value FROM kv_store WHERE key = ?");
  const row = checkStmt.get("initialized") as { value: string } | undefined;

  if (!row) {
    const insertStmt = db.prepare("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)");
    insertStmt.run("profile", JSON.stringify(INITIAL_PROFILE));
    insertStmt.run("books", JSON.stringify(INITIAL_BOOKS));
    insertStmt.run("statuses", JSON.stringify(getInitialStatuses()));
    insertStmt.run("diaryLogs", JSON.stringify(getInitialDiaryLogs()));
    insertStmt.run("notes", JSON.stringify(getInitialNotes()));
    insertStmt.run("sessions", JSON.stringify(getInitialSessions()));
    insertStmt.run("lists", JSON.stringify(getInitialLists()));
    insertStmt.run("initialized", "true");
  }

  dbInstance = db;
  return db;
}

function readKey<T>(key: string, fallback: T): T {
  const db = getDb();
  const stmt = db.prepare("SELECT value FROM kv_store WHERE key = ?");
  const row = stmt.get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

function writeKey<T>(key: string, data: T): void {
  const db = getDb();
  const stmt = db.prepare("INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)");
  stmt.run(key, JSON.stringify(data));
}

function calculateStats(
  statuses: Record<string, BookStatusEntry>,
  diaryLogs: DiaryLog[],
  sessions: ReadingSession[]
) {
  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = todayStr.slice(0, 4);

  const activeDaysMap: Record<string, number> = {};
  for (const s of sessions) {
    activeDaysMap[s.date] = (activeDaysMap[s.date] || 0) + s.pagesRead;
  }
  for (const log of diaryLogs) {
    if (log.userHandle === "clarav") {
      activeDaysMap[log.readDate] = (activeDaysMap[log.readDate] || 0) + (log.pagesReadInSession || 25);
    }
  }

  const pagesReadToday = activeDaysMap[todayStr] || 0;

  let pagesReadThisYear = 0;
  for (const [dateStr, pages] of Object.entries(activeDaysMap)) {
    if (dateStr.startsWith(currentYear)) {
      pagesReadThisYear += pages;
    }
  }

  const readBookIdsThisYear = new Set<string>();
  for (const status of Object.values(statuses)) {
    if (status.status === "READ" && status.updatedAt.startsWith(currentYear)) {
      readBookIdsThisYear.add(status.bookId);
    }
  }
  for (const log of diaryLogs) {
    if (log.userHandle === "clarav" && log.readDate.startsWith(currentYear)) {
      readBookIdsThisYear.add(log.bookId);
    }
  }

  // Calculate streak (consecutive days up to today or yesterday)
  let streak = 0;
  const cursor = new Date();
  const todayActive = (activeDaysMap[todayStr] || 0) > 0;
  if (!todayActive) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const dStr = cursor.toISOString().split("T")[0];
    if ((activeDaysMap[dStr] || 0) > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Rating distribution ("0.5" to "5")
  const ratingDistribution: Record<string, number> = {
    "0.5": 0,
    "1": 0,
    "1.5": 0,
    "2": 0,
    "2.5": 0,
    "3": 0,
    "3.5": 0,
    "4": 0,
    "4.5": 0,
    "5": 0,
  };

  for (const st of Object.values(statuses)) {
    if (st.rating !== null && st.rating > 0) {
      const key = String(st.rating);
      if (key in ratingDistribution) {
        ratingDistribution[key]++;
      }
    }
  }

  return {
    booksReadThisYear: readBookIdsThisYear.size,
    pagesReadThisYear,
    pagesReadToday,
    currentStreakDays: streak,
    activeDaysMap,
    ratingDistribution,
  };
}

export function getAppState(): AppStateResponse {
  const profile = readKey<UserProfile>("profile", INITIAL_PROFILE);
  const books = readKey<Book[]>("books", INITIAL_BOOKS);
  const statuses = readKey<Record<string, BookStatusEntry>>("statuses", getInitialStatuses());
  const diaryLogs = readKey<DiaryLog[]>("diaryLogs", getInitialDiaryLogs());
  const notes = readKey<BookNote[]>("notes", getInitialNotes());
  const sessions = readKey<ReadingSession[]>("sessions", getInitialSessions());
  const lists = readKey<ReadingList[]>("lists", getInitialLists());

  const stats = calculateStats(statuses, diaryLogs, sessions);

  return {
    profile,
    books,
    statuses,
    diaryLogs,
    notes,
    sessions,
    lists,
    stats,
  };
}

export function updateBookStatus(
  bookId: string,
  partial: Partial<BookStatusEntry>,
  newBookIfImported?: Book
): AppStateResponse {
  const books = readKey<Book[]>("books", INITIAL_BOOKS);
  if (newBookIfImported && !books.some((b) => b.id === newBookIfImported.id)) {
    books.unshift(newBookIfImported);
    writeKey("books", books);
  }

  const statuses = readKey<Record<string, BookStatusEntry>>("statuses", getInitialStatuses());
  const book = books.find((b) => b.id === bookId);
  const todayStr = new Date().toISOString().split("T")[0];

  const existing: BookStatusEntry = statuses[bookId] || {
    bookId,
    status: "WANT_TO_READ",
    currentPage: 0,
    rating: null,
    liked: false,
    isFavorite: false,
    updatedAt: todayStr,
  };

  const prevPage = existing.currentPage;
  const updated: BookStatusEntry = {
    ...existing,
    ...partial,
    bookId,
    updatedAt: todayStr,
  };

  if (updated.status === "READ" && book && updated.currentPage === 0) {
    updated.currentPage = book.pages;
  }

  statuses[bookId] = updated;
  writeKey("statuses", statuses);

  // Sync favorites with profile
  if (partial.isFavorite !== undefined) {
    const profile = readKey<UserProfile>("profile", INITIAL_PROFILE);
    if (partial.isFavorite) {
      if (!profile.favoriteBookIds.includes(bookId)) {
        profile.favoriteBookIds = [...profile.favoriteBookIds, bookId].slice(-4);
      }
    } else {
      profile.favoriteBookIds = profile.favoriteBookIds.filter((id) => id !== bookId);
    }
    writeKey("profile", profile);
  }

  // If currentPage increased, record a reading session automatically!
  if (updated.currentPage > prevPage) {
    const diff = updated.currentPage - prevPage;
    const sessions = readKey<ReadingSession[]>("sessions", getInitialSessions());
    sessions.unshift({
      id: `ses-${Date.now()}`,
      bookId,
      date: todayStr,
      pagesRead: diff,
      minutesSpent: Math.max(5, Math.round(diff * 1.4)),
    });
    writeKey("sessions", sessions);
  }

  return getAppState();
}

export function addDiaryLog(
  entry: Omit<DiaryLog, "id" | "createdAt" | "likesReceived" | "userName" | "userHandle" | "userAvatar">,
  markAsRead = true,
  newBookIfImported?: Book
): AppStateResponse {
  const profile = readKey<UserProfile>("profile", INITIAL_PROFILE);
  const books = readKey<Book[]>("books", INITIAL_BOOKS);

  if (newBookIfImported && !books.some((b) => b.id === newBookIfImported.id)) {
    books.unshift(newBookIfImported);
    writeKey("books", books);
  }

  const book = books.find((b) => b.id === entry.bookId);
  const diaryLogs = readKey<DiaryLog[]>("diaryLogs", getInitialDiaryLogs());
  const todayStr = new Date().toISOString().split("T")[0];

  const newLog: DiaryLog = {
    ...entry,
    id: `log-${Date.now()}`,
    userName: profile.name,
    userHandle: profile.handle,
    userAvatar: profile.avatarUrl,
    createdAt: todayStr,
    likesReceived: 1,
  };

  diaryLogs.unshift(newLog);
  writeKey("diaryLogs", diaryLogs);

  // Also update status for this book
  const statuses = readKey<Record<string, BookStatusEntry>>("statuses", getInitialStatuses());
  const existing = statuses[entry.bookId];
  statuses[entry.bookId] = {
    bookId: entry.bookId,
    status: markAsRead ? "READ" : existing?.status || "READING",
    currentPage: markAsRead ? book?.pages || existing?.currentPage || 200 : existing?.currentPage || 0,
    rating: entry.rating ?? existing?.rating ?? null,
    liked: entry.liked ?? existing?.liked ?? false,
    isFavorite: existing?.isFavorite ?? false,
    updatedAt: entry.readDate || todayStr,
  };
  writeKey("statuses", statuses);

  // Record reading session if pagesReadInSession > 0
  if (entry.pagesReadInSession && entry.pagesReadInSession > 0) {
    const sessions = readKey<ReadingSession[]>("sessions", getInitialSessions());
    sessions.unshift({
      id: `ses-${Date.now()}`,
      bookId: entry.bookId,
      date: entry.readDate || todayStr,
      pagesRead: entry.pagesReadInSession,
      minutesSpent: Math.round(entry.pagesReadInSession * 1.4),
    });
    writeKey("sessions", sessions);
  }

  return getAppState();
}

export function addBookNote(note: Omit<BookNote, "id" | "createdAt">): AppStateResponse {
  const notes = readKey<BookNote[]>("notes", getInitialNotes());
  const todayStr = new Date().toISOString().split("T")[0];

  const newNote: BookNote = {
    ...note,
    id: `note-${Date.now()}`,
    createdAt: todayStr,
  };

  notes.unshift(newNote);
  writeKey("notes", notes);
  return getAppState();
}

export function deleteBookNote(noteId: string): AppStateResponse {
  const notes = readKey<BookNote[]>("notes", getInitialNotes());
  writeKey(
    "notes",
    notes.filter((n) => n.id !== noteId)
  );
  return getAppState();
}

export function logReadingSession(bookId: string, pagesRead: number, minutesSpent?: number): AppStateResponse {
  const todayStr = new Date().toISOString().split("T")[0];
  const sessions = readKey<ReadingSession[]>("sessions", getInitialSessions());
  const books = readKey<Book[]>("books", INITIAL_BOOKS);
  const statuses = readKey<Record<string, BookStatusEntry>>("statuses", getInitialStatuses());

  sessions.unshift({
    id: `ses-${Date.now()}`,
    bookId,
    date: todayStr,
    pagesRead,
    minutesSpent: minutesSpent || Math.round(pagesRead * 1.4),
  });
  writeKey("sessions", sessions);

  const book = books.find((b) => b.id === bookId);
  const existing = statuses[bookId] || {
    bookId,
    status: "READING",
    currentPage: 0,
    rating: null,
    liked: false,
    isFavorite: false,
    updatedAt: todayStr,
  };

  const maxPages = book?.pages || 9999;
  const nextPage = Math.min(maxPages, existing.currentPage + pagesRead);
  const nextStatus = book && nextPage >= book.pages ? "READ" : "READING";

  statuses[bookId] = {
    ...existing,
    status: nextStatus,
    currentPage: nextPage,
    updatedAt: todayStr,
  };
  writeKey("statuses", statuses);

  return getAppState();
}

export function addCustomBook(book: Book): AppStateResponse {
  const books = readKey<Book[]>("books", INITIAL_BOOKS);
  if (!books.some((b) => b.id === book.id)) {
    books.unshift(book);
    writeKey("books", books);
  }
  return getAppState();
}

export function updateProfileGoals(yearlyGoalBooks: number, dailyGoalPages: number, bio?: string): AppStateResponse {
  const profile = readKey<UserProfile>("profile", INITIAL_PROFILE);
  profile.yearlyGoalBooks = Math.max(1, yearlyGoalBooks);
  profile.dailyGoalPages = Math.max(1, dailyGoalPages);
  if (bio !== undefined) profile.bio = bio;
  writeKey("profile", profile);
  return getAppState();
}

export function createReadingList(title: string, description: string, bookIds: string[]): AppStateResponse {
  const lists = readKey<ReadingList[]>("lists", getInitialLists());
  const todayStr = new Date().toISOString().split("T")[0];
  lists.unshift({
    id: `list-${Date.now()}`,
    title,
    description,
    bookIds,
    createdAt: todayStr,
    likesCount: 1,
  });
  writeKey("lists", lists);
  return getAppState();
}

export function toggleDiaryLike(logId: string): AppStateResponse {
  const diaryLogs = readKey<DiaryLog[]>("diaryLogs", getInitialDiaryLogs());
  const updated = diaryLogs.map((l) =>
    l.id === logId ? { ...l, likesReceived: l.likesReceived + 1 } : l
  );
  writeKey("diaryLogs", updated);
  return getAppState();
}
