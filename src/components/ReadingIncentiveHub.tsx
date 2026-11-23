"use client";

import React, { useEffect, useState } from "react";
import { Book, BookStatusEntry, UserProfile } from "@/types/tomo";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";

interface ReadingIncentiveHubProps {
  profile: UserProfile;
  books: Book[];
  statuses: Record<string, BookStatusEntry>;
  stats: {
    booksReadThisYear: number;
    pagesReadThisYear: number;
    pagesReadToday: number;
    currentStreakDays: number;
    activeDaysMap: Record<string, number>;
  };
  onLogSession: (bookId: string, pagesRead: number, minutesSpent?: number) => Promise<void>;
  onUpdateGoals: (yearlyGoalBooks: number, dailyGoalPages: number) => Promise<void>;
  onSelectBook: (book: Book) => void;
}

export function ReadingIncentiveHub({
  profile,
  books,
  statuses,
  stats,
  onLogSession,
  onUpdateGoals,
  onSelectBook,
}: ReadingIncentiveHubProps) {
  const readingBooks = books.filter((b) => statuses[b.id]?.status === "READING");
  const defaultBookId = readingBooks[0]?.id || books[0]?.id || "";

  const [selectedBookId, setSelectedBookId] = useState(defaultBookId);
  const [pagesInput, setPagesInput] = useState(20);
  const [isLogging, setIsLogging] = useState(false);

  // Reading Focus Timer (Cronômetro de Imersão)
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerModeMinutes, setTimerModeMinutes] = useState(25);

  // Goals editor
  const [editingGoals, setEditingGoals] = useState(false);
  const [yearlyGoalInput, setYearlyGoalInput] = useState(profile.yearlyGoalBooks);
  const [dailyGoalInput, setDailyGoalInput] = useState(profile.dailyGoalPages);

  useEffect(() => {
    if (!selectedBookId && defaultBookId) {
      setSelectedBookId(defaultBookId);
    }
  }, [defaultBookId, selectedBookId]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  const handleQuickSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || pagesInput <= 0) return;
    setIsLogging(true);
    try {
      const elapsedMinutes =
        timerSeconds < timerModeMinutes * 60
          ? Math.max(5, Math.round((timerModeMinutes * 60 - timerSeconds) / 60))
          : Math.round(pagesInput * 1.4);
      await onLogSession(selectedBookId, pagesInput, elapsedMinutes);
    } finally {
      setIsLogging(false);
    }
  };

  // Generate last 28 days for the reading habit heatmap
  const last28Days = Array.from({ length: 28 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - idx));
    const iso = d.toISOString().split("T")[0];
    const pages = stats.activeDaysMap[iso] || 0;
    return {
      iso,
      dayNum: d.getDate(),
      weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      pages,
    };
  });

  const dailyPct = Math.min(100, Math.round((stats.pagesReadToday / profile.dailyGoalPages) * 100));
  const yearlyPct = Math.min(
    100,
    Math.round((stats.booksReadThisYear / profile.yearlyGoalBooks) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top 3 Incentive Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Daily Streak (Ofensiva de Leitura) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-tomo-surface via-tomo-surface to-tomo-amber/10 border border-tomo-amber/30 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-amber block">
                Ofensiva Literária
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-4xl font-bold text-tomo-light">
                  {stats.currentStreakDays}
                </span>
                <span className="text-sm text-tomo-text">dias seguidos lendo</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-tomo-amber/20 border border-tomo-amber/40 flex items-center justify-center text-tomo-amber">
              <Flame className="w-6 h-6 fill-current" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-tomo-border/60 flex items-center justify-between text-xs">
            <span className="text-tomo-text">Hábito de hoje:</span>
            {stats.pagesReadToday > 0 ? (
              <span className="font-mono font-semibold text-tomo-green flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />+{stats.pagesReadToday} págs hoje
              </span>
            ) : (
              <span className="font-mono text-tomo-amber">Leia hoje para manter a chama!</span>
            )}
          </div>
        </div>

        {/* Card 2: Meta Diária de Páginas */}
        <div className="p-5 rounded-2xl bg-tomo-surface border border-tomo-border flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-green block">
                Meta Diária de Páginas
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-4xl font-bold text-tomo-light">
                  {stats.pagesReadToday}
                </span>
                <span className="text-sm text-tomo-text">
                  / {profile.dailyGoalPages} páginas ({dailyPct}%)
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-tomo-green/15 border border-tomo-green/30 flex items-center justify-center text-tomo-green">
              <Target className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-tomo-bg overflow-hidden">
              <div
                className="h-full bg-tomo-green transition-all duration-500"
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-tomo-text">
              <span>
                {dailyPct >= 100
                  ? "Meta diária concluída! ★"
                  : `Faltam ${Math.max(0, profile.dailyGoalPages - stats.pagesReadToday)} páginas`}
              </span>
              <button
                type="button"
                onClick={() => setEditingGoals(!editingGoals)}
                className="text-tomo-blue hover:underline"
              >
                Ajustar metas
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Desafio Anual de Livros */}
        <div className="p-5 rounded-2xl bg-tomo-surface border border-tomo-border flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-tomo-blue block">
                Desafio Anual Tomo
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-4xl font-bold text-tomo-light">
                  {stats.booksReadThisYear}
                </span>
                <span className="text-sm text-tomo-text">
                  de {profile.yearlyGoalBooks} livros lidos
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-tomo-blue/15 border border-tomo-blue/30 flex items-center justify-center text-tomo-blue">
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="h-2.5 w-full rounded-full bg-tomo-bg overflow-hidden">
              <div
                className="h-full bg-tomo-blue transition-all duration-500"
                style={{ width: `${yearlyPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-tomo-text">
              <span>{stats.pagesReadThisYear.toLocaleString("pt-BR")} páginas no ano</span>
              <span>{yearlyPct}% do ano</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Goals Editor if opened */}
      {editingGoals && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onUpdateGoals(yearlyGoalInput, dailyGoalInput);
            setEditingGoals(false);
          }}
          className="p-4 rounded-xl bg-tomo-card border border-tomo-blue/40 flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
              Meta Diária (Páginas/Dia)
            </label>
            <input
              type="number"
              min={5}
              max={500}
              value={dailyGoalInput}
              onChange={(e) => setDailyGoalInput(Number(e.target.value))}
              className="px-3 py-1.5 rounded bg-tomo-bg border border-tomo-border text-xs font-mono text-tomo-light"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
              Desafio Anual (Livros/Ano)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={yearlyGoalInput}
              onChange={(e) => setYearlyGoalInput(Number(e.target.value))}
              className="px-3 py-1.5 rounded bg-tomo-bg border border-tomo-border text-xs font-mono text-tomo-light"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 rounded bg-tomo-green text-tomo-bg font-bold text-xs uppercase font-mono"
          >
            Salvar Metas
          </button>
        </form>
      )}

      {/* Middle Row: Reading Session Logger + Focus Pomodoro Timer & 28-Day Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Cronômetro de Imersão & Check-in Rápido de Páginas */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-tomo-surface border border-tomo-border space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-tomo-border pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-tomo-amber">
                RITUAL DE LEITURA SEM DISTRAÇÕES
              </span>
              <h3 className="font-serif text-lg font-bold text-tomo-light flex items-center gap-2">
                <Timer className="w-5 h-5 text-tomo-amber" />
                Cronômetro de Imersão & Registro de Páginas
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    setIsRunning(false);
                    setTimerModeMinutes(mins);
                    setTimerSeconds(mins * 60);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    timerModeMinutes === mins
                      ? "bg-tomo-amber text-tomo-bg font-bold"
                      : "bg-tomo-bg text-tomo-text hover:text-tomo-light"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Timer Display */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-tomo-bg border border-tomo-border">
            <div className="text-center sm:text-left">
              <div className="font-mono text-4xl font-bold text-tomo-light tracking-tight">
                {formatTimer(timerSeconds)}
              </div>
              <p className="text-xs text-tomo-text mt-0.5">
                {isRunning
                  ? "Modo foco ativo — guarde o celular e mergulhe no livro."
                  : "Inicie uma sessão cronometrada ou registre diretamente as páginas abaixo."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase font-mono flex items-center gap-2 transition-all ${
                  isRunning
                    ? "bg-tomo-amber text-tomo-bg"
                    : "bg-tomo-green text-tomo-bg hover:bg-[#00c84b]"
                }`}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? "Pausar" : "Iniciar Sessão"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRunning(false);
                  setTimerSeconds(timerModeMinutes * 60);
                }}
                aria-label="Reiniciar cronômetro"
                className="p-2.5 rounded-xl bg-tomo-surface border border-tomo-border text-tomo-text hover:text-tomo-light"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Pages Check-in Form */}
          <form onSubmit={handleQuickSession} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                Qual livro você leu agora?
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-tomo-bg border border-tomo-border text-xs text-tomo-light focus:outline-none focus:border-tomo-green"
              >
                {books.map((b) => {
                  const st = statuses[b.id];
                  const tag =
                    st?.status === "READING"
                      ? ` (Lendo: pág. ${st.currentPage}/${b.pages})`
                      : "";
                  return (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.author}
                      {tag}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[10px] font-mono uppercase text-tomo-text mb-1">
                Páginas Lidas
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={pagesInput}
                onChange={(e) => setPagesInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-tomo-bg border border-tomo-border text-xs font-mono text-tomo-light focus:outline-none focus:border-tomo-green"
              />
            </div>

            <div className="sm:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={isLogging}
                className="w-full py-2 px-3 rounded-lg bg-tomo-amber hover:bg-[#e67300] text-tomo-bg font-bold text-xs uppercase font-mono flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLogging ? "..." : "+ Somar Págs"}
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 cols: Mapa de Constância (Últimos 28 Dias) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-tomo-surface border border-tomo-border flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-tomo-green">
              CONSTÂNCIA LITERÁRIA
            </span>
            <h3 className="font-serif text-lg font-bold text-tomo-light mt-0.5">
              Mapa de Leitura (Últimos 28 Dias)
            </h3>
            <p className="text-xs text-tomo-text mt-1">
              Cada bloco se ilumina conforme a quantidade de páginas lidas no dia.
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 my-4">
            {last28Days.map((day) => {
              let colorClass = "bg-tomo-bg border-tomo-border text-tomo-text/50";
              if (day.pages >= 50) {
                colorClass =
                  "bg-tomo-green text-tomo-bg font-bold border-tomo-green shadow-[0_0_10px_rgba(0,224,84,0.3)]";
              } else if (day.pages >= 25) {
                colorClass = "bg-tomo-green/60 text-tomo-light font-semibold border-tomo-green/60";
              } else if (day.pages > 0) {
                colorClass = "bg-tomo-green/25 text-tomo-light border-tomo-green/40";
              }

              return (
                <div
                  key={day.iso}
                  title={`${day.iso}: ${day.pages} páginas lidas`}
                  className={`p-2 rounded-lg border text-center transition-all ${colorClass}`}
                >
                  <div className="text-[9px] font-mono uppercase opacity-75">{day.weekday}</div>
                  <div className="text-xs font-mono">{day.dayNum}</div>
                  <div className="text-[9px] font-mono mt-0.5">
                    {day.pages > 0 ? `${day.pages}p` : "·"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-tomo-text pt-2 border-t border-tomo-border">
            <span>Menos</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-tomo-bg border border-tomo-border inline-block" />
              <span className="w-3 h-3 rounded-sm bg-tomo-green/25 inline-block" />
              <span className="w-3 h-3 rounded-sm bg-tomo-green/60 inline-block" />
              <span className="w-3 h-3 rounded-sm bg-tomo-green inline-block" />
            </div>
            <span>50+ págs/dia</span>
          </div>
        </div>
      </div>

      {/* Currently Reading Books with Interactive Progress Cards */}
      {readingBooks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-tomo-border pb-2">
            <h3 className="text-xs font-mono uppercase tracking-widest text-tomo-light flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-tomo-amber" />
              Na Sua Cabeceira Agora ({readingBooks.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {readingBooks.map((book) => {
              const st = statuses[book.id];
              const cur = st?.currentPage || 0;
              const pct = book.pages > 0 ? Math.min(100, Math.round((cur / book.pages) * 100)) : 0;
              const remainingPages = Math.max(0, book.pages - cur);
              const daysToFinish = Math.max(
                1,
                Math.ceil(remainingPages / Math.max(1, profile.dailyGoalPages))
              );

              return (
                <div
                  key={book.id}
                  className="p-4 rounded-xl bg-tomo-surface border border-tomo-border flex gap-4 items-center"
                >
                  <div
                    onClick={() => onSelectBook(book)}
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
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => onSelectBook(book)}
                          className="font-serif font-bold text-base text-tomo-light hover:text-tomo-green text-left truncate block"
                        >
                          {book.title}
                        </button>
                        <p className="text-xs text-tomo-text">{book.author}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-tomo-amber/15 text-tomo-amber font-mono text-xs font-bold">
                        {pct}%
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-tomo-bg overflow-hidden">
                      <div
                        className="h-full bg-tomo-amber transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-tomo-text">
                      <span>
                        Pág. {cur} de {book.pages}
                      </span>
                      <span className="text-tomo-green">
                        No seu ritmo: termina em ~{daysToFinish}{" "}
                        {daysToFinish === 1 ? "dia" : "dias"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
