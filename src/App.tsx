import React, { useState, useEffect } from 'react';
import {
  Beaker,
  BookOpen,
  LayoutDashboard,
  Library,
  BarChart3,
  Settings as SettingsIcon,
  FlaskConical,
  Zap,
  Info,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
  Loader2,
  FileUp,
  X,
  GraduationCap,
  Atom,
  Leaf,
  BookMarked,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LabCanvas, ReactionEffect } from './components/LabCanvas';
import { VisualLab } from './components/VisualLab';
import { ProblemUploader } from './components/ProblemUploader';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AITutor } from './components/AITutor';
import { CHEMICALS, EXPERIMENTS, SUBJECTS } from './constants';
import { cn } from './lib/utils';
import Swal from 'sweetalert2';
import { predictReaction, LabProblemResult } from './services/geminiService';
import { ApparatusType } from './types';

import { QuizView } from './components/QuizView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isApiModalOpen, setIsApiModalOpen] = useState(!localStorage.getItem('gemini_api_key'));
  const [chemicals, setChemicals] = useState(CHEMICALS);
  const [activeExperiment, setActiveExperiment] = useState<string | undefined>();
  const [selectedChemicals, setSelectedChemicals] = useState<string[]>([]);
  const [customReaction, setCustomReaction] = useState<ReactionEffect | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const [apparatusType, setApparatusType] = useState<ApparatusType>('beaker');
  const [isHeating, setIsHeating] = useState(false);
  const [labMode, setLabMode] = useState<'3d' | 'visual'>('visual');
  const [reactionLog, setReactionLog] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryStateFilter, setLibraryStateFilter] = useState<string>('');
  const [isQuizMode, setIsQuizMode] = useState(false);
  const [isProblemUploaderOpen, setIsProblemUploaderOpen] = useState(false);
  const [labProblemResult, setLabProblemResult] = useState<LabProblemResult | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    () => localStorage.getItem('theme') !== 'light'
  );

  // Sync theme class on <html> and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Track the last completed reaction message to show on stop
  const lastReactionMsgRef = React.useRef<string | null>(null);

  const handleReaction = (data: any) => {
    setReactionLog(prev => [`[${new Date().toLocaleTimeString()}] ${data.message}`, ...prev]);
    // Only track the message, do NOT show toast here (avoids flashing)
    if (data.status === 'completed') {
      lastReactionMsgRef.current = data.message;
    }
  };

  const startExperiment = (id: string) => {
    setActiveExperiment(id);
    setCustomReaction(null);
    setSelectedChemicals([]);
    setReactionLog([`[${new Date().toLocaleTimeString()}] Bắt đầu thí nghiệm: ${EXPERIMENTS.find(e => e.id === id)?.title}`]);
    setActiveTab('lab');
    setIsQuizMode(false);
  };

  const handleMix = async () => {
    if (selectedChemicals.length < 2) {
      Swal.fire('Thông báo', 'Vui lòng chọn ít nhất 2 hóa chất để trộn!', 'warning');
      return;
    }

    setIsReacting(true);
    setReactionLog(prev => [`[${new Date().toLocaleTimeString()}] Đang phân tích phản ứng...`, ...prev]);

    try {
      const chemNames = selectedChemicals.map(id => chemicals.find(c => c.id === id)?.name || id);
      const result = await predictReaction(chemNames);

      if (result) {
        setCustomReaction({
          color: result.color,
          bubbles: result.bubbles,
          precipitate: result.precipitate,
          message: result.message
        });
        setReactionLog(prev => [
          `[${new Date().toLocaleTimeString()}] Phương trình: ${result.equation}`,
          `[${new Date().toLocaleTimeString()}] Giải thích: ${result.explanation}`,
          ...prev
        ]);
      } else {
        Swal.fire('Lỗi', 'Không thể dự đoán phản ứng. Vui lòng kiểm tra API Key!', 'error');
      }
    } catch (error) {
      Swal.fire('Lỗi', 'Đã xảy ra lỗi khi gọi AI.', 'error');
    } finally {
      setIsReacting(false);
    }
  };

  const toggleChemical = (id: string) => {
    setSelectedChemicals(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
    setActiveExperiment(undefined);
    setCustomReaction(null);
  };

  const resetLab = () => {
    // Show summary toast if there was a completed reaction
    if (lastReactionMsgRef.current) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '✅ Kết quả phản ứng',
        text: lastReactionMsgRef.current,
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        backdrop: false,
        customClass: { popup: 'text-sm' },
      });
      lastReactionMsgRef.current = null;
    }
    setSelectedChemicals([]);
    setActiveExperiment(undefined);
    setCustomReaction(null);
    setIsHeating(false);
    setReactionLog([`[${new Date().toLocaleTimeString()}] Đã làm sạch phòng thí nghiệm.`]);
  };

  const addChemical = (newChem: any) => {
    setChemicals(prev => [...prev, newChem]);
    Swal.fire({
      title: 'Thành công!',
      text: `Đã thêm ${newChem.name} vào thư viện.`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Xử lý kết quả phân tích đề bài
  const handleProblemResult = (result: LabProblemResult) => {
    setLabProblemResult(result);

    // Merge hoá chất: dùng lại nếu trùng id, thêm mới nếu chưa có
    const newChemicals = [...chemicals];
    let addedCount = 0;

    result.chemicals.forEach(aiChem => {
      const existingIndex = newChemicals.findIndex(
        c => c.id === aiChem.id || c.formula.toLowerCase() === aiChem.formula.toLowerCase()
      );

      if (existingIndex === -1) {
        // Hoá chất mới - thêm vào danh sách
        newChemicals.push({
          ...aiChem,
          id: aiChem.id || aiChem.formula.toLowerCase().replace(/[^a-z0-9]/g, ''),
          concentration: aiChem.concentration || undefined,
        });
        addedCount++;
      }
    });

    setChemicals(newChemicals);
    setActiveTab('lab');
    setLabMode('visual');
    setIsQuizMode(false);

    Swal.fire({
      title: '✨ Phân tích thành công!',
      html: `<div style="text-align:left">
        <p><strong>Đề bài:</strong> ${result.problem_summary}</p>
        <p style="margin-top:8px"><strong>Hoá chất:</strong> ${result.chemicals.length} loại${addedCount > 0 ? ` (${addedCount} mới)` : ''}</p>
        <p style="margin-top:8px"><strong>Phương trình:</strong></p>
        <ul>${result.equations.map(eq => `<li style="font-family:monospace;margin:4px 0">${eq}</li>`).join('')}</ul>
      </div>`,
      icon: 'success',
      confirmButtonText: 'Bắt đầu thí nghiệm!',
      confirmButtonColor: '#8b5cf6',
    });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsQuizMode(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'lab', label: 'Phòng thí nghiệm', icon: FlaskConical },
    { id: 'library', label: 'Thư viện hóa chất', icon: Library },
    { id: 'lessons', label: 'Bài giảng', icon: BookOpen },
    { id: 'progress', label: 'Tiến độ', icon: BarChart3 },
  ];

  const subjectIcons = ['🧪', '🌿', '🔬', '📖'];

  // Dữ liệu chi tiết từng chủ đề
  const SUBJECT_DETAILS: Record<string, {
    description: string;
    color: string;
    gradient: string;
    topics: { name: string; emoji: string; desc: string }[];
    relatedExps: string[];
  }> = {
    voco: {
      description: 'Nghiên cứu các chất vô cơ, phản ứng axit-bazơ, muối, oxit và các nguyên tố hóa học.',
      color: 'violet',
      gradient: 'from-violet-600 to-purple-600',
      topics: [
        { name: 'Axit & Bazơ', emoji: '⚗️', desc: 'Phản ứng trung hòa, chỉ thị pH' },
        { name: 'Muối & Oxit', emoji: '🔬', desc: 'Phản ứng trao đổi, kết tủa' },
        { name: 'Kim loại', emoji: '⚙️', desc: 'Dãy hoạt động, phản ứng với axit' },
        { name: 'Phi kim', emoji: '💨', desc: 'Điều chế khí, nhận biết' },
      ],
      relatedExps: ['exp1', 'exp2'],
    },
    huuco: {
      description: 'Nghiên cứu hợp chất carbon: hidrocacbon, ancol, axit hữu cơ, polime.',
      color: 'emerald',
      gradient: 'from-emerald-600 to-teal-600',
      topics: [
        { name: 'Hidrocacbon', emoji: '⛽', desc: 'Ankan, anken, ankin, aren' },
        { name: 'Ancol & Phenol', emoji: '🍷', desc: 'Tính chất, phản ứng đặc trưng' },
        { name: 'Axit hữu cơ', emoji: '🍋', desc: 'Axit cacboxylic, este' },
        { name: 'Polime', emoji: '🧵', desc: 'Nhựa tổng hợp, cao su' },
      ],
      relatedExps: [],
    },
    phantich: {
      description: 'Các phương pháp phân tích định tính và định lượng trong hóa học.',
      color: 'cyan',
      gradient: 'from-cyan-600 to-blue-600',
      topics: [
        { name: 'Nhận biết ion', emoji: '🔍', desc: 'Phản ứng đặc trưng nhận biết' },
        { name: 'Chuẩn độ', emoji: '💧', desc: 'Chuẩn độ axit-bazơ, oxi hóa-khử' },
        { name: 'Kết tủa', emoji: '❄️', desc: 'Phản ứng tạo kết tủa đặc trưng' },
        { name: 'Khí thử', emoji: '💨', desc: 'Nhận biết các loại khí' },
      ],
      relatedExps: ['exp1'],
    },
    lythuyet: {
      description: 'Nền tảng lý thuyết hóa học: cấu tạo nguyên tử, liên kết, nhiệt động lực học.',
      color: 'amber',
      gradient: 'from-amber-600 to-orange-600',
      topics: [
        { name: 'Nguyên tử', emoji: '⚛️', desc: 'Cấu tạo, số lượng tử' },
        { name: 'Liên kết hóa học', emoji: '🔗', desc: 'Cộng hóa trị, ion, kim loại' },
        { name: 'Nhiệt động lực học', emoji: '🌡️', desc: 'Entanpi, entropi, Gibbs' },
        { name: 'Động học', emoji: '⚡', desc: 'Tốc độ, cân bằng hóa học' },
      ],
      relatedExps: [],
    },
  };

  return (
    <div className="flex h-screen overflow-hidden ambient-bg" style={{ color: 'var(--text-primary)' }}>
      {/* Sidebar */}
      <aside className="w-64 glass-sidebar flex flex-col shrink-0 relative z-10">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-white shadow-lg neon-glow">
              <Beaker className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold gradient-text">ChemAR</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wider">VIRTUAL LAB</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group",
                  activeTab === item.id
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                )}
              >
                {/* Active indicator */}
                {activeTab === item.id && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-400 to-cyan-400 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", activeTab === item.id && "text-violet-400")} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          {/* Streak Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 neon-border" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', boxShadow: '0 0 15px rgba(245, 158, 11, 0.05)' }}>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
              <Zap className="w-4 h-4" />
              <span>Streak: 5 ngày 🔥</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/80 border border-slate-700/50 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700/80 hover:text-white hover:border-violet-500/30 transition-all duration-200"
          >
            <SettingsIcon className="w-4 h-4" />
            Cấu hình AI
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 glass-panel border-b border-slate-700/30 flex items-center justify-between px-8 shrink-0 relative z-10" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'rgba(15, 23, 42, 0.8)' }}>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-100">
              {isQuizMode ? 'Kiểm tra kiến thức' : navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Tìm kiếm hóa chất, bài học..."
                className="pl-10 pr-4 py-2 dark-input text-sm w-64"
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              <motion.div
                key={isDarkMode ? 'moon' : 'sun'}
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.35, type: 'spring', stiffness: 200, damping: 15 }}
              >
                {isDarkMode
                  ? <Moon className="w-5 h-5 text-violet-300" />
                  : <Sun className="w-5 h-5 text-amber-500" />
                }
              </motion.div>
            </button>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg neon-glow">
              DL
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            {isQuizMode ? (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <QuizView onComplete={(score) => console.log('Quiz completed with score:', score)} />
              </motion.div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                  >
                    {/* Subject Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {SUBJECTS.map((subject, idx) => {
                        const detail = SUBJECT_DETAILS[subject.id];
                        const colorMap: Record<string, string> = {
                          violet: 'from-violet-500/20 to-purple-500/10 border-violet-500/30 hover:border-violet-400/50',
                          emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 hover:border-emerald-400/50',
                          cyan: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 hover:border-cyan-400/50',
                          amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 hover:border-amber-400/50',
                        };
                        const glowMap: Record<string, string> = {
                          violet: 'shadow-violet-500/20', emerald: 'shadow-emerald-500/20',
                          cyan: 'shadow-cyan-500/20', amber: 'shadow-amber-500/20',
                        };
                        return (
                          <motion.div
                            key={subject.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => setSelectedSubject(subject.id)}
                            className={cn(
                              "glass-card p-6 rounded-2xl cursor-pointer group relative overflow-hidden border transition-all duration-300",
                              "hover:scale-[1.03] hover:shadow-xl",
                              detail ? colorMap[detail.color] : ''
                            )}
                          >
                            {/* Hover gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-transparent transition-all duration-500 rounded-2xl" />

                            <div className="relative z-10">
                              <div className="text-3xl mb-3">{subjectIcons[idx]}</div>
                              <h3 className="font-bold text-slate-100 mb-1 text-sm">{subject.name}</h3>
                              <p className="text-xs text-slate-500 mb-3">{subject.questionsCount} bài học</p>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors">
                                <span>Xem chi tiết</span>
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>

                            {/* Bottom gradient line */}
                            <div className={cn(
                              "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-all duration-500",
                              detail?.gradient ? `bg-gradient-to-r ${detail.gradient}` : 'from-violet-500 to-cyan-500'
                            )} />
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Experiments Section */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold text-slate-100">Thí nghiệm đề xuất</h3>
                          <button
                            onClick={() => setIsQuizMode(true)}
                            className="text-violet-400 text-sm font-bold flex items-center gap-1 hover:text-violet-300 transition-colors"
                          >
                            Làm bài kiểm tra <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {EXPERIMENTS.map((exp, idx) => (
                            <motion.div
                              key={exp.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 + idx * 0.1 }}
                              className="glass-card rounded-2xl overflow-hidden group hover:border-violet-500/30 transition-all duration-300"
                            >
                              <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                                {/* Decorative pattern */}
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(139,92,246,0.5) 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                                <div className="absolute bottom-3 left-4">
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 backdrop-blur-sm">Cơ bản</span>
                                </div>
                                <div className="absolute top-4 right-4 text-4xl opacity-20 group-hover:opacity-40 transition-opacity">🧪</div>
                              </div>
                              <div className="p-5">
                                <h4 className="font-bold text-slate-100 mb-2">{exp.title}</h4>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{exp.description}</p>
                                <button
                                  onClick={() => startExperiment(exp.id)}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl text-sm font-bold hover:from-violet-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-violet-500/20 glow-btn"
                                >
                                  <Play className="w-4 h-4 fill-current" /> Bắt đầu ngay
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* AI Tutor */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-slate-100">AI Tutor Trực tuyến</h3>
                        <div className="h-[500px]">
                          <AITutor />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'lab' && (
                  <motion.div
                    key="lab"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col gap-6 h-full"
                  >
                    <div className="flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-100">Phòng thí nghiệm</h2>
                        <div className="flex bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
                          <button
                            onClick={() => { setLabMode('visual'); setIsHeating(false); }}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200",
                              labMode === 'visual' ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Chế độ Trực quan
                          </button>
                          <button
                            onClick={() => { setLabMode('3d'); setIsHeating(false); }}
                            className={cn(
                              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200",
                              labMode === '3d' ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"
                            )}
                          >
                            Chế độ 3D AR
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsProblemUploaderOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all glow-btn"
                        >
                          <FileUp className="w-4 h-4" /> Tải đề bài
                        </button>
                        <button
                          onClick={resetLab}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 hover:border-slate-600 transition-all"
                        >
                          <RotateCcw className="w-4 h-4" /> Làm sạch tất cả
                        </button>
                      </div>
                    </div>

                    {labMode === 'visual' ? (
                      <div className="flex-1 min-h-0">
                        <VisualLab chemicals={chemicals} isHeating={isHeating} onHeatingToggle={() => setIsHeating(!isHeating)} problemResult={labProblemResult} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                        {/* ── 3D Canvas Area ── */}
                        <div className="lg:col-span-3 flex flex-col gap-4">
                          <div
                            className="relative flex-1 rounded-3xl overflow-hidden min-h-[500px]"
                            style={{
                              background: 'radial-gradient(ellipse at 50% 0%, #0d1a3a 0%, #060b18 100%)',
                              boxShadow: '0 0 0 1px rgba(124,58,237,0.25), 0 0 40px rgba(124,58,237,0.1), inset 0 0 60px rgba(0,0,0,0.4)',
                            }}
                          >
                            <LabCanvas
                              activeExperiment={activeExperiment}
                              customReaction={customReaction}
                              apparatusType={apparatusType}
                              isHeating={isHeating}
                              onReaction={handleReaction}
                            />

                            {/* ── Top-left HUD ── */}
                            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
                              {/* AR Badge */}
                              <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-cyan-200"
                                style={{
                                  background: 'rgba(6, 11, 24, 0.75)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(34,211,238,0.3)',
                                  boxShadow: '0 0 12px rgba(34,211,238,0.15)',
                                }}
                              >
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                </span>
                                3D AR · LIVE
                              </div>

                              {/* Selected chemicals badge */}
                              {selectedChemicals.length > 0 && (
                                <div
                                  className="p-2.5 rounded-2xl space-y-2"
                                  style={{
                                    background: 'rgba(6, 11, 24, 0.75)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(124,58,237,0.3)',
                                  }}
                                >
                                  <div className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Đang trộn:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {selectedChemicals.map(id => (
                                      <span
                                        key={id}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-violet-200"
                                        style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}
                                      >
                                        {chemicals.find(c => c.id === id)?.formula}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* ── Top-right controls ── */}
                            <div className="absolute top-4 right-4 flex flex-col gap-2">
                              {/* Apparatus picker */}
                              <div
                                className="flex flex-col gap-1.5 p-2 rounded-2xl"
                                style={{
                                  background: 'rgba(6,11,24,0.8)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(124,58,237,0.25)',
                                }}
                              >
                                <button
                                  onClick={() => setApparatusType('beaker')}
                                  className="p-2.5 rounded-xl transition-all"
                                  style={apparatusType === 'beaker' ? {
                                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                    color: '#fff',
                                    boxShadow: '0 0 14px rgba(124,58,237,0.5)',
                                  } : { color: '#94a3b8' }}
                                  title="Cốc thủy tinh"
                                >
                                  <Beaker className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => setApparatusType('test-tube')}
                                  className="p-2.5 rounded-xl transition-all"
                                  style={apparatusType === 'test-tube' ? {
                                    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                    color: '#fff',
                                    boxShadow: '0 0 14px rgba(124,58,237,0.5)',
                                  } : { color: '#94a3b8' }}
                                  title="Ống nghiệm"
                                >
                                  <FlaskConical className="w-5 h-5" />
                                </button>
                              </div>

                              {/* Heat button */}
                              <button
                                onClick={() => setIsHeating(!isHeating)}
                                className="p-3 rounded-2xl transition-all flex items-center justify-center"
                                style={isHeating ? {
                                  background: 'rgba(249,115,22,0.2)',
                                  color: '#fb923c',
                                  border: '1px solid rgba(249,115,22,0.4)',
                                  boxShadow: '0 0 20px rgba(249,115,22,0.35)',
                                } : {
                                  background: 'rgba(6,11,24,0.8)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(124,58,237,0.2)',
                                  color: '#64748b',
                                }}
                                title="Bật/tắt đèn cồn"
                              >
                                <Zap className={cn('w-5 h-5', isHeating && 'animate-pulse')} />
                              </button>
                            </div>

                            {/* ── Bottom action bar ── */}
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                              <button
                                onClick={resetLab}
                                className="p-2.5 rounded-2xl transition-all"
                                style={{
                                  background: 'rgba(6,11,24,0.8)',
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(124,58,237,0.2)',
                                  color: '#94a3b8',
                                }}
                                title="Làm sạch"
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                              <div className="flex gap-2">
                                {selectedChemicals.length >= 2 && !activeExperiment && (
                                  <button
                                    onClick={handleMix}
                                    disabled={isReacting}
                                    className="px-6 py-2.5 rounded-2xl font-bold text-sm text-white flex items-center gap-2 transition-all"
                                    style={{
                                      background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                                      boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                                    }}
                                  >
                                    {isReacting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    Tiến hành phản ứng
                                  </button>
                                )}
                                <button
                                  onClick={resetLab}
                                  className="px-4 py-2.5 rounded-2xl font-bold text-sm text-red-400 transition-all"
                                  style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                  }}
                                >
                                  Dừng thí nghiệm
                                </button>
                              </div>
                            </div>

                            {/* ── Drag hint ── */}
                            <div
                              className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-slate-500 pointer-events-none"
                              style={{ letterSpacing: '0.05em' }}
                            >
                              🖱 Kéo để xoay · Cuộn để zoom
                            </div>
                          </div>

                          {/* Reaction Log */}
                          <div
                            className="rounded-2xl p-4 font-mono text-xs h-36 overflow-y-auto"
                            style={{
                              background: 'rgba(6,11,24,0.85)',
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(124,58,237,0.2)',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/40">
                              <Info className="w-3.5 h-3.5 text-cyan-500" />
                              <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-wider">Nhật ký phản ứng</span>
                            </div>
                            {reactionLog.length === 0 ? (
                              <div className="text-slate-600 italic text-[11px]">Chưa có hoạt động nào...</div>
                            ) : (
                              reactionLog.map((log, i) => (
                                <div key={i} className="mb-1 flex gap-2 text-[11px]">
                                  <span className="text-slate-600 shrink-0">{log.split(']')[0]}]</span>
                                  <span className={cn(
                                    log.includes('Phương trình') ? 'text-cyan-400' : 'text-emerald-400'
                                  )}>{log.split(']')[1]}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* ── 3D Chemical Panel (right) ── */}
                        <div className="flex flex-col gap-4 overflow-hidden">
                          <div
                            className="rounded-2xl p-4 flex-1 overflow-y-auto"
                            style={{
                              background: 'rgba(6,11,24,0.85)',
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(124,58,237,0.2)',
                            }}
                          >
                            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-100 text-sm">
                              <FlaskConical className="w-4 h-4 text-violet-400" />
                              Hóa chất
                            </h3>
                            <div className="space-y-2">
                              {chemicals.map(chem => (
                                <div
                                  key={chem.id}
                                  onClick={() => toggleChemical(chem.id)}
                                  className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all"
                                  style={selectedChemicals.includes(chem.id) ? {
                                    background: 'rgba(124,58,237,0.15)',
                                    border: '1px solid rgba(124,58,237,0.4)',
                                    boxShadow: '0 0 10px rgba(124,58,237,0.1)',
                                  } : {
                                    background: 'rgba(30,41,59,0.5)',
                                    border: '1px solid rgba(51,65,85,0.5)',
                                  }}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="w-7 h-9 rounded-lg relative overflow-hidden shrink-0"
                                      style={{ background: '#0f172a', border: '1px solid rgba(51,65,85,0.6)' }}
                                    >
                                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-1 rounded-b-sm" style={{ background: 'rgba(148,163,184,0.4)' }} />
                                      <div className="absolute bottom-0 left-0 right-0 h-[55%]" style={{ background: chem.color, opacity: 0.85 }} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-200">{chem.name}</div>
                                      <div className="text-[10px] font-mono text-violet-400">{chem.formula}</div>
                                    </div>
                                  </div>
                                  <div
                                    className="p-1.5 rounded-lg transition-colors shrink-0"
                                    style={selectedChemicals.includes(chem.id) ? {
                                      background: 'rgba(124,58,237,0.7)', color: '#fff'
                                    } : {
                                      background: 'rgba(30,41,59,0.8)', color: '#64748b'
                                    }}
                                  >
                                    {selectedChemicals.includes(chem.id) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Safety Warning */}
                          <div
                            className="p-4 rounded-2xl"
                            style={{
                              background: 'rgba(245,158,11,0.06)',
                              border: '1px solid rgba(245,158,11,0.2)',
                              boxShadow: '0 0 15px rgba(245,158,11,0.05)',
                            }}
                          >
                            <h4 className="text-amber-400 font-bold text-xs mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5" /> Cảnh báo an toàn
                            </h4>
                            <ul className="text-[10px] text-amber-300/70 space-y-1 list-disc pl-4">
                              <li>Luôn đeo kính bảo hộ ảo.</li>
                              <li>Không trộn lẫn các axit mạnh mà không có hướng dẫn.</li>
                              <li>Kiểm tra nhãn hóa chất trước khi sử dụng.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'library' && (
                  <motion.div
                    key="library"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    {/* Header: title + add button */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-slate-100">Thư viện hóa chất</h3>
                      <button
                        onClick={() => {
                          Swal.fire({
                            title: '➕ Thêm hóa chất mới',
                            width: 520,
                            html: `
                              <style>
                                .swal-label {
                                  display:block; text-align:left; font-size:11px; font-weight:700;
                                  color:#94a3b8; text-transform:uppercase; letter-spacing:.06em;
                                  margin: 10px 22px 2px;
                                }
                                #swal2-html-container .swal2-input,
                                #swal2-html-container select.swal2-input { margin: 4px auto !important; }
                              </style>
                              <label class="swal-label">Tên hóa chất *</label>
                              <input id="swal-name" class="swal2-input" placeholder="VD: Axit Clohidric">
                              <label class="swal-label">Công thức hóa học *</label>
                              <input id="swal-formula" class="swal2-input" placeholder="VD: HCl">
                              <label class="swal-label">Mô tả</label>
                              <input id="swal-desc" class="swal2-input" placeholder="VD: Axit mạnh, ăn mòn kim loại">
                              <label class="swal-label">Loại hóa chất</label>
                              <select id="swal-category" class="swal2-input">
                                <option value="Axit">⚗️ Axit</option>
                                <option value="Bazơ">🧪 Bazơ</option>
                                <option value="Muối &amp; Oxit">🔬 Muối &amp; Oxit</option>
                                <option value="Kim loại">⚙️ Kim loại</option>
                                <option value="Chỉ thị">🌈 Chỉ thị màu</option>
                                <option value="Khác">📦 Khác</option>
                              </select>
                              <label class="swal-label">Trạng thái vật lý</label>
                              <select id="swal-state" class="swal2-input">
                                <option value="liquid">💧 Lỏng</option>
                                <option value="solid">🪨 Rắn</option>
                                <option value="gas">💨 Khí</option>
                              </select>
                              <label class="swal-label">Màu sắc</label>
                              <input id="swal-color" type="color" class="swal2-input" value="#3b82f6" style="height:48px; cursor:pointer">
                              <label class="swal-label">Cảnh báo an toàn (cách nhau bằng dấu phẩy)</label>
                              <input id="swal-warning" class="swal2-input" placeholder="VD: Ăn mòn, Dễ bay hơi">
                            `,
                            focusConfirm: false,
                            showCancelButton: true,
                            confirmButtonText: 'Thêm vào thư viện',
                            cancelButtonText: 'Hủy',
                            confirmButtonColor: '#7c3aed',
                            preConfirm: () => {
                              const name = (document.getElementById('swal-name') as HTMLInputElement).value.trim();
                              const formula = (document.getElementById('swal-formula') as HTMLInputElement).value.trim();
                              const desc = (document.getElementById('swal-desc') as HTMLInputElement).value.trim();
                              const category = (document.getElementById('swal-category') as HTMLSelectElement).value;
                              const state = (document.getElementById('swal-state') as HTMLSelectElement).value;
                              const color = (document.getElementById('swal-color') as HTMLInputElement).value;
                              const warningRaw = (document.getElementById('swal-warning') as HTMLInputElement).value.trim();
                              if (!name || !formula) {
                                Swal.showValidationMessage('⚠️ Vui lòng nhập Tên và Công thức hóa học!');
                                return false;
                              }
                              const safetyWarnings = warningRaw
                                ? warningRaw.split(',').map((w: string) => w.trim()).filter(Boolean)
                                : ['Cần cẩn thận khi sử dụng'];
                              return {
                                id: Date.now().toString(),
                                name, formula, color, state, category,
                                description: desc || `${category} — ${formula}`,
                                safetyWarnings,
                              };
                            }
                          }).then((result) => {
                            if (result.isConfirmed) {
                              addChemical(result.value);
                            }
                          });
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all glow-btn"
                      >
                        <Plus className="w-5 h-5" /> Thêm hóa chất
                      </button>
                    </div>

                    {/* Search + Filter bar */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Tìm theo tên, công thức, mô tả..."
                          value={librarySearch}
                          onChange={(e) => setLibrarySearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 dark-input text-sm"
                        />
                        {librarySearch && (
                          <button
                            onClick={() => setLibrarySearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(['', 'liquid', 'solid', 'gas'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setLibraryStateFilter(s)}
                            className={cn(
                              'px-3 py-2 rounded-xl text-xs font-bold transition-all border',
                              libraryStateFilter === s
                                ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                                : 'bg-slate-800/60 text-slate-500 border-slate-700/40 hover:bg-slate-700/60 hover:text-slate-300'
                            )}
                          >
                            {s === '' ? 'Tất cả' : s === 'liquid' ? 'Lỏng' : s === 'solid' ? 'Rắn' : 'Khí'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chemical grid */}
                    {(() => {
                      const q = librarySearch.toLowerCase().trim();
                      const filtered = chemicals.filter(c => {
                        const matchQuery = !q ||
                          (c.name ?? '').toLowerCase().includes(q) ||
                          (c.formula ?? '').toLowerCase().includes(q) ||
                          (c.description ?? '').toLowerCase().includes(q);
                        const matchState = !libraryStateFilter || c.state === libraryStateFilter;
                        return matchQuery && matchState;
                      });
                      return filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                          <Search className="w-12 h-12 mb-3 opacity-20" />
                          <p className="text-base font-medium text-slate-500">Không tìm thấy hóa chất{q ? ` "${librarySearch}"` : ''}</p>
                          <p className="text-sm text-slate-600 mt-1">Thử thay đổi từ khóa hoặc bộ lọc</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {filtered.map((chem, idx) => (
                            <motion.div
                              key={chem.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className="glass-card p-6 rounded-2xl hover:border-violet-500/30 transition-all duration-300 group relative overflow-hidden"
                            >
                              {/* Colored left accent */}
                              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: chem.color }} />

                              <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl shadow-inner border border-slate-600/50 relative overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                                  <div className="absolute bottom-0 left-0 right-0 h-3/5" style={{ backgroundColor: chem.color, opacity: 0.85 }} />
                                </div>
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-700/80 text-slate-300 uppercase tracking-wider border border-slate-600/30">
                                  {chem.state === 'liquid' ? 'Lỏng' : chem.state === 'solid' ? 'Rắn' : 'Khí'}
                                </span>
                              </div>
                              <h4 className="text-base font-bold text-slate-100">{chem.name}</h4>
                              <p className="text-violet-400 font-mono font-bold mb-3 text-sm">{chem.formula}</p>
                              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{chem.description}</p>

                              <div className="space-y-2">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cảnh báo an toàn</div>
                                <div className="flex flex-wrap gap-2">
                                  {chem.safetyWarnings.map((w, i) => (
                                    <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                                      {w}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}

                {activeTab === 'lessons' && (
                  <motion.div
                    key="lessons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-full text-slate-500 flex-col gap-4"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/30">
                      <BookOpen className="w-10 h-10 opacity-30" />
                    </div>
                    <p className="text-lg font-medium text-slate-400">Tính năng Bài giảng đang được cập nhật...</p>
                    <p className="text-sm text-slate-600">Sẽ sớm có trong phiên bản tiếp theo</p>
                  </motion.div>
                )}

                {activeTab === 'progress' && (
                  <motion.div
                    key="progress"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Score Card */}
                      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-bl-full" />
                        <div className="text-slate-400 text-sm mb-1">Điểm trung bình</div>
                        <div className="text-4xl font-extrabold gradient-text-v2">8.5</div>
                        <div className="text-xs text-emerald-400 mt-3 flex items-center gap-1 font-medium">
                          <ChevronRight className="w-3 h-3 rotate-[-90deg]" /> +0.5 so với tuần trước
                        </div>
                      </div>

                      {/* Experiments Card */}
                      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full" />
                        <div className="text-slate-400 text-sm mb-1">Thí nghiệm đã làm</div>
                        <div className="text-4xl font-extrabold text-cyan-400">24</div>
                        <div className="text-xs text-slate-500 mt-3">Hoàn thành 80% mục tiêu</div>
                      </div>

                      {/* Time Card */}
                      <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
                        <div className="text-slate-400 text-sm mb-1">Thời gian học</div>
                        <div className="text-4xl font-extrabold text-emerald-400">12h 45m</div>
                        <div className="text-xs text-amber-400 mt-3">🔥 Đang trong chuỗi 5 ngày</div>
                      </div>
                    </div>

                    {/* Activity History */}
                    <div className="glass-card p-8 rounded-2xl">
                      <h3 className="text-xl font-bold mb-6 text-slate-100">Lịch sử hoạt động</h3>
                      <div className="space-y-3">
                        {[
                          { name: 'Phản ứng trung hòa', time: 'Hôm qua, 14:30', score: '9.0/10' },
                          { name: 'Sắt tác dụng với Axit', time: '2 ngày trước, 10:15', score: '8.5/10' },
                          { name: 'Kết tủa với BaCl₂', time: '3 ngày trước, 16:45', score: '9.5/10' },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-slate-700/30 hover:border-violet-500/20 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-slate-200 text-sm">Hoàn thành: {item.name}</div>
                                <div className="text-xs text-slate-500">{item.time}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-violet-400">{item.score}</div>
                              <div className="text-[10px] text-slate-500">Báo cáo đã nộp</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ApiKeyModal isOpen={isApiModalOpen} onClose={() => setIsApiModalOpen(false)} />
      <ProblemUploader
        isOpen={isProblemUploaderOpen}
        onClose={() => setIsProblemUploaderOpen(false)}
        onChemicalsGenerated={handleProblemResult}
      />
      {/* ===== Subject Detail Modal ===== */}
      <AnimatePresence>
        {selectedSubject && (() => {
          const subject = SUBJECTS.find(s => s.id === selectedSubject);
          const detail = SUBJECT_DETAILS[selectedSubject];
          if (!subject || !detail) return null;
          const gradientMap: Record<string, string> = {
            violet: 'from-violet-600 to-purple-600',
            emerald: 'from-emerald-600 to-teal-600',
            cyan: 'from-cyan-600 to-blue-600',
            amber: 'from-amber-600 to-orange-600',
          };
          const relatedExperiments = EXPERIMENTS.filter(e => detail.relatedExps.includes(e.id));
          return (
            <motion.div
              key="subject-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubject(null)}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.15)' }}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${gradientMap[detail.color]} p-6 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="text-4xl mb-2">
                        {subjectIcons[SUBJECTS.findIndex(s => s.id === selectedSubject)]}
                      </div>
                      <h2 className="text-2xl font-extrabold text-white">{subject.name}</h2>
                      <p className="text-white/70 text-sm mt-1 max-w-md">{detail.description}</p>
                    </div>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                      {subject.questionsCount} bài học
                    </div>
                    <div className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                      {detail.topics.length} chủ đề
                    </div>
                    {relatedExperiments.length > 0 && (
                      <div className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                        {relatedExperiments.length} thí nghiệm
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                  {/* Topics */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Atom className="w-4 h-4" /> Các chủ đề chính
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {detail.topics.map((topic, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-slate-600/60 transition-colors">
                          <span className="text-xl shrink-0">{topic.emoji}</span>
                          <div>
                            <div className="text-sm font-bold text-slate-200">{topic.name}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{topic.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Related Experiments */}
                  {relatedExperiments.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <FlaskConical className="w-4 h-4" /> Thí nghiệm liên quan
                      </h3>
                      <div className="space-y-2">
                        {relatedExperiments.map(exp => (
                          <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 hover:border-violet-500/30 transition-colors group">
                            <div>
                              <div className="text-sm font-bold text-slate-200">{exp.title}</div>
                              <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{exp.description}</div>
                            </div>
                            <button
                              onClick={() => { startExperiment(exp.id); setSelectedSubject(null); }}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-lg text-xs font-bold hover:from-violet-500 hover:to-cyan-500 transition-all ml-3"
                            >
                              <Play className="w-3 h-3 fill-current" /> Bắt đầu
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-600 rounded-xl bg-slate-800/30 border border-slate-700/30">
                      <GraduationCap className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm font-medium text-slate-500">Thí nghiệm đang được phát triển</p>
                      <p className="text-xs text-slate-600 mt-1">Sẽ có trong phiên bản tiếp theo</p>
                    </div>
                  )}

                  {/* Go to Lab button */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => { handleTabChange('lab'); setSelectedSubject(null); }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-xl font-bold hover:from-violet-500 hover:to-cyan-500 transition-all shadow-lg shadow-violet-500/20"
                    >
                      <FlaskConical className="w-4 h-4" /> Vào Phòng thí nghiệm
                    </button>
                    <button
                      onClick={() => setSelectedSubject(null)}
                      className="px-5 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700/50"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
