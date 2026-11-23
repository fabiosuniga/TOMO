import { NextRequest, NextResponse } from "next/server";
import {
  addBookNote,
  addCustomBook,
  addDiaryLog,
  createReadingList,
  deleteBookNote,
  getAppState,
  logReadingSession,
  toggleDiaryLike,
  updateBookStatus,
  updateProfileGoals,
} from "@/lib/db";

export async function GET() {
  try {
    const state = getAppState();
    return NextResponse.json(state);
  } catch (err) {
    console.error("Failed to load Tomo state:", err);
    return NextResponse.json({ error: "Erro ao carregar banco de dados" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case "UPDATE_STATUS": {
        const state = updateBookStatus(payload.bookId, payload.partial, payload.book);
        return NextResponse.json(state);
      }
      case "ADD_DIARY_LOG": {
        const state = addDiaryLog(payload.entry, payload.markAsRead, payload.book);
        return NextResponse.json(state);
      }
      case "ADD_NOTE": {
        const state = addBookNote(payload.note);
        return NextResponse.json(state);
      }
      case "DELETE_NOTE": {
        const state = deleteBookNote(payload.noteId);
        return NextResponse.json(state);
      }
      case "LOG_SESSION": {
        const state = logReadingSession(payload.bookId, Number(payload.pagesRead), payload.minutesSpent);
        return NextResponse.json(state);
      }
      case "ADD_BOOK": {
        const state = addCustomBook(payload.book);
        return NextResponse.json(state);
      }
      case "UPDATE_GOALS": {
        const state = updateProfileGoals(
          Number(payload.yearlyGoalBooks),
          Number(payload.dailyGoalPages),
          payload.bio
        );
        return NextResponse.json(state);
      }
      case "CREATE_LIST": {
        const state = createReadingList(payload.title, payload.description, payload.bookIds);
        return NextResponse.json(state);
      }
      case "LIKE_DIARY": {
        const state = toggleDiaryLike(payload.logId);
        return NextResponse.json(state);
      }
      default:
        return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    console.error("API action error:", err);
    return NextResponse.json({ error: "Falha ao processar ação" }, { status: 500 });
  }
}
