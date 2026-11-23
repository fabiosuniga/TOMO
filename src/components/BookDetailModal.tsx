"use client";

import React, { useState } from "react";
import { Book, BookNote, BookStatusEntry, DiaryLog, ReadingStatus } from "@/types/tomo";
import { NativeModal } from "./NativeModal";
import { StarGlyphDisplay, StarRating } from "./StarRating";
import {
  Award,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Eye,
  Heart,
  NotebookPen,
  Plus,
  Quote,
  Sparkles,
  Trash2,
} from "lucide-react";

interface BookDetailModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  statusEntry?: BookStatusEntry;
  diaryLogs: DiaryLog[];
  notes: BookNote[];
  onUpdateStatus: (bookId: string, partial: Partial<BookStatusEntry>, book: Book) => Promise<void>;
  onAddNote: (note: Omit<BookNote, "id" | "createdAt">) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onOpenLogModalForBook: (book: Book) => void;
}

export function BookDetailModal({
  book,
  isOpen,
  onClose,
  statusEntry,
  diaryLogs,
  notes,
  onUpdateStatus,
  onAddNote,
  onDeleteNote,
  onOpenLogModalForBook,
}: BookDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"REVIEWS" | "NOTES">("NOTES");
  const [pageInput, setPageInput] = useState<string>("");

  // New note form state
  const [notePage, setNotePage] = useState<string>("");
  const [noteChapter, setNoteChapter] = useState<string>("");
  const [quoteText, setQuoteText] = useState<string>("");
  const [noteText, setNoteText] = useState<string>("");
  const [noteTag, setNoteTag] = useState<BookNote["tag"]>("CITAÇÃO");
  const [isSavingNote, setIsSavingNote] = useState(false);

  if (!book) return null;

  const bookNotes = notes.filter((n) => n.bookId === book.id);
  const bookLogs = diaryLogs.filter((l) => l.bookId === book.id);

  const currentStatus: ReadingStatus = statusEntry?.status || "WANT_TO_READ";
  const isRead = statusEntry?.status === "READ";
  const isReading = statusEntry?.status === "READING";
  const isWant = statusEntry?.status === "WANT_TO_READ";
  const isLiked = statusEntry?.liked || false;
  const isFavorite = statusEntry?.isFavorite || false;
  const currentPage = statusEntry?.currentPage || 0;
  const progressPct =
    book.pages > 0 ? Math.min(100, Math.round((currentPage / book.pages) * 100)) : 0;

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() && !quoteText.trim()) return;
    setIsSavingNote(true);
    try {
      await onAddNote({
        bookId: book.id,
        pageNumber: notePage ? Number(notePage) : null,
        chapter: noteChapter.trim() || undefined,
        quoteText: quoteText.trim() || undefined,
        noteText: noteText.trim(),
        tag: noteTag,
      });
      setNotePage("");
      setNoteChapter("");
      setQuoteText("");
      setNoteText("");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(pageInput);
    if (isNaN(parsed) || parsed < 0) return;
    const clamped = Math.min(book.pages, parsed);
    await onUpdateStatus(
      book.id,
      {
        status: clamped >= book.pages ? "READ" : "READING",
        currentPage: clamped,
      },
      book
    );
    setPageInput("");
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      subtitle={`${book.author} • ${book.year}`}
      title={book.title}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Top Hero Layout: Poster + Synopsis + Letterboxd Action Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Poster Column */}
          <div className="md:col-span-3 flex flex-col items-center md:items-start">
            <div className="book-cover-frame book-spine-effect w-40 md:w-full aspect-[2/3] bg-tomo-card">
              {book.coverUrl && (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="mt-3 w-full flex items-center justify-between text-xs font-mono text-tomo-text px-1">
              <span>{book.pages} páginas</span>
              <span>★ {book.avgRating.toFixed(1)} média</span>
            </div>
          </div>

          {/* Center Synopsis & Genres */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {book.genres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-0.5 rounded-full bg-tomo-card border border-tomo-border text-[11px] font-mono text-tomo-light"
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="text-sm text-tomo-light/90 leading-relaxed font-sans">
              {book.synopsis}
            </p>

            {book.publisher && (
              <p className="text-xs font-mono text-tomo-text">
                Editora: <span className="text-tomo-light">{book.publisher}</span>
                {book.isbn ? ` • ISBN ${book.isbn}` : ""}
              </p>
            )}

            {/* Reading Progress Box */}
            <div className="p-3.5 rounded-xl bg-tomo-bg/90 border border-tomo-border space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono uppercase tracking-wider text-tomo-amber flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Progresso de Leitura
                </span>
                <span className="font-mono font-bold text-tomo-light">
                  Pág. {currentPage} de {book.pages} ({progressPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-tomo-card overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-tomo-amber to-tomo-green transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <form onSubmit={handleProgressUpdate} className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={0}
                  max={book.pages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder={`Atualizar pág. (atual: ${currentPage})`}
                  className="flex-1 px-2.5 py-1.5 rounded bg-tomo-surface border border-tomo-border text-xs text-tomo-light font-mono focus:outline-none focus:border-tomo-amber"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-tomo-amber/20 hover:bg-tomo-amber/30 text-tomo-amber border border-tomo-amber/40 text-xs font-mono font-semibold transition-colors"
                >
                  Atualizar Pág.
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Letterboxd Console Card */}
          <div className="md:col-span-4">
            <div className="rounded-xl bg-tomo-bg border border-tomo-border overflow-hidden divide-y divide-tomo-border">
              {/* Row 1: Quick Status Toggles (Lido / Lendo / Quero Ler / Amei) */}
              <div className="grid grid-cols-4 divide-x divide-tomo-border text-center">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(
                      book.id,
                      {
                        status: "READ",
                        currentPage: book.pages,
                      },
                      book
                    )
                  }
                  className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                    isRead
                      ? "bg-tomo-green/10 text-tomo-green"
                      : "text-tomo-text hover:text-tomo-light hover:bg-tomo-surface"
                  }`}
                >
                  <Eye className="w-5 h-5" />
                  <span className="text-[10px] font-mono uppercase">Lido</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(
                      book.id,
                      {
                        status: "READING",
                        currentPage: currentPage > 0 && currentPage < book.pages ? currentPage : 15,
                      },
                      book
                    )
                  }
                  className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                    isReading
                      ? "bg-tomo-amber/10 text-tomo-amber"
                      : "text-tomo-text hover:text-tomo-light hover:bg-tomo-surface"
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] font-mono uppercase">Lendo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateStatus(book.id, { liked: !isLiked }, book)}
                  className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                    isLiked
                      ? "bg-tomo-amber/10 text-tomo-amber"
                      : "text-tomo-text hover:text-tomo-light hover:bg-tomo-surface"
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                  <span className="text-[10px] font-mono uppercase">Amei</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateStatus(
                      book.id,
                      {
                        status: "WANT_TO_READ",
                        currentPage: 0,
                      },
                      book
                    )
                  }
                  className={`py-3 flex flex-col items-center gap-1 transition-colors ${
                    isWant
                      ? "bg-tomo-blue/10 text-tomo-blue"
                      : "text-tomo-text hover:text-tomo-light hover:bg-tomo-surface"
                  }`}
                >
                  <BookMarked className="w-5 h-5" />
                  <span className="text-[10px] font-mono uppercase">Para Ler</span>
                </button>
              </div>

              {/* Row 2: Half-Star Rating Selector */}
              <div className="p-3.5 flex flex-col items-center justify-center gap-1.5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-tomo-text">
                  {statusEntry?.rating ? `Avaliado: ${statusEntry.rating} ★` : "Avaliar Livro"}
                </span>
                <StarRating
                  value={statusEntry?.rating ?? null}
                  onChange={(newRating) =>
                    onUpdateStatus(
                      book.id,
                      {
                        rating: newRating,
                        status: currentStatus === "WANT_TO_READ" ? "READ" : currentStatus,
                      },
                      book
                    )
                  }
                  size="lg"
                />
              </div>

              {/* Row 3: Pin to Profile 4 Favorites */}
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-tomo-text flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-tomo-amber" />
                  Estante de 4 Favoritos
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateStatus(book.id, { isFavorite: !isFavorite }, book)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    isFavorite
                      ? "bg-tomo-amber/20 text-tomo-amber border border-tomo-amber/40"
                      : "bg-tomo-card text-tomo-text hover:text-tomo-light"
                  }`}
                >
                  {isFavorite ? "★ Nos Favoritos" : "Fixar no Perfil"}
                </button>
              </div>

              {/* Row 4: Log or Review Action Button */}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogModalForBook(book);
                  }}
                  className="w-full py-2.5 px-4 rounded-lg bg-tomo-green hover:bg-[#00c84b] text-tomo-bg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Registrar ou Escrever Review...
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Caderno de Anotações & Citações vs Resenhas do Diário */}
        <div className="border-t border-tomo-border pt-5">
          <div className="flex items-center gap-3 border-b border-tomo-border pb-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("NOTES")}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeTab === "NOTES"
                  ? "bg-tomo-amber text-tomo-bg font-bold"
                  : "bg-tomo-bg text-tomo-text hover:text-tomo-light"
              }`}
            >
              <NotebookPen className="w-4 h-4" />
              Caderno de Notas & Citações ({bookNotes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("REVIEWS")}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-colors ${
                activeTab === "REVIEWS"
                  ? "bg-tomo-green text-tomo-bg font-bold"
                  : "bg-tomo-bg text-tomo-text hover:text-tomo-light"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Diário & Reviews da Comunidade ({bookLogs.length})
            </button>
          </div>

          {activeTab === "NOTES" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Form to add note/quote */}
              <form
                onSubmit={handleSaveNote}
                className="lg:col-span-5 p-4 rounded-xl bg-tomo-bg border border-tomo-border space-y-3.5 h-fit"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm text-tomo-light flex items-center gap-2">
                    <Quote className="w-4 h-4 text-tomo-amber" />
                    Nova Anotação no Caderno
                  </h3>
                  <span className="text-[10px] font-mono text-tomo-text">Salvo no SQLite</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                      Página
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={book.pages}
                      value={notePage}
                      onChange={(e) => setNotePage(e.target.value)}
                      placeholder="Ex: 62"
                      className="w-full px-2.5 py-1.5 rounded bg-tomo-surface border border-tomo-border text-xs text-tomo-light font-mono focus:outline-none focus:border-tomo-amber"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                      Capítulo ou Seção
                    </label>
                    <input
                      type="text"
                      value={noteChapter}
                      onChange={(e) => setNoteChapter(e.target.value)}
                      placeholder="Ex: Cap. XII - A Ressaca"
                      className="w-full px-2.5 py-1.5 rounded bg-tomo-surface border border-tomo-border text-xs text-tomo-light focus:outline-none focus:border-tomo-amber"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                    Tipo de Registro
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["CITAÇÃO", "REFLEXÃO", "PERSONAGEM", "TEORIA", "DESTAQUE"] as const).map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setNoteTag(tag)}
                          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                            noteTag === tag
                              ? "bg-tomo-amber text-tomo-bg font-bold"
                              : "bg-tomo-surface text-tomo-text hover:text-tomo-light border border-tomo-border"
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                    Trecho / Citação Sublinhada (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    placeholder="“Transcreva aqui a frase do livro que você sublinhou...”"
                    className="w-full p-2.5 rounded bg-tomo-surface border border-tomo-border text-xs font-serif italic text-tomo-paper placeholder:text-tomo-text/50 focus:outline-none focus:border-tomo-amber"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                    Sua Anotação Pessoal
                  </label>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="O que essa passagem despertou? Conexões, análise ou lembrete..."
                    className="w-full p-2.5 rounded bg-tomo-surface border border-tomo-border text-xs text-tomo-light placeholder:text-tomo-text/50 focus:outline-none focus:border-tomo-amber"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="w-full py-2 rounded-lg bg-tomo-amber hover:bg-[#e67300] text-tomo-bg font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  {isSavingNote ? "Guardando..." : "Guardar no Caderno"}
                </button>
              </form>

              {/* Right: Saved notes list */}
              <div className="lg:col-span-7 space-y-3">
                {bookNotes.length === 0 ? (
                  <div className="p-8 rounded-xl bg-tomo-bg/50 border border-dashed border-tomo-border text-center space-y-2">
                    <NotebookPen className="w-8 h-8 text-tomo-text mx-auto opacity-60" />
                    <p className="text-sm font-serif text-tomo-light">
                      Seu caderno para {book.title} ainda está em branco.
                    </p>
                    <p className="text-xs text-tomo-text">
                      Sublinhe uma citação, anote uma teoria ou registre o número da página ao lado.
                    </p>
                  </div>
                ) : (
                  bookNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl bg-tomo-bg border border-tomo-border hover:border-tomo-amber/40 transition-colors space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-tomo-amber/15 text-tomo-amber font-mono text-[10px] font-bold">
                            {note.tag}
                          </span>
                          {note.pageNumber && (
                            <span className="text-xs font-mono text-tomo-light font-semibold">
                              Pág. {note.pageNumber}
                            </span>
                          )}
                          {note.chapter && (
                            <span className="text-xs text-tomo-text">• {note.chapter}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-tomo-text">
                            {note.createdAt}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            title="Excluir anotação"
                            className="p-1 text-tomo-text hover:text-tomo-crimson transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {note.quoteText && (
                        <blockquote className="pl-3.5 border-l-2 border-tomo-amber font-serif italic text-sm text-tomo-paper leading-relaxed">
                          “{note.quoteText}”
                        </blockquote>
                      )}

                      {note.noteText && (
                        <p className="text-xs text-tomo-light/90 leading-relaxed">
                          {note.noteText}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {bookLogs.length === 0 ? (
                <div className="p-8 rounded-xl bg-tomo-bg/50 border border-dashed border-tomo-border text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-tomo-text mx-auto opacity-60" />
                  <p className="text-sm font-serif text-tomo-light">
                    Nenhuma review registrada no diário para este livro ainda.
                  </p>
                </div>
              ) : (
                bookLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-tomo-bg border border-tomo-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={log.userAvatar}
                          alt={log.userName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-tomo-light">{log.userName}</span>
                        <StarGlyphDisplay rating={log.rating} liked={log.liked} />
                      </div>
                      <span className="text-xs font-mono text-tomo-text">
                        Lido em {log.readDate}
                      </span>
                    </div>
                    <p className="text-sm text-tomo-light/90 leading-relaxed font-serif">
                      {log.reviewText}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </NativeModal>
  );
}
