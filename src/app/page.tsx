"use client";

import React, { useEffect, useState } from "react";
import {
  AppStateResponse,
  Book,
  BookNote,
  BookStatusEntry,
} from "@/types/tomo";
import { BookPosterCard } from "@/components/BookPosterCard";
import { StarGlyphDisplay } from "@/components/StarRating";
import { LogBookModal } from "@/components/LogBookModal";
import { BookDetailModal } from "@/components/BookDetailModal";
import { ReadingIncentiveHub } from "@/components/ReadingIncentiveHub";
import {
  Award,
  BarChart3,
  BookMarked,
  BookOpen,
  Calendar,
  Compass,
  Flame,
  Heart,
  Library,
  ListChecks,
  NotebookPen,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Sparkles,
  User,
} from "lucide-react";

type NavTab = "DESCOBRIR" | "DIARIO" | "CADERNO" | "INCENTIVO" | "PERFIL";

export default function TomoHomePage() {
  const [state, setState] = useState<AppStateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>("DESCOBRIR");

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("TODOS");
  const [shelfFilter, setShelfFilter] = useState<"ALL" | "READ" | "READING" | "WANT_TO_READ" | "LIKED">("ALL");
  const [globalResults, setGlobalResults] = useState<Book[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // Modals
  const [activeBookForDetail, setActiveBookForDetail] = useState<Book | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [bookToPreselectInLog, setBookToPreselectInLog] = useState<Book | null>(null);

  // Quick note filter in Caderno tab
  const [noteBookFilter, setNoteBookFilter] = useState<string>("ALL");
  const [noteTagFilter, setNoteTagFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/tomo")
      .then((r) => r.json())
      .then((data: AppStateResponse) => setState(data))
      .catch((err) => console.error("Erro ao carregar Tomo:", err));
  }, []);

  const mutateApi = async (action: string, payload: unknown) => {
    const res = await fetch("/api/tomo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload }),
    });
    if (res.ok) {
      const updated: AppStateResponse = await res.json();
      setState(updated);
    }
  };

  const handleUpdateStatus = async (
    bookId: string,
    partial: Partial<BookStatusEntry>,
    book?: Book
  ) => {
    await mutateApi("UPDATE_STATUS", { bookId, partial, book });
  };

  const handleQuickToggleStatus = async (
    book: Book,
    targetStatus: "READ" | "WANT_TO_READ" | "READING"
  ) => {
    if (!state) return;
    const current = state.statuses[book.id];
    const nextStatus = current?.status === targetStatus ? "WANT_TO_READ" : targetStatus;
    await handleUpdateStatus(
      book.id,
      {
        status: nextStatus,
        currentPage: nextStatus === "READ" ? book.pages : current?.currentPage || 0,
      },
      book
    );
  };

  const handleQuickToggleLike = async (book: Book) => {
    if (!state) return;
    const current = state.statuses[book.id];
    await handleUpdateStatus(book.id, { liked: !current?.liked }, book);
  };

  const handleSearchOpenLibraryCatalog = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingGlobal(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      const data = await res.json();
      const mapped: Book[] = (data.docs || []).map((doc: Record<string, unknown>, idx: number) => {
        const coverId = doc.cover_i as number | undefined;
        const rawKey = String(doc.key || `ol-${Date.now()}-${idx}`).replace("/works/", "");
        return {
          id: `ol-${rawKey.toLowerCase()}`,
          title: String(doc.title || "Título Desconhecido"),
          author: Array.isArray(doc.author_name) ? String(doc.author_name[0]) : "Autor Desconhecido",
          year: Number(doc.first_publish_year) || 2020,
          pages: Number(doc.number_of_pages_median) || 240,
          coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : "",
          synopsis:
            "Obra consultada diretamente via Open Library. Clique em qualquer ação para adicioná-la ao seu banco de dados local do Tomo.",
          genres: Array.isArray(doc.subject)
            ? (doc.subject as string[]).slice(0, 3)
            : ["Literatura Global"],
          avgRating: 4.3,
          ratingsCount: 150,
          logsCount: 280,
          likesCount: 95,
        };
      });
      setGlobalResults(mapped);
    } catch {
      setGlobalResults([]);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-tomo-bg flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-tomo-green/20 border border-tomo-green flex items-center justify-center text-tomo-green animate-pulse">
          <BookOpen className="w-5 h-5" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-tomo-text">
          Abrindo sua biblioteca no Tomo...
        </p>
      </div>
    );
  }

  const { profile, books, statuses, diaryLogs, notes, lists, stats } = state;

  // Compute note counts per book
  const notesCountByBook: Record<string, number> = {};
  for (const n of notes) {
    notesCountByBook[n.bookId] = (notesCountByBook[n.bookId] || 0) + 1;
  }

  // All genres available
  const allGenres = Array.from(new Set(books.flatMap((b) => b.genres))).slice(0, 10);

  // Filtered books for catalog
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "TODOS" || b.genres.includes(selectedGenre);
    const st = statuses[b.id];
    const matchesShelf =
      shelfFilter === "ALL" ||
      (shelfFilter === "READ" && st?.status === "READ") ||
      (shelfFilter === "READING" && st?.status === "READING") ||
      (shelfFilter === "WANT_TO_READ" && st?.status === "WANT_TO_READ") ||
      (shelfFilter === "LIKED" && st?.liked);
    return matchesSearch && matchesGenre && matchesShelf;
  });

  const readingNowBooks = books.filter((b) => statuses[b.id]?.status === "READING");
  const favoriteBooks = profile.favoriteBookIds
    .map((id) => books.find((b) => b.id === id))
    .filter((b): b is Book => Boolean(b));

  // Rating histogram max
  const ratingKeys = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
  const maxRatingCount = Math.max(
    1,
    ...ratingKeys.map((k) => stats.ratingDistribution[k] || 0)
  );

  return (
    <div className="min-h-screen flex flex-col bg-tomo-bg text-tomo-text">
      {/* Sticky Letterboxd-inspired Top Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-tomo-bg/90 border-b border-tomo-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("DESCOBRIR")}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="flex items-center -space-x-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-tomo-amber inline-block ring-2 ring-tomo-bg" />
                <span className="w-3.5 h-3.5 rounded-full bg-tomo-green inline-block ring-2 ring-tomo-bg" />
                <span className="w-3.5 h-3.5 rounded-full bg-tomo-blue inline-block ring-2 ring-tomo-bg" />
              </div>
              <span className="font-serif text-2xl font-black tracking-tight text-tomo-light group-hover:text-white">
                TOMO
              </span>
              <span className="hidden xl:inline-block text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-tomo-surface border border-tomo-border text-tomo-text">
                Social & Caderno Literário
              </span>
            </button>

            {/* Primary Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {(
                [
                  { id: "DESCOBRIR", label: "Livros", icon: Compass },
                  { id: "DIARIO", label: "Diário & Reviews", icon: Calendar },
                  {
                    id: "CADERNO",
                    label: `Caderno (${notes.length})`,
                    icon: NotebookPen,
                  },
                  { id: "INCENTIVO", label: "Meta & Foco", icon: Flame },
                  { id: "PERFIL", label: "Sua Estante", icon: User },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      isActive
                        ? "bg-tomo-surface text-tomo-light font-bold border border-tomo-border"
                        : "text-tomo-text hover:text-tomo-light hover:bg-tomo-surface/50"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-tomo-green" : "text-tomo-text"
                      }`}
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Streak Pill + Quick Search + "+ REGISTRAR" CTA */}
          <div className="flex items-center gap-3">
            {/* Daily Reading Streak Pill */}
            <button
              type="button"
              onClick={() => setActiveTab("INCENTIVO")}
              title="Sua ofensiva diária de leitura — clique para registrar páginas lidas hoje"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-tomo-amber/15 border border-tomo-amber/40 text-tomo-amber text-xs font-mono font-bold hover:bg-tomo-amber/25 transition-colors"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{stats.currentStreakDays}d</span>
              <span className="text-tomo-light/80 font-normal">
                • {stats.pagesReadToday}/{profile.dailyGoalPages}p
              </span>
            </button>

            {/* Primary Letterboxd "+ LOG" Button */}
            <button
              type="button"
              onClick={() => {
                setBookToPreselectInLog(null);
                setIsLogModalOpen(true);
              }}
              className="px-4 py-2 rounded-lg bg-tomo-green hover:bg-[#00c84b] text-tomo-bg font-bold text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 shadow-lg shadow-tomo-green/20 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Registrar</span>
            </button>
          </div>
        </div>

        {/* Mobile Bottom/Sub Navigation Bar */}
        <div className="flex md:hidden items-center justify-around border-t border-tomo-border bg-tomo-surface/90 py-1.5 px-2">
          {(
            [
              { id: "DESCOBRIR", label: "Livros", icon: Compass },
              { id: "DIARIO", label: "Diário", icon: Calendar },
              { id: "CADERNO", label: "Caderno", icon: NotebookPen },
              { id: "INCENTIVO", label: "Foco", icon: Flame },
              { id: "PERFIL", label: "Perfil", icon: User },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono flex flex-col items-center gap-0.5 ${
                  isActive ? "text-tomo-green font-bold" : "text-tomo-text"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* =========================================================
            TAB 1: DESCOBRIR (Catálogo Editorial, Cabeceira & Feed)
           ========================================================= */}
        {activeTab === "DESCOBRIR" && (
          <>
            {/* Editorial Hero Banner + Reading Now Widget */}
            <section className="relative rounded-2xl overflow-hidden border border-tomo-border bg-gradient-to-r from-[#1a222d] via-[#181e26] to-[#14181c] p-6 sm:p-8 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tomo-green/10 border border-tomo-green/30 text-tomo-green text-xs font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Acompanhe livros lidos. Guarde citações. Crie o hábito diário.</span>
                  </div>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-tomo-light leading-tight">
                    A vida é curta demais para esquecer os livros que transformaram você.
                  </h1>
                  <p className="text-sm sm:text-base text-tomo-text leading-relaxed max-w-2xl">
                    Inspirado no cinema do Letterboxd e pensado para leitores: dê notas com
                    meias-estrelas, registre seu diário de leitura, salve trechos sublinhados por
                    página no <strong className="text-tomo-light">Caderno</strong> e mantenha sua{" "}
                    <strong className="text-tomo-amber">Ofensiva Diária</strong> acesa.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBookToPreselectInLog(null);
                        setIsLogModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-tomo-green hover:bg-[#00c84b] text-tomo-bg font-bold text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Registrar Leitura no Diário
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("CADERNO")}
                      className="px-4 py-2.5 rounded-xl bg-tomo-surface hover:bg-tomo-card text-tomo-light border border-tomo-border text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                    >
                      <NotebookPen className="w-4 h-4 text-tomo-amber" />
                      Abrir Caderno de Notas ({notes.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("INCENTIVO")}
                      className="px-4 py-2.5 rounded-xl bg-tomo-surface hover:bg-tomo-card text-tomo-amber border border-tomo-amber/30 text-xs font-mono uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
                    >
                      <Flame className="w-4 h-4" />
                      Cronômetro & Meta Diária
                    </button>
                  </div>
                </div>

                {/* Right Column: Active Reading Now & Daily Goal Progress */}
                <div className="lg:col-span-5 p-5 rounded-xl bg-tomo-bg/85 border border-tomo-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-amber flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      Lendo Agora na Cabeceira
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("INCENTIVO")}
                      className="text-xs font-mono text-tomo-green hover:underline"
                    >
                      + Somar páginas hoje
                    </button>
                  </div>

                  {readingNowBooks.slice(0, 2).map((b) => {
                    const st = statuses[b.id];
                    const cur = st?.currentPage || 0;
                    const pct =
                      b.pages > 0 ? Math.min(100, Math.round((cur / b.pages) * 100)) : 0;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setActiveBookForDetail(b)}
                        className="p-3 rounded-lg bg-tomo-surface hover:bg-tomo-card border border-tomo-border/80 flex items-center gap-3.5 cursor-pointer transition-colors"
                      >
                        <div className="w-11 h-16 rounded overflow-hidden bg-tomo-card shrink-0">
                          {b.coverUrl && (
                            <img
                              src={b.coverUrl}
                              alt={b.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-serif font-bold text-sm text-tomo-light truncate">
                              {b.title}
                            </h4>
                            <span className="text-xs font-mono font-bold text-tomo-amber">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-tomo-bg overflow-hidden">
                            <div
                              className="h-full bg-tomo-amber"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-tomo-text">
                            <span>
                              Pág. {cur} de {b.pages}
                            </span>
                            <span>{notesCountByBook[b.id] || 0} notas salvas</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Search & Filter Strip */}
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Bar + Global Open Library Trigger */}
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-tomo-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!e.target.value.trim()) setGlobalResults([]);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchOpenLibraryCatalog()}
                      placeholder="Filtrar estante por título, autor ou buscar qualquer livro na Open Library..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-tomo-surface border border-tomo-border text-sm text-tomo-light placeholder:text-tomo-text/60 focus:outline-none focus:border-tomo-green"
                    />
                  </div>
                  {searchQuery.trim().length > 1 && (
                    <button
                      type="button"
                      onClick={handleSearchOpenLibraryCatalog}
                      disabled={isSearchingGlobal}
                      className="px-4 py-2 rounded-xl bg-tomo-amber/20 hover:bg-tomo-amber/30 border border-tomo-amber/40 text-tomo-amber text-xs font-mono font-semibold shrink-0 transition-colors"
                    >
                      {isSearchingGlobal ? "Consultando API..." : "Buscar na Open Library"}
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "ALL", label: "Todos" },
                      { id: "READ", label: "Lidos" },
                      { id: "READING", label: "Lendo" },
                      { id: "WANT_TO_READ", label: "Para Ler" },
                      { id: "LIKED", label: "♥ Amados" },
                    ] as const
                  ).map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setShelfFilter(pill.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        shelfFilter === pill.id
                          ? "bg-tomo-green text-tomo-bg font-bold"
                          : "bg-tomo-surface text-tomo-text hover:text-tomo-light border border-tomo-border"
                      }`}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genre Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedGenre("TODOS")}
                  className={`px-3 py-1 rounded-full text-[11px] font-mono shrink-0 transition-colors ${
                    selectedGenre === "TODOS"
                      ? "bg-tomo-light text-tomo-bg font-bold"
                      : "bg-tomo-surface text-tomo-text hover:text-tomo-light border border-tomo-border"
                  }`}
                >
                  Todos os Gêneros
                </button>
                {allGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1 rounded-full text-[11px] font-mono shrink-0 transition-colors ${
                      selectedGenre === genre
                        ? "bg-tomo-light text-tomo-bg font-bold"
                        : "bg-tomo-surface text-tomo-text hover:text-tomo-light border border-tomo-border"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </section>

            {/* Open Library Global Results Section (when searched) */}
            {globalResults.length > 0 && (
              <section className="p-5 rounded-2xl bg-tomo-surface/90 border border-tomo-amber/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-amber flex items-center gap-2">
                    <Library className="w-4 h-4" />
                    Resultados Encontrados na Open Library Global ({globalResults.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setGlobalResults([])}
                    className="text-xs font-mono text-tomo-text hover:text-tomo-light"
                  >
                    Limpar busca externa
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                  {globalResults.map((book) => (
                    <BookPosterCard
                      key={book.id}
                      book={book}
                      statusEntry={statuses[book.id]}
                      notesCount={notesCountByBook[book.id] || 0}
                      onSelectBook={async (b) => {
                        await mutateApi("ADD_BOOK", { book: b });
                        setActiveBookForDetail(b);
                      }}
                      onQuickToggleStatus={handleQuickToggleStatus}
                      onQuickToggleLike={handleQuickToggleLike}
                      onQuickLog={(b) => {
                        setBookToPreselectInLog(b);
                        setIsLogModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Main Letterboxd-style 6-Column Book Poster Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-tomo-green" />
                  Em Destaque na Comunidade Tomo ({filteredBooks.length})
                </h2>
                <span className="text-[11px] font-mono text-tomo-text">
                  Passe o mouse na capa para ações rápidas ou clique para abrir o Caderno
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                {filteredBooks.map((book) => (
                  <BookPosterCard
                    key={book.id}
                    book={book}
                    statusEntry={statuses[book.id]}
                    notesCount={notesCountByBook[book.id] || 0}
                    onSelectBook={(b) => setActiveBookForDetail(b)}
                    onQuickToggleStatus={handleQuickToggleStatus}
                    onQuickToggleLike={handleQuickToggleLike}
                    onQuickLog={(b) => {
                      setBookToPreselectInLog(b);
                      setIsLogModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Bottom Split: Recent Reviews & Highlighted Notebook Quotes */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              {/* Left 7 Cols: Recent Community & Personal Reviews */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light">
                    Resenhas Recentes & Atividade do Diário
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("DIARIO")}
                    className="text-xs font-mono text-tomo-green hover:underline"
                  >
                    Ver diário completo →
                  </button>
                </div>

                <div className="space-y-4">
                  {diaryLogs.slice(0, 4).map((log) => {
                    const book = books.find((b) => b.id === log.bookId);
                    if (!book) return null;
                    return (
                      <article
                        key={log.id}
                        className="p-4 rounded-xl bg-tomo-surface border border-tomo-border flex gap-4 hover:border-tomo-border/90 transition-colors"
                      >
                        <div
                          onClick={() => setActiveBookForDetail(book)}
                          className="w-16 h-24 rounded overflow-hidden bg-tomo-card shrink-0 cursor-pointer shadow-md"
                        >
                          {book.coverUrl && (
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={log.userAvatar}
                                alt={log.userName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="text-xs font-semibold text-tomo-light">
                                {log.userName}
                              </span>
                              <StarGlyphDisplay rating={log.rating} liked={log.liked} />
                              {log.isReread && (
                                <span
                                  title="Releitura"
                                  className="text-[10px] font-mono text-tomo-blue flex items-center gap-0.5"
                                >
                                  <RotateCcw className="w-3 h-3" /> Releitura
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-tomo-text">
                              {log.readDate}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveBookForDetail(book)}
                            className="font-serif font-bold text-base text-tomo-light hover:text-tomo-green transition-colors text-left block"
                          >
                            {book.title}{" "}
                            <span className="text-xs font-sans font-normal text-tomo-text">
                              ({book.year})
                            </span>
                          </button>

                          <p className="text-xs sm:text-sm text-tomo-light/85 leading-relaxed font-serif">
                            {log.reviewText}
                          </p>

                          <div className="pt-1 flex items-center gap-4 text-[11px] font-mono text-tomo-text">
                            <button
                              type="button"
                              onClick={() => mutateApi("LIKE_DIARY", { logId: log.id })}
                              className="hover:text-tomo-amber inline-flex items-center gap-1 transition-colors"
                            >
                              <Heart className="w-3.5 h-3.5" /> {log.likesReceived} curtidas na
                              review
                            </button>
                            {log.pagesReadInSession && (
                              <span>+{log.pagesReadInSession} págs na sessão</span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Recent Notebook Highlights & Lists */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                    <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-amber flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5" />
                      Sublinhados Recentes no Caderno
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("CADERNO")}
                      className="text-xs font-mono text-tomo-amber hover:underline"
                    >
                      Ver todas ({notes.length}) →
                    </button>
                  </div>

                  <div className="space-y-3">
                    {notes.slice(0, 3).map((note) => {
                      const book = books.find((b) => b.id === note.bookId);
                      return (
                        <div
                          key={note.id}
                          onClick={() => book && setActiveBookForDetail(book)}
                          className="p-4 rounded-xl bg-tomo-surface border border-tomo-border hover:border-tomo-amber/40 cursor-pointer transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-tomo-amber font-bold">
                              {book?.title || "Livro"} • Pág. {note.pageNumber || "—"}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-tomo-bg text-tomo-text">
                              {note.tag}
                            </span>
                          </div>
                          {note.quoteText && (
                            <blockquote className="pl-3 border-l-2 border-tomo-amber font-serif italic text-xs sm:text-sm text-tomo-paper leading-relaxed">
                              “{note.quoteText}”
                            </blockquote>
                          )}
                          <p className="text-xs text-tomo-text line-clamp-2">{note.noteText}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Curated Lists Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                    <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 text-tomo-blue" />
                      Listas Literárias em Destaque
                    </h2>
                  </div>
                  {lists.map((list) => {
                    const listBooks = list.bookIds
                      .map((id) => books.find((b) => b.id === id))
                      .filter((b): b is Book => Boolean(b));
                    return (
                      <div
                        key={list.id}
                        className="p-4 rounded-xl bg-tomo-surface border border-tomo-border space-y-3"
                      >
                        <div className="flex items-center -space-x-3 overflow-hidden py-1">
                          {listBooks.slice(0, 6).map((b) => (
                            <div
                              key={b.id}
                              onClick={() => setActiveBookForDetail(b)}
                              className="w-12 h-18 rounded border border-white/20 overflow-hidden bg-tomo-card shadow-md cursor-pointer hover:-translate-y-1 transition-transform"
                            >
                              {b.coverUrl && (
                                <img
                                  src={b.coverUrl}
                                  alt={b.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-sm text-tomo-light">
                            {list.title}
                          </h3>
                          <p className="text-xs text-tomo-text mt-0.5">{list.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </>
        )}

        {/* =========================================================
            TAB 2: DIÁRIO & REVIEWS (Tabela Cronológica Estilo Letterboxd)
           ========================================================= */}
        {activeTab === "DIARIO" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-tomo-border pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-green">
                  CRONOLOGIA DE LEITURA
                </span>
                <h1 className="font-serif text-3xl font-bold text-tomo-light mt-0.5">
                  Diário de Leituras & Resenhas
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBookToPreselectInLog(null);
                  setIsLogModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-tomo-green text-tomo-bg font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Entrada no Diário
              </button>
            </div>

            {/* Letterboxd-style Diary Table */}
            <div className="rounded-2xl bg-tomo-surface border border-tomo-border overflow-hidden divide-y divide-tomo-border">
              {diaryLogs.map((log) => {
                const book = books.find((b) => b.id === log.bookId);
                if (!book) return null;
                const [year, month, day] = log.readDate.split("-");
                const monthNames = [
                  "JAN",
                  "FEV",
                  "MAR",
                  "ABR",
                  "MAI",
                  "JUN",
                  "JUL",
                  "AGO",
                  "SET",
                  "OUT",
                  "NOV",
                  "DEZ",
                ];
                const monthLabel = monthNames[Number(month) - 1] || "MÊS";

                return (
                  <div
                    key={log.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-tomo-card/50 transition-colors"
                  >
                    {/* Date Badge */}
                    <div className="flex sm:flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-tomo-bg border border-tomo-border min-w-[70px] text-center">
                      <span className="text-[10px] font-mono uppercase text-tomo-text">
                        {monthLabel} {year}
                      </span>
                      <span className="text-xl font-mono font-bold text-tomo-light ml-2 sm:ml-0">
                        {day}
                      </span>
                    </div>

                    {/* Mini Cover */}
                    <div
                      onClick={() => setActiveBookForDetail(book)}
                      className="w-12 h-18 rounded overflow-hidden bg-tomo-card shrink-0 cursor-pointer shadow"
                    >
                      {book.coverUrl && (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Book Info + Review Snippet */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveBookForDetail(book)}
                          className="font-serif text-lg font-bold text-tomo-light hover:text-tomo-green transition-colors text-left"
                        >
                          {book.title}
                        </button>
                        <span className="text-xs text-tomo-text">
                          {book.author} ({book.year})
                        </span>
                        {log.isReread && (
                          <span className="px-2 py-0.5 rounded bg-tomo-blue/15 text-tomo-blue font-mono text-[10px]">
                            Releitura
                          </span>
                        )}
                      </div>
                      {log.reviewText && (
                        <p className="text-sm font-serif text-tomo-light/90 leading-relaxed">
                          {log.reviewText}
                        </p>
                      )}
                      <div className="text-[11px] font-mono text-tomo-text flex items-center gap-3">
                        <span>Por @{log.userHandle}</span>
                        {log.pagesReadInSession && (
                          <span className="text-tomo-amber">
                            +{log.pagesReadInSession} páginas lidas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Rating & Actions */}
                    <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                      <StarGlyphDisplay rating={log.rating} liked={log.liked} />
                      <button
                        type="button"
                        onClick={() => setActiveBookForDetail(book)}
                        className="text-[11px] font-mono text-tomo-blue hover:underline flex items-center gap-1"
                      >
                        <NotebookPen className="w-3 h-3" />
                        Caderno ({notesCountByBook[book.id] || 0})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 3: CADERNO DE ANOTAÇÕES & CITAÇÕES
           ========================================================= */}
        {activeTab === "CADERNO" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-tomo-border pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-amber">
                  SEU ARQUIVO PESSOAL DE SUBLINHADOS & IDEIAS
                </span>
                <h1 className="font-serif text-3xl font-bold text-tomo-light mt-0.5">
                  Caderno Literário ({notes.length} registros)
                </h1>
              </div>

              {/* Filter by Book and Tag */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={noteBookFilter}
                  onChange={(e) => setNoteBookFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-tomo-surface border border-tomo-border text-xs text-tomo-light font-mono"
                >
                  <option value="ALL">Todos os Livros ({books.length})</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({notesCountByBook[b.id] || 0})
                    </option>
                  ))}
                </select>

                <select
                  value={noteTagFilter}
                  onChange={(e) => setNoteTagFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-tomo-surface border border-tomo-border text-xs text-tomo-light font-mono"
                >
                  <option value="ALL">Todas as Categorias</option>
                  <option value="CITAÇÃO">CITAÇÃO</option>
                  <option value="REFLEXÃO">REFLEXÃO</option>
                  <option value="PERSONAGEM">PERSONAGEM</option>
                  <option value="TEORIA">TEORIA</option>
                  <option value="DESTAQUE">DESTAQUE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {notes
                .filter(
                  (n) =>
                    (noteBookFilter === "ALL" || n.bookId === noteBookFilter) &&
                    (noteTagFilter === "ALL" || n.tag === noteTagFilter)
                )
                .map((note) => {
                  const book = books.find((b) => b.id === note.bookId);
                  return (
                    <div
                      key={note.id}
                      className="p-5 rounded-2xl bg-tomo-surface border border-tomo-border hover:border-tomo-amber/50 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-tomo-amber/15 text-tomo-amber font-mono text-[10px] font-bold">
                              {note.tag}
                            </span>
                            {note.pageNumber && (
                              <span className="text-xs font-mono font-bold text-tomo-light">
                                Pág. {note.pageNumber}
                              </span>
                            )}
                            {note.chapter && (
                              <span className="text-xs text-tomo-text truncate">
                                • {note.chapter}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-tomo-text">
                            {note.createdAt}
                          </span>
                        </div>

                        {note.quoteText && (
                          <blockquote className="p-3.5 rounded-xl bg-tomo-bg/80 border-l-4 border-tomo-amber font-serif italic text-sm text-tomo-paper leading-relaxed">
                            “{note.quoteText}”
                          </blockquote>
                        )}

                        <p className="text-sm text-tomo-light/90 leading-relaxed">
                          {note.noteText}
                        </p>
                      </div>

                      {book && (
                        <div className="pt-3 border-t border-tomo-border flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setActiveBookForDetail(book)}
                            className="flex items-center gap-2.5 text-left group"
                          >
                            <div className="w-7 h-10 rounded overflow-hidden bg-tomo-card shrink-0">
                              {book.coverUrl && (
                                <img
                                  src={book.coverUrl}
                                  alt={book.title}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div>
                              <span className="text-xs font-serif font-bold text-tomo-light group-hover:text-tomo-amber block">
                                {book.title}
                              </span>
                              <span className="text-[11px] text-tomo-text">{book.author}</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveBookForDetail(book)}
                            className="px-2.5 py-1 rounded bg-tomo-bg hover:bg-tomo-card text-[11px] font-mono text-tomo-amber border border-tomo-border"
                          >
                            + Nova nota neste livro
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 4: INCENTIVO À LEITURA (Metas, Ofensiva & Cronômetro)
           ========================================================= */}
        {activeTab === "INCENTIVO" && (
          <section className="space-y-6">
            <div className="border-b border-tomo-border pb-4">
              <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-amber">
                 CONSTRUA SEU HÁBITO DIÁRIO
              </span>
              <h1 className="font-serif text-3xl font-bold text-tomo-light mt-0.5">
                Centro de Incentivo & Imersão Literária
              </h1>
            </div>

            <ReadingIncentiveHub
              profile={profile}
              books={books}
              statuses={statuses}
              stats={stats}
              onLogSession={async (bookId, pagesRead, minutesSpent) => {
                await mutateApi("LOG_SESSION", { bookId, pagesRead, minutesSpent });
              }}
              onUpdateGoals={async (yearlyGoalBooks, dailyGoalPages) => {
                await mutateApi("UPDATE_GOALS", { yearlyGoalBooks, dailyGoalPages });
              }}
              onSelectBook={(b) => setActiveBookForDetail(b)}
            />
          </section>
        )}

        {/* =========================================================
            TAB 5: PERFIL & ESTANTE (4 Favoritos + Histograma de Notas)
           ========================================================= */}
        {activeTab === "PERFIL" && (
          <section className="space-y-8">
            {/* Profile Header Card */}
            <div className="p-6 rounded-2xl bg-tomo-surface border border-tomo-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-tomo-green"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-serif text-2xl font-bold text-tomo-light">
                      {profile.name}
                    </h1>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-tomo-bg border border-tomo-border text-tomo-text">
                      @{profile.handle}
                    </span>
                  </div>
                  <p className="text-sm text-tomo-light/85 max-w-xl">{profile.bio}</p>
                  <p className="text-xs font-mono text-tomo-text">{profile.location}</p>
                </div>
              </div>

              {/* Letterboxd Profile Counter Strip */}
              <div className="grid grid-cols-4 divide-x divide-tomo-border bg-tomo-bg rounded-xl border border-tomo-border p-3 text-center w-full md:w-auto">
                <div className="px-4">
                  <span className="font-serif text-2xl font-bold text-tomo-light block">
                    {Object.values(statuses).filter((s) => s.status === "READ").length}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-tomo-text">Livros</span>
                </div>
                <div className="px-4">
                  <span className="font-serif text-2xl font-bold text-tomo-green block">
                    {stats.booksReadThisYear}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-tomo-text">Neste Ano</span>
                </div>
                <div className="px-4">
                  <span className="font-serif text-2xl font-bold text-tomo-amber block">
                    {notes.length}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-tomo-text">Notas</span>
                </div>
                <div className="px-4">
                  <span className="font-serif text-2xl font-bold text-tomo-blue block">
                    {stats.currentStreakDays}d
                  </span>
                  <span className="text-[10px] font-mono uppercase text-tomo-text">Ofensiva</span>
                </div>
              </div>
            </div>

            {/* 4 Favorite Books Showcase + Ratings Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 Cols: Four Favorite Books (Letterboxd Signature) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-2">
                    <Award className="w-4 h-4 text-tomo-amber" />
                    Livros Favoritos da Vida ({favoriteBooks.length}/4)
                  </h2>
                  <span className="text-[11px] font-mono text-tomo-text">
                    Clique em qualquer livro para fixar ou alterar
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {favoriteBooks.map((book) => (
                    <BookPosterCard
                      key={book.id}
                      book={book}
                      statusEntry={statuses[book.id]}
                      notesCount={notesCountByBook[book.id] || 0}
                      onSelectBook={(b) => setActiveBookForDetail(b)}
                      onQuickToggleStatus={handleQuickToggleStatus}
                      onQuickToggleLike={handleQuickToggleLike}
                    />
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Ratings Distribution Histogram */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-tomo-green" />
                    Distribuição de Notas
                  </h2>
                  <span className="text-xs font-mono text-tomo-green">★ 0.5 a 5.0</span>
                </div>

                <div className="p-5 rounded-2xl bg-tomo-surface border border-tomo-border space-y-4">
                  <div className="h-36 flex items-end gap-2 pt-6 px-2 border-b border-tomo-border">
                    {ratingKeys.map((k) => {
                      const count = stats.ratingDistribution[k] || 0;
                      const heightPct = Math.max(8, Math.round((count / maxRatingCount) * 100));
                      return (
                        <div
                          key={k}
                          className="flex-1 flex flex-col items-center gap-1 group"
                          title={`${k} estrelas: ${count} livros`}
                        >
                          <span className="text-[10px] font-mono text-tomo-text opacity-0 group-hover:opacity-100 transition-opacity">
                            {count}
                          </span>
                          <div
                            className={`w-full rounded-t transition-all ${
                              count > 0
                                ? "bg-tomo-green group-hover:bg-tomo-amber"
                                : "bg-tomo-bg"
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-tomo-text px-1">
                    <span>★ ½</span>
                    <span>★★★</span>
                    <span>★★★★★</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Read & Watchlist Shelf */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-tomo-border pb-2">
                <h2 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-tomo-blue" />
                  Lista &ldquo;Quero Ler&rdquo; (Watchlist Literária)
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {books
                  .filter((b) => statuses[b.id]?.status === "WANT_TO_READ")
                  .map((book) => (
                    <BookPosterCard
                      key={book.id}
                      book={book}
                      statusEntry={statuses[book.id]}
                      notesCount={notesCountByBook[book.id] || 0}
                      onSelectBook={(b) => setActiveBookForDetail(b)}
                      onQuickToggleStatus={handleQuickToggleStatus}
                      onQuickToggleLike={handleQuickToggleLike}
                      onQuickLog={(b) => {
                        setBookToPreselectInLog(b);
                        setIsLogModalOpen(true);
                      }}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-tomo-border bg-tomo-surface/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-tomo-text">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-tomo-light">TOMO</span>
            <span>— Rede Social Literária, Diário & Caderno de Anotações.</span>
          </div>
          <div className="font-mono text-[11px]">
            Persistência SQLite Local • Catálogo Integrado com Open Library API
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LogBookModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        books={books}
        initialBook={bookToPreselectInLog}
        onSubmitLog={async (entry, markAsRead, importedBook) => {
          await mutateApi("ADD_DIARY_LOG", {
            entry,
            markAsRead,
            book: importedBook,
          });
        }}
      />

      <BookDetailModal
        book={activeBookForDetail}
        isOpen={Boolean(activeBookForDetail)}
        onClose={() => setActiveBookForDetail(null)}
        statusEntry={activeBookForDetail ? statuses[activeBookForDetail.id] : undefined}
        diaryLogs={diaryLogs}
        notes={notes}
        onUpdateStatus={handleUpdateStatus}
        onAddNote={async (note: Omit<BookNote, "id" | "createdAt">) => {
          await mutateApi("ADD_NOTE", { note });
        }}
        onDeleteNote={async (noteId: string) => {
          await mutateApi("DELETE_NOTE", { noteId });
        }}
        onOpenLogModalForBook={(b) => {
          setBookToPreselectInLog(b);
          setIsLogModalOpen(true);
        }}
      />
    </div>
  );
}
