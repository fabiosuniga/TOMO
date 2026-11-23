export interface Book {
  id: string;
  title: string;
  originalTitle?: string;
  author: string;
  year: number;
  pages: number;
  coverUrl: string;
  backdropUrl?: string;
  synopsis: string;
  genres: string[];
  isbn?: string;
  publisher?: string;
  avgRating: number;
  ratingsCount: number;
  logsCount: number;
  likesCount: number;
}

export type ReadingStatus = "WANT_TO_READ" | "READING" | "READ" | "ABANDONED";

export interface BookStatusEntry {
  bookId: string;
  status: ReadingStatus;
  currentPage: number;
  rating: number | null; // 0.5 to 5.0 in 0.5 steps
  liked: boolean;
  isFavorite: boolean; // Up to 4 favorites on profile (Letterboxd style)
  updatedAt: string;
}

export interface DiaryLog {
  id: string;
  bookId: string;
  userName: string;
  userHandle: string;
  userAvatar: string;
  readDate: string; // YYYY-MM-DD
  rating: number | null; // 0.5 to 5.0
  liked: boolean;
  isReread: boolean;
  containSpoilers: boolean;
  reviewText: string;
  pagesReadInSession?: number;
  createdAt: string;
  likesReceived: number;
}

export interface BookNote {
  id: string;
  bookId: string;
  pageNumber: number | null;
  chapter?: string;
  quoteText?: string;
  noteText: string;
  tag: "CITAÇÃO" | "REFLEXÃO" | "PERSONAGEM" | "TEORIA" | "DESTAQUE";
  createdAt: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  date: string; // YYYY-MM-DD
  pagesRead: number;
  minutesSpent?: number;
}

export interface ReadingList {
  id: string;
  title: string;
  description: string;
  bookIds: string[];
  createdAt: string;
  likesCount: number;
}

export interface UserProfile {
  name: string;
  handle: string;
  bio: string;
  location: string;
  avatarUrl: string;
  yearlyGoalBooks: number;
  dailyGoalPages: number;
  favoriteBookIds: string[]; // Max 4
}

export interface AppStateResponse {
  profile: UserProfile;
  books: Book[];
  statuses: Record<string, BookStatusEntry>;
  diaryLogs: DiaryLog[];
  notes: BookNote[];
  sessions: ReadingSession[];
  lists: ReadingList[];
  stats: {
    booksReadThisYear: number;
    pagesReadThisYear: number;
    pagesReadToday: number;
    currentStreakDays: number;
    activeDaysMap: Record<string, number>; // YYYY-MM-DD -> pagesRead
    ratingDistribution: Record<string, number>; // "0.5" .. "5" -> count
  };
}
