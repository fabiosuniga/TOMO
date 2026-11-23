"use client";

import React, { useEffect, useState } from "react";
import { Book } from "@/types/tomo";
import { NativeModal } from "./NativeModal";
import { StarRating } from "./StarRating";
import { BookOpen, Calendar, Heart, RotateCcw, Search, Sparkles } from "lucide-react";

interface LogBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  initialBook?: Book | null;
  onSubmitLog: (
    entry: {
      bookId: string;
      readDate: string;
      rating: number | null;
      liked: boolean;
      isReread: boolean;
      containSpoilers: boolean;
      reviewText: string;
      pagesReadInSession?: number;
    },
    markAsRead: boolean,
    importedBook?: Book
  ) => Promise<void>;
}

export function LogBookModal({
  isOpen,
  onClose,
  books,
  initialBook,
  onSubmitLog,
}: LogBookModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedBook, setSelectedBook] = useState<Book | null>(initialBook || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openLibraryResults, setOpenLibraryResults] = useState<Book[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const [readDate, setReadDate] = useState(todayStr);
  const [rating, setRating] = useState<number | null>(4.5);
  const [liked, setLiked] = useState(true);
  const [isReread, setIsReread] = useState(false);
  const [containSpoilers, setContainSpoilers] = useState(false);
  const [markAsRead, setMarkAsRead] = useState(true);
  const [pagesReadInSession, setPagesReadInSession] = useState<number>(35);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialBook) {
      setSelectedBook(initialBook);
      setPagesReadInSession(Math.min(50, initialBook.pages || 35));
    } else if (isOpen && !selectedBook) {
      setSelectedBook(null);
    }
  }, [initialBook, isOpen]);

  // Filter local books first
  const localMatches = books.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchOpenLibrary = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingApi(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`
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
          coverUrl: coverId
            ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
            : "",
          synopsis:
            "Edição importada do catálogo global da Open Library para a sua estante no Tomo.",
          genres: Array.isArray(doc.subject)
            ? (doc.subject as string[]).slice(0, 3)
            : ["Literatura"],
          avgRating: 4.3,
          ratingsCount: 120,
          logsCount: 210,
          likesCount: 85,
        };
      });
      setOpenLibraryResults(mapped);
    } catch {
      setOpenLibraryResults([]);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setIsSubmitting(true);
    try {
      await onSubmitLog(
        {
          bookId: selectedBook.id,
          readDate,
          rating,
          liked,
          isReread,
          containSpoilers,
          reviewText: reviewText.trim(),
          pagesReadInSession: Number(pagesReadInSession) || 0,
        },
        markAsRead,
        selectedBook
      );
      setReviewText("");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      subtitle="DIÁRIO DE LEITURA • TOMO"
      title={selectedBook ? `Registrar: ${selectedBook.title}` : "Eu Li... (Escolher Livro)"}
      maxWidthClass="max-w-2xl"
    >
      {!selectedBook ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-tomo-text absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchOpenLibrary()}
                placeholder="Digite o título ou autor do livro..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-tomo-bg border border-tomo-border text-sm text-tomo-light placeholder:text-tomo-text/60 focus:outline-none focus:border-tomo-green"
              />
            </div>
            <button
              type="button"
              onClick={handleSearchOpenLibrary}
              disabled={isSearchingApi}
              className="px-3.5 py-2 rounded-lg bg-tomo-card hover:bg-tomo-border text-xs font-mono text-tomo-light border border-tomo-border transition-colors"
            >
              {isSearchingApi ? "Buscando..." : "Buscar Global"}
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            <p className="text-[11px] font-mono uppercase tracking-wider text-tomo-text">
              Catálogo Tomo ({localMatches.length})
            </p>
            {localMatches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBook(b)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-tomo-bg/60 hover:bg-tomo-card border border-tomo-border/60 text-left transition-colors"
              >
                <div className="w-10 h-14 rounded bg-tomo-card overflow-hidden shrink-0">
                  {b.coverUrl && (
                    <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif font-bold text-sm text-tomo-light truncate">
                    {b.title}
                  </h4>
                  <p className="text-xs text-tomo-text truncate">
                    {b.author} • {b.year} • {b.pages} págs.
                  </p>
                </div>
              </button>
            ))}

            {openLibraryResults.length > 0 && (
              <>
                <p className="text-[11px] font-mono uppercase tracking-wider text-tomo-amber pt-3">
                  Resultados da Open Library Global
                </p>
                {openLibraryResults.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBook(b)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-tomo-amber/5 hover:bg-tomo-card border border-tomo-amber/30 text-left transition-colors"
                  >
                    <div className="w-10 h-14 rounded bg-tomo-card overflow-hidden shrink-0">
                      {b.coverUrl && (
                        <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-sm text-tomo-light truncate">
                        {b.title}
                      </h4>
                      <p className="text-xs text-tomo-text truncate">
                        {b.author} • {b.year} • {b.pages} págs.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-tomo-amber/20 text-tomo-amber">
                      Importar & Logar
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Selected book header strip */}
          <div className="flex items-start gap-4 p-3.5 rounded-xl bg-tomo-bg/80 border border-tomo-border">
            <div className="w-16 h-24 rounded overflow-hidden bg-tomo-card shrink-0 shadow-md">
              {selectedBook.coverUrl && (
                <img
                  src={selectedBook.coverUrl}
                  alt={selectedBook.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-bold text-tomo-light truncate">
                  {selectedBook.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedBook(null)}
                  className="text-xs font-mono text-tomo-blue hover:underline shrink-0"
                >
                  Trocar livro
                </button>
              </div>
              <p className="text-xs text-tomo-text">
                {selectedBook.author} ({selectedBook.year}) • {selectedBook.pages} páginas
              </p>

              {/* Star rating & Heart inside header */}
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-tomo-text mb-1">
                    Sua Nota (0.5 a 5★)
                  </span>
                  <StarRating value={rating} onChange={setRating} size="lg" showValue />
                </div>

                <div>
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-tomo-text mb-1">
                    Amei
                  </span>
                  <button
                    type="button"
                    onClick={() => setLiked(!liked)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                      liked
                        ? "bg-tomo-amber/15 border-tomo-amber text-tomo-amber"
                        : "bg-tomo-surface border-tomo-border text-tomo-text hover:text-tomo-light"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                    {liked ? "Livro Amado" : "Curtir"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Date, Pages Read in Session & Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wider text-tomo-text flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-tomo-green" />
                Data da Leitura
              </span>
              <input
                type="date"
                value={readDate}
                onChange={(e) => setReadDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-tomo-bg border border-tomo-border text-sm text-tomo-light focus:outline-none focus:border-tomo-green"
              />
            </label>

            <label className="block">
              <span className="text-xs font-mono uppercase tracking-wider text-tomo-text flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-tomo-amber" />
                Páginas Lidas Hoje (Soma na Ofensiva!)
              </span>
              <input
                type="number"
                min={0}
                max={2000}
                value={pagesReadInSession}
                onChange={(e) => setPagesReadInSession(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-tomo-bg border border-tomo-border text-sm text-tomo-light font-mono focus:outline-none focus:border-tomo-amber"
              />
            </label>
          </div>

          {/* Toggles row */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-tomo-light cursor-pointer">
              <input
                type="checkbox"
                checked={markAsRead}
                onChange={(e) => setMarkAsRead(e.target.checked)}
                className="rounded border-tomo-border"
              />
              <BookOpen className="w-3.5 h-3.5 text-tomo-green" />
              Concluí o livro (Marcar como Lido)
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-tomo-light cursor-pointer">
              <input
                type="checkbox"
                checked={isReread}
                onChange={(e) => setIsReread(e.target.checked)}
                className="rounded border-tomo-border"
              />
              <RotateCcw className="w-3.5 h-3.5 text-tomo-blue" />
              Já tinha lido antes (Releitura)
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-tomo-light cursor-pointer">
              <input
                type="checkbox"
                checked={containSpoilers}
                onChange={(e) => setContainSpoilers(e.target.checked)}
                className="rounded border-tomo-border"
              />
              Contém Spoilers
            </label>
          </div>

          {/* Review textarea */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-tomo-text mb-1.5">
              Sua Resenha ou Impressões de Leitura
            </label>
            <textarea
              rows={5}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Escreva o que sentiu ao fechar o livro, a atmosfera da escrita, personagens inesquecíveis..."
              className="w-full p-3.5 rounded-xl bg-tomo-bg border border-tomo-border text-sm text-tomo-light placeholder:text-tomo-text/50 focus:outline-none focus:border-tomo-green leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-tomo-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider text-tomo-text hover:text-tomo-light"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg bg-tomo-green hover:bg-[#00c84b] text-tomo-bg font-bold text-xs uppercase tracking-wider shadow-lg shadow-tomo-green/20 transition-all"
            >
              {isSubmitting ? "Salvando..." : "Salvar no Diário"}
            </button>
          </div>
        </form>
      )}
    </NativeModal>
  );
}
