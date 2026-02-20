import { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PurpleDashboardLayout(
  props: PropsWithChildren<{
    onAnalyze?: () => void;
  }>
) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#0b0616] text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep radial glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/18 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/16 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[30%] w-[20%] h-[20%] bg-fuchsia-900/10 rounded-full blur-[100px]" />
        
        {/* Grid Overlay */}
        <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
                backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, 
                backgroundSize: '40px 40px' 
            }} 
        />
      </div>

      {/* Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0b0616]/70 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
            className="text-purple-200 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-300 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Mthunzi Intelligence
            </h1>
            <span className="text-xs text-purple-300/60 font-medium tracking-wider uppercase">
              Real-time Business Insight Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
            <span className="text-xs font-medium text-purple-200">Live Connection</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={props.onAnalyze}
            disabled={!props.onAnalyze}
            className="hidden sm:flex bg-white/5 border-white/10 text-white/90 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all shadow-[0_0_0_1px_rgba(168,85,247,0.14),0_10px_30px_rgba(0,0,0,0.45)]"
          >
            <Zap className="mr-2 h-4 w-4" /> Analyze
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 overflow-hidden p-4 sm:p-6">
        <div className="h-full w-full max-w-[1920px] mx-auto">
          {props.children}
        </div>
      </main>

    </div>
  );
}
