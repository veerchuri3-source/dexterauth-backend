import React, { useState, useMemo } from "react";
import { Sparkles, RefreshCw, Check, Undo2 } from "lucide-react";
import { getDefaultAvatarUrl } from "../../lib/utils";

export interface AvatarSwitcherProps {
  currentAvatar?: string;
  email?: string;
  username?: string;
  onSelect: (url: string) => void;
  className?: string;
}

interface AvatarStyle {
  id: string;
  name: string;
}

const AVATAR_STYLES: AvatarStyle[] = [
  { id: "bottts", name: "Robots" },
  { id: "avataaars", name: "Avatars" },
  { id: "lorelei", name: "Anime" },
  { id: "pixel-art", name: "Pixel" },
  { id: "adventurer", name: "RPG" },
  { id: "fun-emoji", name: "Emoji" },
  { id: "initials", name: "Initials" },
];

export function AvatarSwitcher({
  currentAvatar = "",
  email = "",
  username = "",
  onSelect,
  className = "",
}: AvatarSwitcherProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("bottts");
  const [randomSalt, setRandomSalt] = useState<number>(0);

  const baseSeed = username || email || "user";

  // Generate 6 compact variations for the selected category
  const generatedAvatars = useMemo(() => {
    const seeds = [
      `${baseSeed}`,
      `${baseSeed}-a${randomSalt}`,
      `${baseSeed}-b${randomSalt}`,
      `${baseSeed}-c${randomSalt}`,
      `${baseSeed}-d${randomSalt}`,
      `${baseSeed}-e${randomSalt}`,
    ];

    return seeds.map((seed) => {
      return `https://api.dicebear.com/9.x/${selectedCategory}/svg?seed=${encodeURIComponent(seed)}`;
    });
  }, [baseSeed, selectedCategory, randomSalt]);

  const handleShuffle = () => {
    setRandomSalt((prev) => prev + 1);
  };

  const handleResetDefault = () => {
    const defaultUrl = getDefaultAvatarUrl(email, username);
    onSelect(defaultUrl);
  };

  return (
    <div className={`p-2.5 rounded-xl border border-border/70 bg-card/40 backdrop-blur-sm space-y-2 ${className}`}>
      {/* Top compact bar: Style Pills + Action Buttons */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground/70 mr-1 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3 h-3 text-primary" /> Preset:
          </span>
          {AVATAR_STYLES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleShuffle}
            title="Shuffle variations"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-border/40 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Shuffle
          </button>
          <button
            type="button"
            onClick={handleResetDefault}
            title="Reset to email default avatar"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-muted-foreground hover:text-primary bg-muted/40 hover:bg-muted border border-border/40 transition-colors"
          >
            <Undo2 className="w-2.5 h-2.5" /> Reset
          </button>
        </div>
      </div>

      {/* Avatar Presets Single Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {generatedAvatars.map((url, idx) => {
          const isSelected = currentAvatar === url;
          return (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => onSelect(url)}
              className={`relative w-8 h-8 rounded-lg p-0.5 shrink-0 transition-all duration-150 focus:outline-none overflow-hidden ${
                isSelected
                  ? "bg-primary/10 border-2 border-primary ring-2 ring-primary/30 scale-105"
                  : "bg-muted/40 border border-border/60 hover:border-primary/50 hover:scale-105"
              }`}
            >
              <img
                src={url}
                alt={`Avatar ${idx + 1}`}
                className="w-full h-full object-cover rounded-md pointer-events-none"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/25 flex items-center justify-center rounded-md">
                  <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AvatarSwitcher;

