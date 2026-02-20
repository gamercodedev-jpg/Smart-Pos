import { Filter, SlidersHorizontal, Sun, Moon, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export type IntelligenceShiftFilter = 'all' | 'morning' | 'evening';

export function FilterWidget(props: {
    categories: Array<{ id: string; name: string }>;
    selectedCategoryIds: string[]; // empty means all
    onSelectedCategoryIdsChange: (next: string[]) => void;
    minGpPercent: number;
    onMinGpPercentChange: (next: number) => void;
    shift: IntelligenceShiftFilter;
    onShiftChange: (next: IntelligenceShiftFilter) => void;
}) {
    const { categories, selectedCategoryIds, onSelectedCategoryIdsChange } = props;

    const isAllCategories = selectedCategoryIds.length === 0;
    const toggleCategory = (id: string) => {
        if (isAllCategories) {
            // Start from "all" -> selecting one category means we're now in filtered mode.
            onSelectedCategoryIdsChange([id]);
            return;
        }
        const has = selectedCategoryIds.includes(id);
        const next = has ? selectedCategoryIds.filter((x) => x !== id) : [...selectedCategoryIds, id];
        onSelectedCategoryIdsChange(next);
    };

  return (
    <div className="space-y-6 pt-2 h-full">
        
                {/* Category Filter */}
        <div className="space-y-3">
                    <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="h-3 w-3" /> Categories
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-sm text-purple-100/80">All Categories</Label>
                        <Button
                            type="button"
                            size="sm"
                            variant={isAllCategories ? 'default' : 'outline'}
                            onClick={() => onSelectedCategoryIdsChange([])}
                            className={
                                isAllCategories
                                    ? 'bg-purple-500/30 text-white border border-purple-400/40 hover:bg-purple-500/40'
                                    : 'bg-white/5 border-white/10 text-purple-200 hover:bg-white/10'
                            }
                        >
                            {isAllCategories ? 'Active' : 'Set'}
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-auto pr-1">
                        {(categories.length ? categories : [{ id: 'uncat', name: 'Uncategorized' }]).map((cat) => {
                            const active = isAllCategories ? true : selectedCategoryIds.includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    className={
                                        'w-full flex items-center justify-between rounded-lg px-3 py-2 border transition-colors ' +
                                        (active
                                            ? 'bg-purple-500/15 border-purple-500/30 text-white'
                                            : 'bg-white/5 border-white/10 text-purple-200/70 hover:text-white hover:bg-white/10')
                                    }
                                >
                                    <span className="text-sm font-medium truncate">{cat.name}</span>
                                    <span className="text-xs font-bold opacity-70">{active ? 'ON' : 'OFF'}</span>
                                </button>
                            );
                        })}
                    </div>
        </div>

        <div className="h-[1px] bg-white/10 w-full" />

        {/* Profit threshold */}
        <div className="space-y-4">
             <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="h-3 w-3" /> Profit Threshold
            </div>
            <div className="px-1">
                <Slider 
                    value={[props.minGpPercent]} 
                    max={100} 
                    step={1} 
                    className="py-2"
                    onValueChange={(v) => props.onMinGpPercentChange(Number(v?.[0] ?? 0))}
                />
            </div>
             <div className="flex justify-between text-xs text-purple-200/50">
                <span>0%</span>
                <span>Min GP%: {props.minGpPercent}%</span>
                <span>100%</span>
            </div>
        </div>

         <div className="h-[1px] bg-white/10 w-full" />

                 {/* Shift filter */}
         <div className="space-y-3">
            <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                 Shift Analysis
            </div>
                        <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => props.onShiftChange('all')}
                                    className={
                                        'rounded-md p-2 text-center text-xs font-bold border transition-colors ' +
                                        (props.shift === 'all'
                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                            : 'bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10 hover:text-white')
                                    }
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => props.onShiftChange('morning')}
                                    className={
                                        'rounded-md p-2 text-center text-xs font-bold border transition-colors flex flex-col items-center gap-1 ' +
                                        (props.shift === 'morning'
                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                            : 'bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10 hover:text-white')
                                    }
                                >
                                    <Sun className="h-3 w-3 text-yellow-300" />
                                    Morning
                                </button>
                                <button
                                    type="button"
                                    onClick={() => props.onShiftChange('evening')}
                                    className={
                                        'rounded-md p-2 text-center text-xs font-bold border transition-colors flex flex-col items-center gap-1 ' +
                                        (props.shift === 'evening'
                                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                                            : 'bg-white/5 border-white/10 text-purple-200/60 hover:bg-white/10 hover:text-white')
                                    }
                                >
                                    <Moon className="h-3 w-3 text-blue-300" />
                                    Evening
                                </button>
                        </div>
         </div>

      </div>
  );
}
