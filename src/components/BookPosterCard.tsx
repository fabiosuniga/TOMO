"use client";

import React, { useState } from "react";
import { Book, BookStatusEntry } from "@/types/tomo";
import { StarGlyphDisplay } from "./StarRating";
import { BookMarked, Check, Eye, Heart, NotebookPen, Plus } from "lucide-react";

interface BookPosterCardProps {
  book: Book;
  statusEntry?: BookStatusEntry;
  notesCount?: number;
  onSelectBook: (book: Book) => void;
  onQuickToggleStatus?: (book: Book, nextStatus: "READ" | "WANT_TO_READ" | "READING") => void;
  onQuickToggleLike?: (book: Book) => void;
  onQuickLog?: (book: Book) => void;
  showProgress?: boolean;
  rankBadge?: number;
}

export function BookPosterCard({
  book,
  statusEntry,
  notesCount = 0,
  onSelectBook,
  onQuickToggleStatus,
  onQuickToggleLike,
  onQuickLog,
  showProgress = false,
  rankBadge,
}: BookPosterCardProps) {
  const [imgError, setImgError] = useState(false);

  const isRead = statusEntry?.status === "READ";
  const isReading = statusEntry?.status === "READING";
  const isWant = statusEntry?.status === "WANT_TO_READ";
  const isLiked = statusEntry?.liked || false;
  const rating = statusEntry?.rating || null;

  const progressPct =
    statusEntry && book.pages > 0
      ? Math.min(100, Math.round((statusEntry.currentPage / book.pages) * 100))
      : 0;

  return (
    <div className="group flex flex-col">
      {/* Poster Container */}
      <div
        onClick={() => onSelectBook(book)}
        className="book-cover-frame book-spine-effect aspect-[2/3] w-full bg-tomo-card cursor-pointer relative select-none"
      >
        {!imgError && book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Capa de ${book.title}`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#26303c] via-[#1b222a] to-[#12161b] border border-white/10">
            <div className="border-t border-b border-tomo-amber/40 py-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-tomo-amber block truncate">
                {book.author}
              </span>
            </div>
            <div className="my-auto">
              <h4 className="font-serif text-base font-bold text-tomo-paper leading-snug line-clamp-4">
                {book.title}
              </h4>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-tomo-text/70">
              <span>{book.year}</span>
              <span>{book.pages} pág.</span>
            </div>
          </div>
        )}

        {/* Top-left rank or status badge */}
        {rankBadge !== undefined ? (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-tomo-bg/90 border border-tomo-border text-tomo-light font-mono text-xs font-bold flex items-center justify-center shadow-md">
            {rankBadge}
          </div>
        ) : isReading ? (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-tomo-amber/95 text-tomo-bg font-mono text-[10px] font-bold uppercase tracking-wider shadow">
            Lendo • {progressPct}%
          </div>
        ) : null}

        {/* Top-right notes counter badge if user has notes */}
        {notesCount > 0 && (
          <div
            title={`${notesCount} ${notesCount === 1 ? "anotação no caderno" : "anotações no caderno"}`}
            className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-tomo-bg/90 border border-tomo-blue/40 text-tomo-blue font-mono text-[10px] font-semibold flex items-center gap-1 shadow"
          >
            <NotebookPen className="w-3 h-3" />
            {notesCount}
          </div>
        )}

        {/* Reading Progress Bar at Bottom of Cover */}
        {(showProgress || isReading) && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-tomo-bg/80">
            <div
              className="h-full bg-tomo-amber transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Letterboxd-style Dark Glass Hover Action Pill */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-x-2 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-tomo-bg/95 backdrop-blur-md border border-white/15 rounded-lg py-1.5 px-2 flex items-center justify-around shadow-xl"
        >
          {onQuickToggleStatus && (
            <button
              type="button"
              onClick={() => onQuickToggleStatus(book, "READ")}
              title={isRead ? "Marcado como Lido" : "Marcar como Lido"}
              className={`p-1 rounded transition-colors ${
                isRead ? "text-tomo-green" : "text-tomo-text hover:text-tomo-light"
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onQuickToggleLike && (
            <button
              type="button"
              onClick={() => onQuickToggleLike(book)}
              title={isLiked ? "Nos seus amados" : "Amar livro"}
              className={`p-1 rounded transition-colors ${
                isLiked ? "text-tomo-amber" : "text-tomo-text hover:text-tomo-light"
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            </button>
          )}

          {onQuickToggleStatus && (
            <button
              type="button"
              onClick={() => onQuickToggleStatus(book, "WANT_TO_READ")}
              title={isWant ? "Na sua Lista Para Ler" : "Guardar na Lista Para Ler"}
              className={`p-1 rounded transition-colors ${
                isWant ? "text-tomo-blue" : "text-tomo-text hover:text-tomo-light"
              }`}
            >
              <BookMarked className="w-4 h-4" />
            </button>
          )}

          {onQuickLog && (
            <button
              type="button"
              onClick={() => onQuickLog(book)}
              title="Registrar no Diário / Escrever Review"
              className="p-1 rounded text-tomo-text hover:text-tomo-green transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sub-poster Metadata Row (Stars + Heart + Quick Title on Hover/Always) */}
      <div className="mt-1.5 flex items-center justify-between gap-1 px-0.5 min-h-[18px]">
        <StarGlyphDisplay rating={rating} liked={isLiked} />
        {isRead && !rating && !isLiked && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-tomo-green">
            <Check className="w-3 h-3" /> Lido
          </span>
        )}
        {!statusEntry && (
          <span className="text-[11px] font-mono text-tomo-text/75">
            ★ {book.avgRating.toFixed(1)}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelectBook(book)}
        className="text-left group/title mt-0.5"
      >
        <h3 className="text-xs font-semibold text-tomo-light group-hover/title:text-tomo-green transition-colors line-clamp-1">
          {book.title}
        </h3>
        <p className="text-[11px] text-tomo-text/80 line-clamp-1">{book.author}</p>
      </button>
    </div>
  );
}
