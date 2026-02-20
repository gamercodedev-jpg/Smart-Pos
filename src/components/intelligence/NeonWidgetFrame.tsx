import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export function NeonWidgetFrame(
  props: PropsWithChildren<{
    title: string;
    subtitle?: string;
    onRemove?: () => void;
    controlsVisible?: boolean;
    dragHandleClassName?: string;
    className?: string; // Allow override for height/etc
  }>
) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden flex flex-col",
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_0_0_1px_rgba(168,85,247,0.10),0_18px_55px_rgba(0,0,0,0.55)]",
        "transition-all hover:bg-white/[0.07] hover:border-white/20",
        "group",
        props.className
      )}
    >
      {/* Glow effect at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent opacity-50" />

      {/* Header */}
      <div className={cn("flex items-start justify-between px-4 pt-4 pb-2", props.dragHandleClassName)}>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase truncate">
            {props.title}
          </h3>
          {props.subtitle && (
            <div className="text-[11px] font-medium text-purple-200/70 truncate mt-0.5">
              {props.subtitle}
            </div>
          )}
        </div>
        
        {props.onRemove && (
          <button
            onClick={props.onRemove}
            aria-label={`Remove ${props.title} widget`}
            className={cn(
              "text-white/30 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors",
              props.controlsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 pl-4 pr-1 pb-1">
        <div className="h-full w-full overflow-y-auto overflow-x-hidden pr-3 thin-scrollbar">
            {props.children}
        </div>
      </div>
      
      <style>{`
        .thin-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
