"use client";

import React, { useState } from "react";

interface StarRatingProps {
  value: number | null;
  onChange?: (newRating: number | null) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const displayRating = hoverRating !== null ? hoverRating : value || 0;

  const dimensions = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-7 h-7",
  }[size];

  const handleStarMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    if (readonly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    const computed = starIndex - (isLeftHalf ? 0.5 : 0);
    setHoverRating(computed);
  };

  const handleStarClick = (starIndex: number) => {
    if (readonly || !onChange) return;
    const target = hoverRating ?? starIndex;
    if (value === target) {
      onChange(null);
    } else {
      onChange(target);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      onMouseLeave={() => !readonly && setHoverRating(null)}
      role={readonly ? "img" : "group"}
      aria-label={`Avaliação: ${value ? `${value} de 5 estrelas` : "Sem nota"}`}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const fillLevel = Math.max(0, Math.min(1, displayRating - (starIndex - 1)));
        // fillLevel is 0, 0.5, or 1
        return (
          <button
            key={starIndex}
            type="button"
            disabled={readonly}
            onMouseMove={(e) => handleStarMove(e, starIndex)}
            onClick={() => handleStarClick(starIndex)}
            aria-label={`Avaliar com ${starIndex} estrelas`}
            className={`relative ${dimensions} ${
              readonly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"
            } focus:outline-none`}
          >
            {/* Base empty star */}
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full text-tomo-border fill-current"
            >
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>

            {/* Filled overlay (50% or 100%) */}
            {fillLevel > 0 && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${fillLevel * 100}%` }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`${dimensions} text-tomo-green fill-current drop-shadow-[0_0_6px_rgba(0,224,84,0.35)]`}
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
            )}
          </button>
        );
      })}

      {showValue && (
        <span className="ml-1.5 font-mono text-xs font-semibold text-tomo-light">
          {displayRating > 0 ? displayRating.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}

/** Compact Letterboxd-style green star glyphs for cards and diary rows */
export function StarGlyphDisplay({
  rating,
  liked,
}: {
  rating: number | null;
  liked?: boolean;
}) {
  if (!rating && !liked) return null;

  const fullStars = rating ? Math.floor(rating) : 0;
  const hasHalf = rating ? rating % 1 !== 0 : false;

  return (
    <span className="inline-flex items-center gap-1 text-tomo-green font-sans tracking-tighter text-xs select-none">
      {rating && rating > 0 ? (
        <span className="inline-flex items-center" aria-label={`${rating} estrelas`}>
          {"★".repeat(fullStars)}
          {hasHalf && <span className="text-[11px] ml-0.5 font-mono">½</span>}
        </span>
      ) : null}
      {liked && (
        <span className="text-tomo-amber text-xs" title="Livro amado" aria-label="Livro amado">
          ♥
        </span>
      )}
    </span>
  );
}
