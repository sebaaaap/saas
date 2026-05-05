"use client"

import type { Category } from "./pdv-types"
import {
  LayoutGrid,
  Droplets,
  CircleDot,
  Filter,
  Disc3,
  Zap,
  Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  Droplets,
  CircleDot,
  Filter,
  Disc3,
  Zap,
  Wrench,
}

interface PdvCategoriesProps {
  categories: Category[]
  selectedCategoryId: string
  onSelectCategory: (categoryId: string) => void
}

export function PdvCategories({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: PdvCategoriesProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 custom-scrollbar">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] ?? LayoutGrid
        const isActive = selectedCategoryId === category.id
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className={`shrink-0 flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all relative overflow-hidden border ${isActive
              ? "text-white shadow-md shadow-primary/10"
              : "bg-background text-muted-foreground hover:text-foreground shadow-sm"
              }`}
            style={{
              borderColor: isActive ? (category.color || 'var(--primary)') : `${category.color}40` || 'var(--border)',
              backgroundColor: isActive ? (category.color || 'var(--primary)') : `${category.color}10` || 'transparent'
            }}
          >
            {/* Very soft background for non-active items */}
            {!isActive && category.color && (
              <div
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundColor: category.color }}
              />
            )}

            <Icon className={`h-4 w-4 ${isActive ? 'text-white' : ''}`} style={!isActive ? { color: category.color } : {}} />
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
