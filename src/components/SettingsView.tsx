import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '../lib/profile';
import { User } from 'firebase/auth';
import { LogOut, Layout, User as UserIcon, Moon, Settings, Zap, Database, BrainCircuit, Activity, Globe, Shield, HelpCircle, ChevronRight, Check, PenBox, X, ArrowLeft, Target, Fingerprint } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip as RechartsTooltip } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { logout } from '../lib/firebase';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function SettingsView({ profile, user, onClose, updateProfile }: { profile: UserProfile, user?: User | null, onClose: () => void, updateProfile: (p: Partial<UserProfile>) => void }) {
  const [activeView, setActiveView] = useState<'main' | 'personalization' | 'data'>('main');
  const [editBio, setEditBio] = useState(profile.bio || '');
  const [editGoal, setEditGoal] = useState(profile.learningGoal || '');

  const displayName = user?.displayName || profile.name || 'Student';
  const avatarUrl = user?.photoURL;
  const currentLevelExp = profile.totalExp % 100;

  const chartData = [
    { subject: 'Physics', A: profile.subjects.physics.exp, fullMark: Math.max(100, profile.subjects.physics.exp + 20) },
    { subject: 'Chemistry', A: profile.subjects.chemistry.exp, fullMark: Math.max(100, profile.subjects.chemistry.exp + 20) },
    { subject: 'Math', A: profile.subjects.math.exp, fullMark: Math.max(100, profile.subjects.math.exp + 20) },
    { subject: 'Logic', A: profile.totalExp / 3, fullMark: Math.max(100, profile.totalExp / 3 + 20) },
    { subject: 'General', A: profile.totalExp / 2, fullMark: Math.max(100, profile.totalExp / 2 + 20) },
  ];

  const handleLogout = () => {
    logout();
  };

  const handleSaveProfile = () => {
    updateProfile({ bio: editBio, learningGoal: editGoal });
  };

  return (
    <div className="flex-1 bg-background p-0 overflow-hidden flex flex-col h-full w-full">
      {activeView === 'main' && (
         <div className="flex-1 overflow-y-auto no-scrollbar pb-10 relative">
            <div className="absolute top-4 left-4 z-10 outline-none">
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-muted/50 backdrop-blur-sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex flex-col items-center pt-10 pb-6 bg-background">
               <div className="relative">
                  <Avatar className="w-24 h-24 border-0">
                     {avatarUrl && <AvatarImage src={avatarUrl} />}
                     <AvatarFallback className="bg-[#EF4444] text-white text-3xl font-medium">
                        {displayName.charAt(0).toUpperCase()}{displayName.split(' ')[1]?.[0]?.toUpperCase()}
                     </AvatarFallback>
                  </Avatar>
                  <div className="absolute right-0 bottom-0 bg-gray-800 text-white rounded-full p-1.5 shadow-md border-2 border-background">
                     <PenBox className="w-4 h-4" />
                  </div>
               </div>
               <div className="mt-4 text-xl font-semibold tracking-tight text-foreground">{displayName}</div>
            </div>

            <div className="px-5 space-y-6 max-w-2xl mx-auto">
               <div>
                  <h3 className="text-[13px] font-medium text-foreground ml-2 mb-2">My ConceptLab</h3>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden">
                     <SettingItem icon={UserIcon} label="Profile & Personalization" onClick={() => setActiveView('personalization')} />
                     <div className="h-[0.5px] bg-border/20 ml-[52px]" />
                     <SettingItem icon={Database} label="Data Controls" onClick={() => setActiveView('data')} />
                  </div>
               </div>

               <div>
                  <h3 className="text-[13px] font-medium text-foreground ml-2 mb-2">Account</h3>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden">
                     <SettingItem icon={Activity} label="Workspace" value="Personal" />
                     <div className="h-[0.5px] bg-border/20 ml-[52px]" />
                     <SettingItem icon={Zap} label="Upgrade to Plus" />
                     <div className="h-[0.5px] bg-border/20 ml-[52px]" />
                     <SettingItem icon={Shield} label="Parental controls" />
                  </div>
               </div>
               
               <div>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden">
                     <SettingItem icon={HelpCircle} label="Help & FAQ" />
                     <div className="h-[0.5px] bg-border/20 ml-[52px]" />
                     <SettingItem icon={Globe} label="About" />
                  </div>
               </div>

               {user && (
                 <div className="bg-white dark:bg-[#1C1C1E] rounded-[20px] overflow-hidden">
                    <button onClick={handleLogout} className="w-full flex items-center px-4 py-3.5 hover:bg-muted/50 transition-colors text-red-500 font-medium active:bg-muted">
                       <LogOut className="w-5 h-5 mr-4" />
                       Sign Out
                    </button>
                 </div>
               )}
            </div>
         </div>
      )}

      {activeView === 'personalization' && (
         <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-background">
            <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 px-4 py-4 flex items-center border-b border-border/10 max-w-2xl mx-auto w-full">
               <button onClick={() => setActiveView('main')} className="text-blue-500 font-medium mr-4">&larr; Back</button>
               <h2 className="text-lg font-semibold flex-1 text-center pr-12">Profile</h2>
            </div>
            
            <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">
               <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-border/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <BrainCircuit className="w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                     <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-1">Explorer Level</h3>
                     <div className="text-4xl font-bold mb-4 tracking-tight">Lv. {profile.level}</div>
                     <Progress value={currentLevelExp} className="h-2 bg-muted mb-2" />
                     <div className="flex justify-between text-xs font-medium text-muted-foreground">
                       <span>{profile.totalExp} Total XP</span>
                       <span>{100 - currentLevelExp} to next level</span>
                     </div>
                  </div>
               </div>

               <div>
                 <h3 className="text-[15px] font-semibold mb-4 px-2 tracking-tight flex items-center gap-2"><Fingerprint className="w-4 h-4 text-primary" /> Identity & Goals</h3>
                 <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-sm border border-border/40 space-y-6">
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Bio</label>
                     <Textarea 
                       placeholder="What are you studying?" 
                       className="resize-none h-20 bg-muted/20 border-border/60"
                       value={editBio}
                       onChange={e => setEditBio(e.target.value)}
                       onBlur={handleSaveProfile}
                     />
                   </div>
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Learning Goal</label>
                     <Input 
                       placeholder="e.g. Master quantum mechanics by December" 
                       className="bg-muted/20 border-border/60"
                       value={editGoal}
                       onChange={e => setEditGoal(e.target.value)}
                       onBlur={handleSaveProfile}
                     />
                   </div>
                 </div>
               </div>

               <div>
                  <h3 className="text-[15px] font-semibold mb-4 px-2 tracking-tight">Knowledge Map</h3>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-4 shadow-sm border border-border/40 flex justify-center h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid stroke="currentColor" className="text-muted-foreground/20" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 11, fontWeight: 500 }} className="text-muted-foreground" />
                        <Radar dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div>
                  <h3 className="text-[15px] font-semibold mb-4 px-2 tracking-tight">Subject Mastery</h3>
                  <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 shadow-sm border border-border/40 space-y-4">
                     {[
                       { name: 'Physics', data: profile.subjects.physics, color: 'text-purple-500' },
                       { name: 'Chemistry', data: profile.subjects.chemistry, color: 'text-emerald-500' },
                       { name: 'Math', data: profile.subjects.math, color: 'text-blue-500' }
                     ].map((sub: any) => (
                       <div key={sub.name}>
                         <div className="flex justify-between items-baseline mb-1.5">
                           <span className={`font-medium ${sub.color}`}>{sub.name}</span>
                           <span className="font-mono text-sm text-foreground">Lv. {sub.data.level} <span className="opacity-50 text-xs ml-1">({sub.data.exp} XP)</span></span>
                         </div>
                         <Progress value={(sub.data.exp % 50) * 2} className="h-1.5 bg-muted" />
                       </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      )}

      {activeView === 'data' && (
         <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-background">
            <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 px-4 py-4 flex items-center border-b border-border/10 max-w-2xl mx-auto w-full">
               <button onClick={() => setActiveView('main')} className="text-blue-500 font-medium mr-4">&larr; Back</button>
               <h2 className="text-lg font-semibold flex-1 text-center pr-12">Data Controls</h2>
            </div>
            <div className="p-6 max-w-2xl mx-auto w-full">
               <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5">
                     <h4 className="font-medium text-base mb-1">Clear Local Data</h4>
                     <p className="text-sm text-foreground/70 mb-4">Erase your local study history, cache, and chat history from this browser.</p>
                     <button className="text-red-500 font-medium text-sm hover:underline" onClick={() => alert('Data cleared.')}>Clear history</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function SettingItem({ icon: Icon, label, value, onClick }: { icon: any, label: string, value?: string, onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center px-4 py-[14px] active:bg-muted/50 transition-colors text-left bg-transparent">
       <Icon className="w-6 h-6 text-foreground/60 mr-4 stroke-[1.5]" />
       <span className="flex-1 font-[400] text-[15px] tracking-tight text-foreground">{label}</span>
       {value && <span className="text-foreground/50 text-[15px]">{value}</span>}
       <ChevronRight className="w-4 h-4 text-foreground/30 ml-2" />
    </button>
  );
}
