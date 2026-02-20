import { PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function WidgetFrame(
  props: PropsWithChildren<{
    title: string;
    subtitle?: string;
    onRemove?: () => void;
    dragHandleClassName?: string;
    className?: string;
  }>
) {
  return (
    <Card
      className={cn(
        'h-full overflow-hidden bg-[#130720]/80 backdrop-blur-md border border-purple-500/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]',
        props.className
      )}
    >
      <CardHeader className={cn('pb-2', props.dragHandleClassName ?? '')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-gray-100 font-medium tracking-wide">
              {props.title}
            </CardTitle>
            {props.subtitle ? (
              <div className="text-xs text-purple-300/70 mt-0.5">{props.subtitle}</div>
            ) : null}
          </div>
          {props.onRemove ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={props.onRemove}
              aria-label="Remove widget"
              className="text-purple-400 hover:text-purple-100 hover:bg-purple-900/30 -mt-1 -mr-2 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-3.5rem)] text-gray-200 p-4 pt-2">
        {props.children}
      </CardContent>
    </Card>
  );
}
  );
}
