import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { POSCategory } from '@/types/pos';

type Props = {
  categories: POSCategory[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  orientation?: 'horizontal' | 'vertical';
};

export default function CategoryRail({
  categories,
  selectedCategoryId,
  onSelect,
  orientation = 'horizontal',
}: Props) {
  const isVertical = orientation === 'vertical';

  return (
    <ScrollArea className={cn(isVertical ? 'h-full' : 'w-full', 'whitespace-nowrap')}>
      <div className={cn('gap-2', isVertical ? 'flex flex-col pr-2' : 'flex pb-2')}>
        {categories.map(cat => (
          <Button
            key={cat.id}
            variant={selectedCategoryId === cat.id ? 'default' : 'outline'}
            className={cn(
              isVertical
                ? 'justify-start h-12 px-3 font-medium'
                : 'flex-shrink-0 h-12 px-4 font-medium',
              selectedCategoryId === cat.id && cat.color
            )}
            onClick={() => onSelect(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
