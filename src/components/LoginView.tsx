import { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { motion } from 'motion/react';
import { Library, LogIn, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LoginView({ onClose }: { onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative selection:bg-primary/20">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" className="rounded-xl hover:bg-muted/50 font-medium" onClick={onClose}>
          &larr; Back to Chat
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-[1px] mb-6">
            <div className="w-full h-full bg-background rounded-2xl flex items-center justify-center shadow-sm">
              <Library className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2 text-center tracking-tight">
            Welcome to ConceptLab
          </h1>
          <p className="text-muted-foreground text-center mb-10 leading-relaxed text-[15px]">
            Sign in to access your laboratory, save your generated resources, and track your learning progress across sessions.
          </p>

          <Button 
            size="lg" 
            className="w-full h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium text-[15px] shadow-sm flex items-center justify-center gap-3 group"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">Signing in...</span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                   <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
                <ArrowRight className="w-4 h-4 ml-auto opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </>
            )}
          </Button>

          <div className="mt-8 text-center text-xs text-muted-foreground/80 max-w-xs">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
