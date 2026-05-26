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
  ChevronRight,
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
  // Detect if any child categories are present (have a parent_id)
  const hasChildren = categories.some(c => c.id !== "all" && c.parent_id)

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 custom-scrollbar">
      {categories.map((category, idx) => {
        const Icon = iconMap[category.icon] ?? LayoutGrid
        const isActive = selectedCategoryId === category.id
        const isChild = !!category.parent_id

        // Add a separator before the first child category
        const prevIsRoot = idx > 0 && !categories[idx - 1].parent_id
        const showSeparator = isChild && prevIsRoot

        return (
          <div key={category.id} className="flex items-center gap-2">
            {showSeparator && (
              <div className="flex items-center gap-1 text-muted-foreground/40">
                <ChevronRight size={14} />
              </div>
            )}
            <button
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={`shrink-0 flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all relative overflow-hidden border ${
                isChild ? "py-2 px-3 text-[11px]" : ""
              } ${isActive
                ? "text-white shadow-md shadow-primary/10"
                : "bg-background text-muted-foreground hover:text-foreground shadow-sm"
              }`}
              style={{
                borderColor: isActive ? (category.color || 'var(--primary)') : `${category.color}40` || 'var(--border)',
                backgroundColor: isActive ? (category.color || 'var(--primary)') : `${category.color}10` || 'transparent',
                ...(isChild && !isActive ? { borderStyle: 'dashed' } : {})
              }}
            >
              {!isActive && category.color && (
                <div
                  className="absolute inset-0 opacity-[0.05] pointer-events-none"
                  style={{ backgroundColor: category.color }}
                />
              )}

              <Icon
                className={`h-4 w-4 ${isChild ? "h-3 w-3" : ""} ${isActive ? 'text-white' : ''}`}
                style={!isActive ? { color: category.color } : {}}
              />
              {category.name}
            </button>
          </div>
        )
      })}
    </div>
  )
}
