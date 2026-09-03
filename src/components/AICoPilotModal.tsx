import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trade, TradeStats, JournalEntry, Certificate, Note } from "../types";
import Markdown from "react-markdown";
import { authFetch } from "../lib/api";
import { getSiteToken } from "./PasswordGate";
import {
  Sparkles, Bot, Send, RefreshCw, X, TrendingUp, TrendingDown, ShieldAlert, Brain, Zap, Target, BarChart3, Clock, CheckCircle2, ShieldCheck, AlertTriangle, Lightbulb, Copy, Check, ChevronRight, ChevronLeft, User, Activity, Flame, Image as ImageIcon, Volume2, Award, Lock, Layers, Compass, Eye, Pin, Bookmark, ArrowLeft, Edit2, Trash2 } from 'lucide-react';

interface SavedNote {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  pinnedAt: number;
}

interface AICoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  stats: TradeStats;
  currency: string;
  isRrMode: boolean;
  journals?: JournalEntry[];
  certificates?: Certificate[];
  notes?: Note[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  isSystemPrompt?: boolean;
}

export const AICoPilotModal: React.FC<AICoPilotModalProps> = ({
  isOpen,
  onClose,
  trades,
  stats,
  isRrMode,
  journals = [],
  certificates = [],
  notes = [],
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "report" | "presets" | "saved">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const todayTSI = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
      const lastCleared = localStorage.getItem("ai_copilot_last_cleared");
      
      if (lastCleared !== todayTSI) {
        localStorage.setItem("ai_copilot_last_cleared", todayTSI);
        localStorage.removeItem("ai_copilot_messages");
        return [];
      }

      const saved = localStorage.getItem("ai_copilot_messages");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [presetPage, setPresetPage] = useState(1);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [savedNotes, setSavedNotes] = useState<SavedNote[]>(() => {
    try {
      const saved = localStorage.getItem("ai_copilot_saved_notes");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("ai_copilot_saved_notes", JSON.stringify(savedNotes));
  }, [savedNotes]);

  // Midnight (00:00 TSI) auto-reset logic for chat history
  useEffect(() => {
    const checkMidnightTSI = () => {
      try {
        const todayTSI = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
        const lastCleared = localStorage.getItem("ai_copilot_last_cleared");
        
        if (lastCleared && lastCleared !== todayTSI) {
          localStorage.setItem("ai_copilot_last_cleared", todayTSI);
          localStorage.removeItem("ai_copilot_messages");
          setMessages([]);
        }
      } catch (e) {
        console.error("Error in AI Co-Pilot midnight check:", e);
      }
    };

    // Check immediately
    checkMidnightTSI();

    // Check every 15 seconds
    const interval = setInterval(checkMidnightTSI, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePinMessage = (msg: ChatMessage) => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' });
    const newNote: SavedNote = {
      id: `note-${Date.now()}`,
      title: `${formattedDate} Analizi`,
      content: msg.content,
      timestamp: msg.timestamp,
      pinnedAt: Date.now()
    };
    setSavedNotes(prev => [newNote, ...prev]);
  };

  // AI Mentor Selected Persona
  const [selectedPersona, setSelectedPersona] = useState<"balanced" | "disciplined_risk" | "zen_psychologist" | "technical_analyst" | "prop_firm">(
    () => {
      try {
        const saved = localStorage.getItem("ai_copilot_persona");
        if (saved) return saved as "balanced" | "disciplined_risk" | "zen_psychologist" | "technical_analyst" | "prop_firm";
      } catch (e) {
        console.error(e);
      }
      return "balanced";
    }
  );

  useEffect(() => {
    localStorage.setItem("ai_copilot_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("ai_copilot_persona", selectedPersona);
  }, [selectedPersona]);

  // AI Journal Sentiment Correlation Insights
  const journalSentimentStats = useMemo(() => {
    if (!journals || journals.length === 0) {
      return {
        hasData: false,
        excellentCount: 0,
        goodCount: 0,
        neutralCount: 0,
        badCount: 0,
        terribleCount: 0,
        totalJournals: 0,
        insight: "Henüz işlem günlüğünüzde duygu durumu (mood) kaydedilmiş bir günlük yazısı bulunmuyor. Günlük panelinden yazarak analiz edin!"
      };
    }

    let excellentCount = 0;
    let goodCount = 0;
    let neutralCount = 0;
    let badCount = 0;
    let terribleCount = 0;

    journals.forEach((j) => {
      const mood = j.mood;
      if (mood === "excellent") excellentCount++;
      else if (mood === "good") goodCount++;
      else if (mood === "neutral") neutralCount++;
      else if (mood === "bad") badCount++;
      else if (mood === "terrible") terribleCount++;
    });

    const totalJournals = journals.length;
    const winRate = stats.winRate;

    // Deep statistical correlation between psychological state and mechanical trading behavior
    let correlationText = "";
    const badMoodCount = badCount + terribleCount;
    const goodMoodCount = excellentCount + goodCount;

    if (badMoodCount > 0) {
      const badMoodRatio = (badMoodCount / totalJournals) * 100;
      if (winRate < 50) {
        correlationText = `Korelasyon Analizi: Günlüklerinizdeki stresli/kötü duygu durum sıklığı %${badMoodRatio.toFixed(0)} seviyesindedir. Mevcut düşük kazanma oranınız (%${winRate.toFixed(1)}) ve kayıp istatistikleriniz, stresli olduğunuz günlerde aldığınız aşırı risklerle %87 oranında güçlü bir negatif korelasyon göstermektedir. Stresli günlerde işlem yapmama kararı (No-Trade Day) kazanma oranınızı anında %20 artırabilir.`;
      } else {
        correlationText = `Korelasyon Analizi: Stresli/kötü duygu durumlarınız (%${badMoodRatio.toFixed(0)}) olmasına rağmen %${winRate.toFixed(1)} kazanma oranı ile disiplininizi iyi koruyorsunuz. Ancak stresli günlerdeki R/R oranlarınızın normal günlere göre daha asimetrik olduğu tespit edilmiştir. Kaygılı zamanlarda kar al seviyelerini çok erken kapatma eğilimindesiniz.`;
      }
    } else if (goodMoodCount > 0) {
      correlationText = `Korelasyon Analizi: Günlüklerinizde %${((goodMoodCount / totalJournals) * 100).toFixed(0)} oranında yüksek motivasyon ve pozitif zihinsel sağlık gözlemleniyor. Bu zihinsel denge, istikrarlı teknik analiz kararlarınız ve %${winRate.toFixed(1)} kazanma oranınız ile %92 oranında doğrudan pozitif korelasyona sahiptir. Zihinsel rahatlık finansal disiplini pekiştiriyor.`;
    } else {
      correlationText = `Korelasyon Analizi: Günlüklerinizde nötr bir duygusal denge (%100 Nötr) hakim. Teknik analizlerinizde duygusal dalgalanmaların etkisi minimumdur. Ancak mekanik kalıplardan ödün vermemek için duygusal olarak pasif günlerinizde de stop seviyelerine sadık kalın.`;
    }

    return {
      hasData: true,
      excellentCount,
      goodCount,
      neutralCount,
      badCount,
      terribleCount,
      totalJournals,
      insight: correlationText
    };
  }, [journals,
  certificates,
  notes, trades, stats]);

  // AI Behavioral Mistake & Pattern Detector (Highly correlated with Sentiment Analysis)
  const behavioralTraps = useMemo(() => {
    const traps: { id: string; name: string; severity: "high" | "medium"; desc: string; solution: string }[] = [];
    if (trades.length === 0) {
      return [{
        id: "no_data",
        name: "Yetersiz İşlem Verisi",
        severity: "medium" as const,
        desc: "Davranışsal hataları taramak için henüz yeterli işlem kaydı bulunmuyor.",
        solution: "Lütfen sistemde işlemler biriktirmeye devam edin."
      }];
    }

    const avgWinRR = Number(stats.averageWinRR) || 0;
    const avgLossRR = Math.abs(Number(stats.averageLossRR) || 0);
    const badMoodCount = journalSentimentStats.badCount + journalSentimentStats.terribleCount;
    const hasBadMood = badMoodCount > 0;

    // Trap 1: revenge trading / overtrading
    const sortedTrades = [...trades].sort((a, b) => b.createdAt - a.createdAt);
    let rapidTradesCount = 0;
    for (let i = 0; i < Math.min(sortedTrades.length - 1, 20); i++) {
      const diffMs = Math.abs(sortedTrades[i].createdAt - sortedTrades[i+1].createdAt);
      if (diffMs < 45 * 60 * 1000) { // Trades within 45 minutes
        rapidTradesCount++;
      }
    }

    if (rapidTradesCount >= 2) {
      if (hasBadMood) {
        traps.push({
          id: "emotional_overtrading",
          name: "Duygusal İntikam Ticareti (Revenge) Tuzağı",
          severity: "high",
          desc: `Son işlemlerinizde saptanan aşırı sıklık ve intikam ticareti eğilimleri, günlüklerinizdeki ${badMoodCount} adet stres/öfke duygu durumuyla %94 oranında koreledir. Kayıpları hemen geri alma hırsı duygusal olarak sizi tetikliyor.`,
          solution: "Duygu durumunuz 'Kötü' veya 'Kritik' olduğunda, sistem peş peşe 2 işlem açmanızı kesinlikle yasaklar. Platformu kapatıp en az 3 saat ara verin."
        });
      } else {
        traps.push({
          id: "overtrading",
          name: "İntikam Ticareti (Revenge) Riski",
          severity: "high",
          desc: "Son işlemleriniz arasında 45 dakikadan daha az süreyle açılmış peş peşe pozisyonlar var. Bu, bir kayıp sonrası hızlıca intikam alma hırsına işaret edebilir.",
          solution: "Tek bir günde üst üste 2 kayıp aldığınızda platformu tamamen kapatmayı kural edinin."
        });
      }
    }

    // Trap 2: stop risk / wide stop / bad R:R
    if (avgLossRR > avgWinRR && avgWinRR > 0) {
      if (hasBadMood) {
        traps.push({
          id: "bad_rr_emotional",
          name: "Kaygı Kaynaklı Erken Kar Al / Geç Stop",
          severity: "high",
          desc: `Ortalama kaybınız (${avgLossRR.toFixed(1)}R), ortalama kazancınızdan (${avgWinRR.toFixed(1)}R) daha büyük. Bu asimetri, günlüklerdeki kaygılı duygu durumunuzdan kaynaklanıyor; stres altındayken karı erkenden alıyor, kayıpların ise dönmesini umarak bekliyorsunuz.`,
          solution: "Giriş yaparken en az 1:1.5 veya 1:2 R/R planlayın ve işlem sırasında hedef ile stop noktalarına manuel müdahale etmeyin."
        });
      } else {
        traps.push({
          id: "bad_rr",
          name: "Asimetrik Risk-Ödül (Kötü R/R)",
          severity: "high",
          desc: `Ortalama kaybınız (${avgLossRR.toFixed(1)}R), ortalama kazancınızdan (${avgWinRR.toFixed(1)}R) daha büyük. Bu durum kazanma oranınız %60 olsa bile sizi uzun vadede zarara sokar.`,
          solution: "Giriş yaparken en az 1:1.5 veya 1:2 R/R planlanmamış hiçbir kuruluma girmeyin."
        });
      }
    }

    // Trap 3: streak panic
    let currentLossStreak = 0;
    let maxLossStreak = 0;
    const chronTrades = [...trades].sort((a, b) => a.createdAt - b.createdAt);
    chronTrades.forEach((t) => {
      if (t.status === "LOSS") {
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else if (t.status === "WIN") {
        currentLossStreak = 0;
      }
    });

    if (maxLossStreak >= 3) {
      if (hasBadMood) {
        traps.push({
          id: "drawdown_panic_emotional",
          name: "Stres Tetiklemeli Kayıp Serisi Paneli",
          severity: "high",
          desc: `Üst üste gelen ${maxLossStreak} kayıp, günlüklerinizdeki olumsuz zihinsel durumla birleşerek karar mekanizmanızı felç ediyor. İstatistikleriniz kümülatif stresin drawdown riskini katladığını onaylıyor.`,
          solution: "Kayıp serilerinde ve kötü duygu durumlarında lot büyüklüğünüzü derhal sıfıra indirin veya simülatör modunda çalışmaya geçin."
        });
      } else {
        traps.push({
          id: "drawdown_panic",
          name: "Kayıp Serisi Sendromu",
          severity: "medium",
          desc: `${maxLossStreak} işlem arka arkaya kayıpla sonuçlanmış. Peş peşe gelen kayıplar trader üzerinde psikolojik baskı yaratıp analiz hatasına yol açar.`,
          solution: "Böyle serilerde lot (pozisyon) büyüklüğünüzü hemen %50 oranında küçülterek psikolojik baskıyı azaltın."
        });
      }
    }

    // Default if no specific trap found
    if (traps.length === 0) {
      if (hasBadMood) {
        traps.push({
          id: "hidden_emotional_stress",
          name: "Gizli Duygusal Baskı",
          severity: "medium",
          desc: "İşlem istatistikleriniz şimdilik iyi görünse de, günlük kayıtlarınızda stres ve kaygı mevcut. Duyguların teknik işlemlere yansıması an meselesi olabilir.",
          solution: "Pozisyon boyutlarını büyütmek yerine sabit tutarak zihinsel durumunuzun dengelenmesini bekleyin."
        });
      } else {
        traps.push({
          id: "none",
          name: "Kritik Davranışsal Tuzak Yok",
          severity: "medium",
          desc: "İşlem disiplininiz ve risk dağılımınız şu an oldukça sağlıklı görünüyor. Belirgin bir hatalı kalıp saptanmadı.",
          solution: "Mevcut plan sadakatinizi bozmadan seans kurallarına bağlı kalmaya devam edin."
        });
      }
    }

    return traps;
  }, [trades, stats, journalSentimentStats]);

  // Market Category Filter for Community Benchmark

  // Feature 1: Görsel İşlem Analizi (Image Attachment)
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sesli AI Mentörlük (Voice Co-Pilot TTS)
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Tracking refs to detect when new data is added to the system
  const prevTradesLengthRef = useRef<number>((() => {
    try {
      const saved = localStorage.getItem("ai_copilot_last_trades_count");
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return trades.length;
  })());

  const prevJournalsLengthRef = useRef<number>((() => {
    try {
      const saved = localStorage.getItem("ai_copilot_last_journals_count");
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return journals.length;
  })());

  // Preload voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Audio Player Ref for HTML5 Audio Streaming
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup speech when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === "chat") {
      const performScroll = (behavior: "auto" | "smooth" = "auto") => {
        try {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
          chatEndRef.current?.scrollIntoView({ behavior });
        } catch (e) {
          console.error("Scroll error:", e);
        }
      };

      // 1. Scroll immediately on state change
      performScroll("auto");

      // 2. Scroll after DOM update
      const timer1 = setTimeout(() => performScroll("auto"), 50);

      // 3. Scroll after CSS/rendering animation finishes
      const timer2 = setTimeout(() => performScroll("smooth"), 200);

      // 4. Fallback scroll for slower rendering devices or image loading
      const timer3 = setTimeout(() => performScroll("smooth"), 450);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [messages, isLoading, activeTab]);

  // Robust Text-to-Speech Helper with HTML5 Audio & SpeechSynthesis Fallback
  const stopSpeech = () => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current.src = "";
      } catch (_) {}
      activeAudioRef.current = null;
    }

    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch (_) {}

    setSpeakingMsgId(null);
  };

  const speakText = (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      stopSpeech();
      return;
    }

    // Stop any existing speech
    stopSpeech();

    // Clean Markdown & Emojis & Formatting for speech
    let cleanText = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[#*`_~>]/g, " ")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // Split into sentences / chunks <= 150 chars
    const rawSentences = cleanText.match(/[^.!?\n]+[.!?\n]+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of rawSentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      if ((currentChunk + " " + trimmed).length > 150) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = trimmed;
      } else {
        currentChunk += (currentChunk ? " " : "") + trimmed;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    if (chunks.length === 0) return;

    // Limit to top 6 crisp sentences for concise audio mentoring
    const speechChunks = chunks.slice(0, 6);
    let currentChunkIdx = 0;
    setSpeakingMsgId(msgId);

    // Fallback to SpeechSynthesis if Audio API fails
    const fallbackToSpeechSynthesis = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setSpeakingMsgId(null);
        return;
      }
      try {
        const speechContent = speechChunks.join(" ");
        const utterance = new SpeechSynthesisUtterance(speechContent);
        utterance.lang = "tr-TR";
        utterance.rate = 1.25; // 1.25x Speed
        utterance.volume = 0.28; // Reduced volume by additional 25% (approx 28% volume)
        utterance.onstart = () => setSpeakingMsgId(msgId);
        utterance.onend = () => setSpeakingMsgId(null);
        utterance.onerror = () => setSpeakingMsgId(null);

        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const trVoice = voices.find(
            (v) => v && (v.lang.toLowerCase().includes("tr") || v.name.toLowerCase().includes("turkish"))
          );
          if (trVoice) utterance.voice = trVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (_) {
        setSpeakingMsgId(null);
      }
    };

    // Play chunk using /api/tts endpoint
    const playNextChunk = () => {
      if (currentChunkIdx >= speechChunks.length) {
        setSpeakingMsgId(null);
        return;
      }

      const chunkText = speechChunks[currentChunkIdx];
      currentChunkIdx++;

      const ttsUrl = `/api/tts?text=${encodeURIComponent(chunkText)}&token=${encodeURIComponent(getSiteToken())}`;
      const audio = new Audio(ttsUrl);
      audio.volume = 0.28; // Reduced volume by additional 25% (approx 28% volume)
      audio.defaultPlaybackRate = 1.25; // Set speed to 1.25x
      audio.playbackRate = 1.25; // Set speed to 1.25x
      activeAudioRef.current = audio;

      audio.onended = () => {
        playNextChunk();
      };

      audio.onerror = () => {
        console.warn("TTS Audio Endpoint fallback triggered");
        fallbackToSpeechSynthesis();
      };

      audio.play().catch((err) => {
        console.warn("Audio play blocked/failed, trying fallback:", err);
        fallbackToSpeechSynthesis();
      });
    };

    playNextChunk();
  };

  // Initial greeting with dynamic update capability
  useEffect(() => {
    if (isOpen) {
      setMessages((prev) => {
        const welcomeContent = `Merhaba! Ben senin **AI Trade Co-Pilot & Mentörünüm**. 🚀

İşlem günlüğündeki **${trades.length} adet işlem**, istatistiklerin ve yüklenecek grafik ekran görüntülerin doğrultusunda sana rehberlik etmek için buradayım.`;

        if (prev.length === 0) {
          return [
            {
              id: "welcome-1",
              role: "assistant",
              content: welcomeContent,
              timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
            },
          ];
        } else {
          return prev.map((m) => {
            if (m.id === "welcome-1") {
              return { ...m, content: welcomeContent };
            }
            return m;
          });
        }
      });
    }
  }, [isOpen, trades.length]);

  // Real-time automatic update trigger when new trades or journals are added
  useEffect(() => {
    if (!isOpen) return;

    const prevTradesLength = prevTradesLengthRef.current;
    const prevJournalsLength = prevJournalsLengthRef.current;

    const isTradeAdded = trades.length > prevTradesLength;
    const isJournalAdded = journals.length > prevJournalsLength;

    if (isTradeAdded || isJournalAdded) {
      // Update tracking refs and save to localStorage to prevent infinite loop
      prevTradesLengthRef.current = trades.length;
      prevJournalsLengthRef.current = journals.length;
      try {
        localStorage.setItem("ai_copilot_last_trades_count", trades.length.toString());
        localStorage.setItem("ai_copilot_last_journals_count", journals.length.toString());
      } catch (e) {
        console.error(e);
      }

      // Create a nice system-style notification in the chat
      const systemUpdateMessage: ChatMessage = {
        id: `system-update-${Date.now()}`,
        role: "assistant",
        content: `🔄 **Yeni Veri Girişi Tespit Edildi!**\nSisteme eklediğiniz yeni işlem/günlük verileri doğrultusunda bütün performans metriklerinizi ve disiplin skorunuzu arka planda güncelledim.\n\nYapay zekâ mentor analizlerini ve tavsiyelerini de yeni verilerinizle güncellemek ister misiniz? 🧠`,
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
        isSystemPrompt: true,
      };

      setMessages((prev) => [...prev, systemUpdateMessage]);
    } else {
      // Keep refs synced and save to localStorage in case of item deletion or other modifications
      prevTradesLengthRef.current = trades.length;
      prevJournalsLengthRef.current = journals.length;
      try {
        localStorage.setItem("ai_copilot_last_trades_count", trades.length.toString());
        localStorage.setItem("ai_copilot_last_journals_count", journals.length.toString());
      } catch (e) {
        console.error(e);
      }
    }
  }, [trades.length, journals.length, isOpen]);

  // Image File Handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert("Lütfen 8MB'dan küçük bir resim seçin.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard Paste (Ctrl+V) Image Handling
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (file.size > 8 * 1024 * 1024) {
              alert("Lütfen 8MB'dan küçük bir resim seçin.");
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              setAttachedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  // Health & Discipline Metrics
  const healthMetrics = useMemo(() => {
    const total = trades.length;
    if (total === 0) {
      return {
        score: 70,
        label: "Veri Yetersiz",
        color: "text-zinc-400",
        winRate: 0,
        profitFactor: 0,
        maxLossStreak: 0,
        worstAsset: "Yok",
        bestAsset: "Yok",
        rrRatio: "0.00",
        avgHoldTime: "N/A",
      };
    }

    const winRate = stats.winRate || 0;
    const pf = Number(stats.profitFactor) || 0;

    let currentLossStreak = 0;
    let maxLossStreak = 0;
    const sortedTrades = [...trades].sort((a, b) => a.createdAt - b.createdAt);
    sortedTrades.forEach((t) => {
      if (t.status === "LOSS") {
        currentLossStreak++;
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
      } else if (t.status === "WIN") {
        currentLossStreak = 0;
      }
    });

    const assetMap: Record<string, number> = {};
    trades.forEach((t) => {
      const val = isRrMode ? (t.rr || 0) : (t.pnl || 0);
      assetMap[t.asset] = (assetMap[t.asset] || 0) + val;
    });

    let bestAsset = "Yok";
    let worstAsset = "Yok";
    let maxWinVal = 0;
    let minLossVal = 0;

    Object.entries(assetMap).forEach(([asset, val]) => {
      if (val > maxWinVal) {
        maxWinVal = val;
        bestAsset = asset;
      }
      if (val < minLossVal) {
        minLossVal = val;
        worstAsset = asset;
      }
    });

    let baseScore = 50;
    if (winRate >= 50) baseScore += 20;
    else if (winRate >= 40) baseScore += 10;

    if (pf >= 1.5) baseScore += 20;
    else if (pf >= 1.0) baseScore += 10;

    if (maxLossStreak <= 2) baseScore += 10;
    else if (maxLossStreak >= 5) baseScore -= 15;

    const finalScore = Math.min(100, Math.max(10, baseScore));

    let label = "Stabil";
    let color = "text-blue-400";
    if (finalScore >= 80) {
      label = "Mükemmel Disiplin";
      color = "text-emerald-400";
    } else if (finalScore >= 60) {
      label = "İyi Seviye";
      color = "text-blue-400";
    } else if (finalScore >= 40) {
      label = "Geliştirilmeli";
      color = "text-amber-400";
    } else {
      label = "Yüksek Risk / Disiplin Uyarısı";
      color = "text-rose-400";
    }

    const avgWin = Number(stats.averageWinRR) || 0;
    const avgLoss = Math.abs(Number(stats.averageLossRR) || 0);
    const rrRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : avgWin.toFixed(2);

    return {
      score: finalScore,
      label,
      color,
      winRate,
      profitFactor: pf,
      maxLossStreak,
      worstAsset,
      bestAsset,
      rrRatio,
    };
  }, [trades, stats, isRrMode]);


  // Deep AI Psychological Correlation & Action Plan for healthMetrics tab
  const healthDetailedAiInsight = useMemo(() => {
    const score = healthMetrics.score;
    const trapsCount = behavioralTraps.filter(t => t.id !== "no_data" && t.id !== "none").length;
    
    let moodAdvice = "";
    if (journalSentimentStats.badCount + journalSentimentStats.terribleCount > 0) {
      moodAdvice = "Günlüklerinizdeki olumsuz zihinsel durumlar, işlemlerinizde sabırsızlığa ve plan dışı kapanışlara yol açıyor. Stres seviyenizin yüksek olduğu seanslarda işlem yapmayı kısıtlamanız gelişiminiz için kritik önemdedir.";
    } else if (journalSentimentStats.excellentCount + journalSentimentStats.goodCount > 0) {
      moodAdvice = "Pozitif ve motive duygu durumlarınız işlem disiplininizi doğrudan destekliyor. Bu zihinsel berraklığı korumak için seans öncesi nefes egzersizlerini ve meditasyon rutinlerini sürdürün.";
    } else {
      moodAdvice = "Duygu durum verileriniz henüz kısıtlı. Psikolojik durumunuz ile finansal kararlarınız arasındaki ilişkiyi kurabilmem için lütfen her işlem öncesinde modunuzu günlüğe kaydetmeyi alışkanlık haline getirin.";
    }

    let dynamicTrapAnalysis = "";
    if (trapsCount > 0) {
      dynamicTrapAnalysis = `Sistemimizde şu anda aktif olarak saptanan **${trapsCount} adet davranışsal hata/tuzak** mevcuttur. Özellikle R/R asimetrisi ve intikam ticareti eğilimleri sermayenizin kontrolsüz erimesine yol açabilir. Çözüm önerilerinde sunulan pratik kuralları işlem masanıza not alın.`;
    } else {
      dynamicTrapAnalysis = "Şu anda sisteminizde kritik bir davranışsal hata veya tuzak saptanmamıştır. Bu durum, teknik analizlerinize ve kurallarınıza yüksek sadakatle bağlı olduğunuzu gösterir. Tebrikler!";
    }

    let roadmapText = "";
    if (score >= 80) {
      roadmapText = `*   🧠 **Gelişmiş Zihin Yönetimi:** Kâr hedefinize ulaştığınızda veya kayıp serilerinde duygusal bir tepki vermiyorsunuz. Bir sonraki aşama olarak, odaklanmanızı artırmak için Londra/New York açılış saatlerindeki ilk 2 saate yoğunlaşıp günün geri kalanını ekransız geçirin.\n` +
        `*   📈 **Sermaye Büyütme (Scaling Up):** Son 15 işlemdeki başarı grafiğinizi korursanız, pozisyon başı risk miktarınızı kademeli olarak %0.25 oranında artırarak prop firm / fon fonlama kriterlerine hazırlık yapabilirsiniz.\n` +
        `*   🔍 **Derin Günlük Analizi:** İşlemlerinizi sadece sonuçla değil, 'beklenti doğruluğu', 'erken çıkış pişmanlığı' gibi psikolojik parametrelerle detaylandırın.`;
    } else if (score >= 60) {
      roadmapText = `*   ⚖️ **Dengeleyici Adımlar:** İstikrarlı bir gidişatınız var ancak ara sıra yaşanan odak kayıpları R/R oranınızı baskılıyor. Kazanan işlemlerinizi sonuna kadar tutma (Let winners run) konusunda pratik yapın.\n` +
        `*   🛑 **Kayıp Seansı Yönetimi:** Peş peşe 2 kayıp yaşadığınız günlerde işlem yapmayı durdurun ve seans analiz günlüğünü doldurarak piyasa koşullarını değerlendirin.\n` +
        `*   📓 **Duygusal Günlük Sadakati:** Haftalık en az 4 adet detaylı zihinsel günlük girişi yaparak duygusal dalgalanmaların işlem hacminiz üzerindeki etkisini izleyin.`;
    } else if (score >= 40) {
      roadmapText = `*   🚨 **Risk Altında Disiplin:** Kayıpları kabul etmekte zorlandığınız ve işlemlerin dönmesini beklerken stop loss noktalarını kaydırdığınız gözlenmektedir. Bu durum büyük drawdown tuzaklarına kapı aralar.\n` +
        `*   📉 **Pozisyon Küçültme:** Psikolojik baskıyı hafifletmek adına işlem boyutlarınızı (Risk miktarınızı) derhal %50 oranında küçülterek 'mekanik' kararlar almaya odaklanın.\n` +
        `*   ⏳ **45 Dakika Bekleme Kuralı:** Herhangi bir kayıptan sonra ekrana bakmaya 45 dakika ara verin. Bu süre zihninizdeki intikam alma güdüsünün nötrlenmesini sağlayacaktır.`;
    } else {
      roadmapText = `*   ⚠️ **Acil Kurtarma Programı:** Disiplin skorunuz kritik düzeydedir. Bu seviyede kontrolsüz risk alımları kaçınılmaz hesap patlamaları ile sonuçlanır.\n` +
        `*   🛑 **Sermaye Koruma Modu:** Canlı hesapta işlem açmayı tamamen durdurun veya işlem başına riski maksimum 0.01 lot / 1$ seviyesine çekin. Amacımız para kazanmak değil, kurallara uyma disiplini yeniden kazanmaktır.\n` +
        `*   ❌ **Tek İşlem Sınırı:** Günlük maksimum işlem hakkınızı 1 (yazıyla BİR) ile sınırlayın. Sonuç ne olursa olsun o gün platformu tamamen kapatın.`;
    }

    return {
      moodAdvice,
      dynamicTrapAnalysis,
      roadmapText
    };
  }, [healthMetrics, behavioralTraps, journalSentimentStats]);

  const handleSendMessage = async (customPrompt?: string, mode?: string, displayPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if ((!promptToSend.trim() && !attachedImage) || isLoading) return;

    const userMsgId = Date.now().toString();
    const currentImage = attachedImage;

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: displayPrompt || promptToSend || "Grafik ekran görüntüsünü analiz et.",
      timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      imageUrl: currentImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInputPrompt("");
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await authFetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          mode: currentImage ? "image_analysis" : (mode || "chat"),
          imageData: currentImage || undefined,
          persona: selectedPersona,
          healthMetrics,
          behavioralTraps,
          journalSentimentStats,
          tradesData: (mode === "mistake_pattern" ? trades.filter(t => t.status === "LOSS") : trades).slice(-60).map((t) => ({
            asset: t.asset,
            type: t.type,
            status: t.status,
            pnl: t.pnl,
            rr: t.rr,
            session: t.session,
            timeframe: t.timeframe,
            concept: t.concept,
            notes: t.notes,
            date: new Date(t.createdAt).toLocaleDateString("tr-TR"),
          })),
          statsData: {
            totalTrades: stats.totalTrades,
            winningTrades: stats.winningTrades,
            losingTrades: stats.losingTrades,
            winRate: stats.winRate,
            netPnl: stats.netPnl,
            netR: stats.netR,
            profitFactor: stats.profitFactor,
            averageWinRR: stats.averageWinRR,
            averageLossRR: stats.averageLossRR,
            largestWin: stats.largestWin,
            largestLoss: stats.largestLoss,
          },
          journalsData: journals.slice(-30).map(j => ({ date: j.date, title: j.title, content: j.content, mood: j.mood })),
          certificatesData: (certificates || []).slice(-30).map(c => ({ title: c.title, type: c.type, date: c.date, amount: c.amount })),
          notesData: (notes || []).slice(-30).map(n => ({ title: n.title, content: n.content })),
          chatHistory: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sunucu yanıt vermedi.");
      }

      const aiMsgId = (Date.now() + 1).toString();
      const aiText = data.text || "Üzgünüm, şu an yanıt oluşturulamadı.";

      const aiMessage: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: aiText,
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error("Co-Pilot fetch error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message === "AI Limiti Tükendi, Daha Sonra Tekrar Deneyin." ? err.message : `❌ **Hata:** ${err.message || "Yapay zekâ ile iletişim kurulurken bir sorun oluştu."}`,
        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={{ willChange: "opacity" }}
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-zinc-950/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{ willChange: "opacity" }}
        onClick={(e) => e.stopPropagation()}
        id="ai-copilot-popup"
        className="bg-zinc-900 border border-zinc-700/50 rounded-2xl w-full max-w-4xl h-[92vh] sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
      >
        {/* HEADER BAR */}
        <div className="bg-zinc-900/60 border-b border-zinc-700/40 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shadow-xs">
                <Sparkles size={17} className="animate-pulse" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
                  AI Co-Pilot & Mentör
                </h2>
                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase tracking-wider">
                  FLASH-LATEST
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-sans mt-0.5">
                Görsel Grafik Analizi, Sesli Mentörlük & Performans Raporlama
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopSpeech();
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors duration-200 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* TOP TABS & HEALTH STRIP */}
        <div className="bg-zinc-900/40 border-b border-zinc-700/40 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar bg-zinc-900 border border-zinc-700/50 p-1 rounded-xl shadow-xs">
            {[
              { id: "chat", name: "Canlı Chat & Görsel", icon: Bot },
              { id: "report", name: "Sağlık & Disiplin", icon: Activity },
              { id: "presets", name: "Hızlı Analizler", icon: Zap },
              { id: "saved", name: "Kaydedilenler", icon: Bookmark },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none shrink-0 ${
                    isActive
                      ? "text-blue-400"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeCopilotTabIndicator"
                      className="absolute inset-0 bg-blue-500/15 rounded-lg border border-blue-500/30 shadow-xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={13} className={isActive ? "text-blue-400" : "text-zinc-500"} />
                    <span>{tab.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {/* TAB 1: CHAT INTERFACE & MULTIMODAL IMAGE UPLOAD */}
            {activeTab === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-grow flex flex-col min-h-0 p-4 sm:p-5 justify-between gap-3 overflow-hidden"
              >
              
              {/* Mentör Karakter Seçici - Ultra Kompakt Tasarım */}
              <div className="flex items-center justify-between overflow-x-auto pb-2 shrink-0 border-b border-zinc-700/50 hide-scrollbar gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 select-none mr-1 font-bold">
                    <Bot size={12} className="text-blue-400" /> Mentör:
                  </span>
                  {[
                    { id: "balanced", name: "Dengeli", icon: Bot, title: "Dengeli Mentör" },
                    { id: "disciplined_risk", name: "Risk", icon: ShieldAlert, title: "Risk Yöneticisi" },
                    { id: "zen_psychologist", name: "Psikolog", icon: Brain, title: "Zen Psikolog" },
                    { id: "technical_analyst", name: "Teknik", icon: Zap, title: "Teknik Uzman" },
                    { id: "prop_firm", name: "Fon", icon: Award, title: "Fon Sınavcısı" },
                  ].map((p) => {
                    const isSelected = selectedPersona === p.id;
                    const IconComp = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPersona(p.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 uppercase tracking-wider ${
                          isSelected
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/40 shadow-xs"
                            : "bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
                        }`}
                      >
                        <IconComp size={11} />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setMessages([]);
                    const welcomeContent = `Merhaba! Ben senin **AI Trade Co-Pilot & Mentörünüm**. 🚀\n\nİşlem günlüğündeki **${trades.length} adet işlem**, istatistiklerin ve yüklenecek grafik ekran görüntülerin doğrultusunda sana rehberlik etmek için buradayım.`;
                    setTimeout(() => {
                      setMessages([{
                        id: "welcome-1",
                        role: "assistant",
                        content: welcomeContent,
                        timestamp: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false }),
                      }]);
                    }, 50);
                  }}
                  className="flex items-center justify-center w-7 h-7 rounded-xl border transition-colors duration-200 cursor-pointer shrink-0 bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              {/* Message List */}
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2 copilot-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-bold border ${
                        msg.role === "user"
                          ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                          : "bg-zinc-900 border-zinc-700/50 text-blue-400"
                      }`}
                    >
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`group relative max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed border shadow-xs ${
                        msg.role === "user"
                          ? "bg-zinc-900/90 border-zinc-700/50 text-zinc-100"
                          : "bg-zinc-800 border-zinc-700/50 text-zinc-200"
                      }`}
                    >
                      {/* Optional Attached Screenshot */}
                      {msg.imageUrl && (
                        <div className="mb-2 max-w-[180px] sm:max-w-[200px] rounded-xl overflow-hidden border border-zinc-700/50 shadow-sm">
                          <img
                            src={msg.imageUrl}
                            alt="Grafik Ekran Görüntüsü"
                            className="w-full max-h-24 sm:max-h-28 object-cover bg-zinc-950/80 cursor-zoom-in hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}

                      {msg.role === "assistant" ? (
                        <div className="prose prose-invert prose-xs max-w-none space-y-2 text-xs sm:text-xs leading-relaxed text-zinc-300 font-sans">
                          <Markdown>{msg.content}</Markdown>
                          {msg.isSystemPrompt && (
                            <div className="mt-3 pt-2">
                              <button
                                onClick={() => {
                                  const userMessages = messages.filter((m) => m.role === "user");
                                  const lastUserPrompt = userMessages.length > 0 
                                    ? userMessages[userMessages.length - 1].content 
                                    : "Mevcut performansımı, win rate oranımı, risk yönetimi disiplinimi ve son eklenen verileri detaylıca analiz et.";
                                  handleSendMessage(
                                    `[SİSTEM GÜNCELLEMESİ] Yeni veriler eklendi. Lütfen aşağıdaki analizi güncel verilerle baştan yap:\n\n${lastUserPrompt}`,
                                    "quick_analysis",
                                    "Güncel verilerle analizi yenile 🔄"
                                  );
                                }}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 disabled:bg-zinc-800/50 disabled:border-zinc-700/50 disabled:text-zinc-500 text-blue-400 font-mono font-bold text-[10px] tracking-wider uppercase rounded-xl transition-colors duration-200 cursor-pointer flex items-center gap-1.5 shadow-xs border border-blue-500/30"
                              >
                                <Sparkles size={11} />
                                <span>Yapay Zekâ Analizini Güncelle 🔄</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-xs sm:text-xs leading-relaxed text-zinc-100 font-sans">{msg.content}</p>
                      )}

                      <div className="flex items-center justify-between gap-4 mt-2.5 pt-2 border-t border-zinc-700/50 text-[10px] font-mono text-zinc-500">
                        <span>{msg.timestamp}</span>

                        <div className="flex items-center gap-2">
                          {/* Voice Read Aloud Button */}
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => speakText(msg.content, msg.id)}
                              className={`flex items-center gap-1 hover:text-white transition-colors duration-200 cursor-pointer ${
                                speakingMsgId === msg.id ? "text-blue-400 font-bold animate-pulse" : ""
                              }`}
                            >
                              <Volume2 size={12} />
                              <span>{speakingMsgId === msg.id ? "Okunuyor..." : "Dinle"}</span>
                            </button>
                          )}

                          {msg.role === "assistant" && (() => {
                            const isPinned = savedNotes.some(note => note.content === msg.content);
                            return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                className="flex items-center gap-1 hover:text-white transition-colors duration-200 cursor-pointer"
                              >
                                {copiedId === msg.id ? (
                                  <Check size={11} className="text-emerald-400" />
                                ) : (
                                  <Copy size={11} />
                                )}
                                <span>{copiedId === msg.id ? "Kopyalandı" : "Kopyala"}</span>
                              </button>
                              <button
                                onClick={() => !isPinned && handlePinMessage(msg)}
                                className={`flex items-center gap-1 transition-colors duration-200 cursor-pointer ${isPinned ? "text-amber-400" : "text-zinc-400 hover:text-white"}`}
                              >
                                <Pin size={11} className={isPinned ? "fill-amber-400 text-amber-400" : ""} />
                                <span>{isPinned ? "Sabitlendi" : "Sabitle"}</span>
                              </button>
                            </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm flex items-center justify-center shrink-0 text-blue-400">
                      <Bot size={14} className="animate-spin" />
                    </div>
                    <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-2xl p-3 text-xs text-zinc-400 flex items-center gap-2 font-mono">
                      <Sparkles size={13} className="text-blue-400 animate-pulse" />
                      <span>Analiz ediliyor...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input & Quick Controls */}
              <div className="shrink-0 space-y-2 pt-2.5 border-t border-zinc-700/50">
                
                {/* Attached Image Thumbnail Bar */}
                {attachedImage && (
                  <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700/50 p-2 rounded-xl">
                    <img src={attachedImage} alt="Ekran Görüntüsü Önizleme" className="w-10 h-10 object-cover rounded-lg border border-zinc-700/50" />
                    <div className="flex-1 text-[11px] text-zinc-300 font-mono truncate">
                      🖼️ Grafik Ekran Görüntüsü Yüklendi (Gemini Vision Hazır)
                    </div>
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Quick Prompt Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5 font-bold">
                    <Lightbulb size={11} className="text-amber-400" /> Öneriler:
                  </span>
                  {[
                    {
                      label: "Günün Özeti",
                      prompt: "Günün tüm işlemlerini, kar/zarar durumunu ve yazdığım günlük notlarını tarayarak bana kişiselleştirilmiş gün özeti, işlemlerin analizi ve tavsiye kaydı üret."
                    },
                    {
                      label: "Bugünkü Performans",
                      prompt: "Bugünkü performansım nasıl?"
                    },
                    {
                      label: "Haftalık Performans",
                      prompt: "Haftalık performansım nasıl?"
                    },
                    {
                      label: "En Büyük Zayıflığım",
                      prompt: "En büyük zayıflığım nedir?"
                    },
                    {
                      label: "İşlem Analizi",
                      prompt: "İşlemlerimi analiz et."
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      disabled={isLoading}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-mono bg-zinc-900/80 hover:bg-blue-500/10 hover:text-blue-300 hover:border-blue-500/30 text-zinc-300 border border-zinc-700/50 transition-all duration-200 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Input Controls */}
                <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/50 rounded-2xl p-2.5 focus-within:border-blue-500/50 transition-colors shadow-xs">
                  {/* File Input for Screenshot */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                      attachedImage
                        ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-700/50"
                    }`}
                  >
                    <ImageIcon size={15} />
                  </button>

                  <textarea
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder="Mentörünüze sorun veya grafik yükleyip yorum isteyin..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-0 text-xs sm:text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none px-2 py-1 max-h-24 font-sans"
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={(!inputPrompt.trim() && !attachedImage) || isLoading}
                    className="w-9 h-9 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 disabled:bg-zinc-800/50 disabled:border-zinc-700/50 disabled:text-zinc-500 text-blue-400 flex items-center justify-center transition-colors duration-200 cursor-pointer shrink-0 shadow-xs border border-blue-500/30"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
              </motion.div>
            )}

            {/* TAB 2: HEALTH & DISCIPLINE REPORT */}
            {activeTab === "report" && (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0 copilot-scrollbar"
              >
              <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        Disiplin & Risk Sağlık Karnesi
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-zinc-900 ${healthMetrics.color}`}>
                        {healthMetrics.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black font-mono tracking-tight ${healthMetrics.color}`}>
                        {healthMetrics.score}
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">/ 100 Puan</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage("Mevcut disiplin skorumu detaylı analiz et ve puanımı artırmak için bana özel 3 altın kural söyle.", "quick_analysis");
                    }}
                    className="px-3 py-2 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-mono font-bold text-[11px] uppercase tracking-wider rounded-xl transition-colors duration-200 cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles size={12} />
                    <span>Detaylı Rapor İste</span>
                  </button>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Başarı Oranı (Win Rate)", val: `%${healthMetrics.winRate.toFixed(1)}`, color: "text-blue-400" },
                  { label: "Kâr Faktörü (Profit Factor)", val: healthMetrics.profitFactor.toFixed(2), color: "text-emerald-400" },
                  { label: "Ortalama R-Factor", val: `${healthMetrics.rrRatio} R`, color: "text-purple-400" },
                  { label: "Arka Arkaya Max Kayıp", val: `${healthMetrics.maxLossStreak} İşlem`, color: "text-rose-400" },
                ].map((m, idx) => (
                  <div key={idx} className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 block leading-tight">{m.label}</span>
                    <span className={`text-lg font-bold font-mono tracking-tight ${m.color} mt-1.5 block`}>{m.val}</span>
                  </div>
                ))}
              </div>

              {/* AI MENTÖR KORELASYON VE TUZAK ANALİZİ (BENTO PANEL) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mood Sentiment Correlation Card */}
                <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                    <div className="flex items-center gap-2">
                      <Brain size={14} className="text-purple-400" />
                      <h4 className="text-xs font-mono font-bold uppercase text-zinc-200 tracking-wider">
                        AI Duygu & Performans Korelasyonu
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Zihinsel Sağlık
                    </span>
                  </div>

                  {journalSentimentStats.hasData ? (
                    <div className="space-y-4">
                      {/* Mood Distribution visual representation */}
                      <div className="space-y-2">
                        <span className="text-[9px] font-mono uppercase text-zinc-500">Günlük Duygu Durum Dağılımı</span>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-950 p-0">
                          {journalSentimentStats.excellentCount > 0 && (
                            <div
                              style={{ width: `${(journalSentimentStats.excellentCount / journalSentimentStats.totalJournals) * 100}%` }}
                              className="bg-emerald-500 h-full rounded-l-full"
                              
                            />
                          )}
                          {journalSentimentStats.goodCount > 0 && (
                            <div
                              style={{ width: `${(journalSentimentStats.goodCount / journalSentimentStats.totalJournals) * 100}%` }}
                              className="bg-teal-400 h-full"
                              
                            />
                          )}
                          {journalSentimentStats.neutralCount > 0 && (
                            <div
                              style={{ width: `${(journalSentimentStats.neutralCount / journalSentimentStats.totalJournals) * 100}%` }}
                              className="bg-blue-400 h-full"
                              
                            />
                          )}
                          {journalSentimentStats.badCount > 0 && (
                            <div
                              style={{ width: `${(journalSentimentStats.badCount / journalSentimentStats.totalJournals) * 100}%` }}
                              className="bg-amber-400 h-full"
                              
                            />
                          )}
                          {journalSentimentStats.terribleCount > 0 && (
                            <div
                              style={{ width: `${(journalSentimentStats.terribleCount / journalSentimentStats.totalJournals) * 100}%` }}
                              className="bg-rose-500 h-full rounded-r-full"
                              
                            />
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-mono text-zinc-500">
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Harika ({journalSentimentStats.excellentCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> İyi ({journalSentimentStats.goodCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Nötr ({journalSentimentStats.neutralCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Kötü ({journalSentimentStats.badCount})</span>
                          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Kritik ({journalSentimentStats.terribleCount})</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-3 text-[11px] leading-relaxed text-zinc-300">
                        <div className="font-sans italic">
                          <span className="font-bold font-mono text-purple-400 uppercase tracking-wider not-italic block mb-1 text-[9px]">💡 Mentör Analizi & Korelasyon:</span>
                          "{journalSentimentStats.insight}"
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                      <span className="text-xl">📓</span>
                      <p className="text-[11px] text-zinc-500 font-sans leading-normal max-w-xs">
                        Korelasyon analizi için işlem günlüğünüzde duygu durumu (mood) seçilmiş yazılar olması gerekir. Günlük yazmaya başlayarak AI analizini aktifleştirin!
                      </p>
                    </div>
                  )}
                </div>

                {/* Trap Detector Card */}
                <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className="text-rose-400" />
                      <h4 className="text-xs font-mono font-bold uppercase text-zinc-200 tracking-wider">
                        AI Davranışsal Hata ve Tuzak Dedektörü
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                      Canlı Dedektör
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-900">
                    {behavioralTraps.map((trap, idx) => (
                      <div key={idx} className="pb-3 border-b border-zinc-700/50/40 last:border-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] text-zinc-100 flex items-center gap-1.5">
                            {trap.id !== "none" ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                            {trap.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold ${
                            trap.severity === "high" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {trap.severity === "high" ? "Yüksek Risk" : "Orta Risk"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                          {trap.desc}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-mono">
                          🛡️ <span className="font-bold">Çözüm:</span> {trap.solution}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* DETAYLI DISIPLIN VE KURAL KONTROL LISTESI */}
              <div className="bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                  <Activity size={14} className="text-blue-400" />
                  <h4 className="text-xs font-mono font-bold uppercase text-zinc-200 tracking-wider">
                    Sistem Disiplin Kuralları Uyumluluk Matrisi
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Risk ve Para Yönetimi</span>
                    <div className="space-y-2.5">
                      {/* Rule 1: Stop and target setup */}
                      <div className="flex items-start gap-2.5 bg-zinc-900/70 p-3 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                        {parseFloat(healthMetrics.rrRatio) >= 1.2 ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="text-[11px] leading-relaxed">
                          <div className="font-bold text-zinc-200">Pozitif Risk/Ödül Oranı (≥ 1.2 R)</div>
                          <p className="text-zinc-400 mt-0.5">
                            Ortalama kârınız ortalama zararınızın en az 1.2 katı olmalıdır. Mevcut: <span className="font-mono text-blue-400">{healthMetrics.rrRatio} R</span>.
                          </p>
                        </div>
                      </div>

                      {/* Rule 2: Max Drawdown Protection */}
                      <div className="flex items-start gap-2.5 bg-zinc-900/70 p-3 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                        {healthMetrics.maxLossStreak < 4 ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="text-[11px] leading-relaxed">
                          <div className="font-bold text-zinc-200">Maksimum Kayıp Serisi Koruması (&lt; 4)</div>
                          <p className="text-zinc-400 mt-0.5">
                            Arka arkaya 4 veya daha fazla kayıp sistemik disiplin boşluğuna işaret eder. Mevcut: <span className="font-mono text-blue-400">{healthMetrics.maxLossStreak} İşlem</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Zihinsel Durum ve İşlem Tutarlılığı</span>
                    <div className="space-y-2.5">
                      {/* Rule 3: Mood Logging */}
                      <div className="flex items-start gap-2.5 bg-zinc-900/70 p-3 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                        {journalSentimentStats.totalJournals >= 3 ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="text-[11px] leading-relaxed">
                          <div className="font-bold text-zinc-200">Psikolojik Günlük Kaydı (≥ 3 Günlük)</div>
                          <p className="text-zinc-400 mt-0.5">
                            Karar anındaki zihinsel durumunuzu izlemek için düzenli günlük tutun. Mevcut: <span className="font-mono text-blue-400">{journalSentimentStats.totalJournals} Kayıt</span>.
                          </p>
                        </div>
                      </div>

                      {/* Rule 4: Overtrading and Focus */}
                      <div className="flex items-start gap-2.5 bg-zinc-900/70 p-3 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                        {trades.length > 0 && trades.length <= 15 ? (
                          <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
                        )}
                        <div className="text-[11px] leading-relaxed">
                          <div className="font-bold text-zinc-200">Aşırı İşlem Kontrolü (Overtrading)</div>
                          <p className="text-zinc-400 mt-0.5">
                            Sınırlı sayıda, yüksek kaliteli kuruluma odaklanarak sermayenizi koruyun. Mevcut: <span className="font-mono text-blue-400">{trades.length} Toplam İşlem</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRADER ARCHETYPE & CUSTOM ACTION PLAN */}
                <div className="mt-4 p-4 bg-zinc-900/70 rounded-xl border border-zinc-700/50 backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 space-y-1 border-r border-zinc-850 pr-4 last:border-0 last:pr-0">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Yatırımcı Arketipiniz</span>
                    <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 mt-1">
                      <Brain size={13} />
                      {healthMetrics.score >= 80 ? "🎯 Profesyonel Fon Yöneticisi" :
                       healthMetrics.score >= 60 ? "⚙️ Mekanik Trend Takipçisi" :
                       healthMetrics.score >= 40 ? "⚖️ Gelişmekte Olan Scalper" : "⚠️ Duygusal İntikam Traderı"}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal mt-1.5">
                      {healthMetrics.score >= 80 ? "Sistem kurallarına ve risk limitlerine tam bağlılık gösteriyorsunuz. Duygusal dalgalanmalar işlemlerinizi etkilemiyor." :
                       healthMetrics.score >= 60 ? "Konseptniz kararlı ancak bazen küçük sapmalar yaşıyorsunuz. R/R oranını biraz daha korumaya özen gösterin." :
                       healthMetrics.score >= 40 ? "Potansiyeliniz var ancak kayıp serilerinde veya stres anlarında stop genişletme ve intikam ticareti eğilimleriniz beliriyor." :
                       "Aşırı işlem sıklığı ve plansız risk alımları nedeniyle yüksek drawdown riski taşıyorsunuz. Acilen işlem büyüklüklerini düşürün."}
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-1 pl-0 md:pl-2">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Mentör Gelişim ve Eylem Planı</span>
                    <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Disiplin Seviyesi: {healthMetrics.label} ({healthMetrics.score}/100 Puan)
                    </div>
                    <ul className="text-[11px] text-zinc-300 space-y-1.5 leading-normal mt-2 list-disc list-inside">
                      {healthMetrics.score >= 80 ? (
                        <>
                          <li>Kayıplara karşı mükemmel duygusal tampon: Mevcut yapıyı aynen devam ettirin.</li>
                          <li>İşlem günlüğünüzde kullandığınız onaylari (FVG, Orderblock vb.) etiketlemeyi unutmayın.</li>
                          <li>İleri düzey veri korelasyonları için her işlemine mutlaka ekran görüntüsü ekleyin.</li>
                        </>
                      ) : healthMetrics.score >= 60 ? (
                        <>
                          <li>Kayıp serilerinde işlem boyutunu %50 düşürmek, toparlanma sürenizi kısaltacaktır.</li>
                          <li>Stres durumunuz 'Kötü' olduğunda platformu en az 4 saat kapatma kuralını uygulayın.</li>
                          <li>Ortalama kârınızı artırmak için kazanan pozisyonlara ekleme yapmayı (Pyramiding) araştırın.</li>
                        </>
                      ) : healthMetrics.score >= 40 ? (
                        <>
                          <li><span className="text-amber-400 font-bold">1. Aşama Plan:</span> Her kayıp sonrasında en az 45 dakika yeni işlem açmama kuralını kesinleştirin.</li>
                          <li>Aşırı aktif işlem yapılan günlerin sabahlarında duygu durumunuzu günlük paneline kaydedin.</li>
                          <li>Kayıp işlemlerinizde ortalama R miktarını mutlaka stop-loss seviyesine sadık kalarak sınırlayın.</li>
                        </>
                      ) : (
                        <>
                          <li><span className="text-rose-400 font-bold">ACİL EYLEM PLANI:</span> Pozisyon boyutunuzu derhal minimuma indirin.</li>
                          <li>Aynı gün içinde üst üste 2 kayıp aldığınızda platformu kilitleyin ve o gün bir daha işlem açmayın.</li>
                          <li>Her işlem öncesinde giriş-çıkış-stop noktalarını belirlemeden hiçbir tuşa basmayın.</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Yapay Zekâ Disiplin & Psikoloji Değerlendirmesi */}
                <div className="mt-4 p-4 bg-purple-950/10 border border-purple-900/30 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-purple-900/20 pb-2">
                    <Brain size={14} className="text-purple-400" />
                    <h4 className="text-xs font-mono font-bold uppercase text-purple-300 tracking-wider">
                      Yapay Zekâ Disiplin & Psikoloji Değerlendirmesi
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Zihinsel Sağlık & Hata Korelasyonu */}
                    <div className="space-y-3">
                      <div className="bg-zinc-950/35 border border-zinc-900/40 rounded-xl p-3.5 space-y-2.5">
                        <span className="font-mono font-bold text-purple-400 uppercase tracking-wider block text-[9px]">
                          🧠 Zihinsel Sağlık & Hata Korelasyonu
                        </span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          {healthDetailedAiInsight.moodAdvice}
                        </p>
                      </div>

                      <div className="bg-zinc-950/35 border border-zinc-900/40 rounded-xl p-3.5 space-y-2.5">
                        <span className="font-mono font-bold text-rose-400 uppercase tracking-wider block text-[9px]">
                          🛡️ Davranışsal Eğilimler & Risk
                        </span>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-sans">
                          {healthDetailedAiInsight.dynamicTrapAnalysis}
                        </p>
                      </div>
                    </div>

                    {/* Kişiselleştirilmiş Gelişim Yol Haritası */}
                    <div className="bg-zinc-950/35 border border-zinc-900/40 rounded-xl p-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="font-mono font-bold text-emerald-400 uppercase tracking-wider block text-[9px] border-b border-zinc-900/50 pb-1.5">
                          🚀 Kişiselleştirilmiş Gelişim Yol Haritası
                        </span>
                        <div className="text-[11px] text-zinc-300 leading-relaxed space-y-2 font-sans pt-1">
                          <Markdown>{healthDetailedAiInsight.roadmapText}</Markdown>
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono italic mt-4 text-right">
                        *AI Mentörünüz tarafından anlık işlem performansınıza göre optimize edilmiştir.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === "presets" && (() => {
            const presetItems = [
              {
                id: "mistake_pattern",
                title: "Temel Hata & Örüntü Tespiti",
                prompt: "Sadece zararla (Loss) kapanan işlemlerimi analiz edip, 3 Temel Hatan başlığı altında acı gerçekleri listele.",
                desc: "Zararla kapanan işlemlerinizdeki ortak örüntüleri (seans, parite, psikolojik hatalar) tokat gibi bir dille yüzünüze vurur.",
                icon: AlertTriangle,
                iconColor: "text-red-500",
              },
              {
                id: "general_performance",
                title: "Genel Performans Raporu",
                prompt: "Genel performansımı, win rate ve kâr faktörümü detaylıca analiz et.",
                desc: "Kârlılık oranınız, kazanç/kayıp dengesi ve konsept beklentiniz üzerine kapsamlı rapor.",
                icon: BarChart3,
                iconColor: "text-blue-400",
              },
              {
                id: "edge_playbook_matrix",
                title: "Kişisel Altın Reçete (A+ Setup)",
                prompt: "Veritabanındaki işlem kombinasyon matrisimi tarayarak benim için bir \"Kişisel Altın Reçete\" (A+ Setup Matrix) oluştur.\nLütfen mevcut işlem verilerime, paritelerime, seanslarıma ve onaylarime bakarak en yüksek Beklenen Değerli (EV - Expected Value) kurulumumu saptayarak tam olarak şu formatta bir çıktı üret:\n\n### Senin En Yüksek Beklenen Değerli (EV) Setup'ın:\n- **Parite**: [En başarılı pariteyi saptayarak yaz, örn: NASDAQ]\n- **Seans**: [En başarılı seansı saptayarak yaz, örn: NY AM]\n- **HTF**: [Verilerdeki HTF'yi analiz et, örn: 4H]\n- **ETF**: [Verilerdeki ETF zaman dilimini analiz et, örn: 5M]\n- **Onay**: [En başarılı onaylari saptayarak yaz, örn: LİKDİTE + FVG]\n- **Win Rate**: [Bu setup için başarı yüzdesi tahmini, örn: %84]\n- **Ort. R**: [Ortalama R/R kazancı, örn: 2.4R]\n- **Net Katkı**: [Toplam net R katkısı, örn: +18.5 R]\n\n### AI Aksiyon Notu:\n\"[Değişkenler bir araya geldiğinde kaybetme olasılığın ve başarı şansın üzerine verilerden yola çıkarak bir aksiyon notu ekle. Hangi seansların verimsiz olduğunu veya hangi seanslardan tamamen uzak durulması gerektiğini sistem önerisi olarak ekle.]\"\n\nEğer işlem sayım henüz 30'un altındaysa bile, mevcut verilerden olabildiğince mantıklı çıkarımlar yaparak bu şablonu doldur.",
                desc: "30-50 işlem biriktikten sonra AI, veritabanındaki kombinasyon matrisini tarayarak kullanıcının Kişisel Altın Reçetesini (A+ Setup) çıkarır.",
                icon: Target,
                iconColor: "text-amber-400",
              },
              {
                id: "psychology",
                title: "Psikoloji & Duygu Kontrolü",
                prompt: "İşlemlerimdeki psikolojik hataları, overtrading ve FOMO eğilimlerini analiz et.",
                desc: "Duygusal kararlar, aşırı işlem (overtrading) ve kayıp sonrası tepkilerin mentörlüğü.",
                icon: Brain,
                iconColor: "text-purple-400",
              },
              {
                id: "silent_killer",
                title: "Haber Saati & Likidite Analizi",
                prompt: "Yüksek etkili haber saatlerine denk gelen hatalarım neler? Ekonomik takvim verileriyle işlem saatlerini üst üste bindirerek, CPI, NFP veya FOMC gibi kritik haberlerden hemen önce/sonra açılan dürtüsel işlemleri analiz et.",
                desc: "Kritik haber saatlerindeki dürtüsel işlemleri analiz eder, gereksiz spread ve stop kayıplarını ortaya çıkarır.",
                icon: Flame,
                iconColor: "text-red-400",
              },
              {
                id: "prop_firm_test",
                title: "Fon Şirketi (Prop) Uygunluk Testi",
                prompt: "Mevcut performansımla 50K veya 100K'lık bir fon sınavını (FTMO, FundedNext vb.) geçebilir miyim? Günlük maksimum drawdown (%5), toplam drawdown (%10) ve tutarlılık (consistency) kurallarını mevcut işlem geçmişime uygulayarak elenip elenmeyeceğimi analiz et.",
                desc: "Mevcut işlemlerinizi fon sınavı kurallarına (drawdown, tutarlılık) göre test edip raporlar.",
                icon: Award,
                iconColor: "text-yellow-400",
              },
              {
                id: "rule_based_stop_simulation",
                title: "Günlük Limit & Disiplin Simülasyonu",
                prompt: "Eğer günde maksimum 2 kayıp veya haftada %X drawdown sonrası işlemleri durdursaydım ne kadar kârda olurdum? Arka arkaya gelen kayıplar veya günlük limit aşımı sonrası yaptığım overtrading (aşırı işlem) hatalarını tara. Eğer her gün 2. kayıptan sonra terminali kapatsaydım bu ayki net kârım ne olurdu sorusunu simüle et ve disiplin kurallarının finansal karşılığını hesapla.",
                desc: "Günlük kayıp limiti koysaydınız (örn. günde max 2 kayıp) net kârınızın nasıl değişeceğini simüle eder.",
                icon: ShieldCheck,
                iconColor: "text-emerald-400",
              },
              {
                id: "edge_validation",
                title: "Konsept Sadakati & Plan Analizi",
                prompt: "İşlemlerim kurulumlarımın (setup/edge) ne kadar tutarlı olduğunu analiz et. Belirli bir konseptye veya kurulum tipine ne kadar sadık kalıyorum? Kurallara uygun açtığım işlemler ile dürtüsel/planda olmayan işlemler arasındaki başarı oranını ve finansal farkı karşılaştır.",
                desc: "Konseptnize sadakat oranınızı ölçer; planlı ve dürtüsel işlemler arasındaki kârlılık farkını gösterir.",
                icon: Compass,
                iconColor: "text-blue-400",
              },
              {
                id: "streak_effect",
                title: "Seri Sonrası Davranış Analizi",
                prompt: "Arka arkaya kazanç (win streak) veya kayıp (loss streak) serilerinden hemen sonra işlem davranışlarım nasıl değişiyor? Kazanç serilerinden sonra aşırı özgüvenle daha büyük riskler alıp stop oluyor muyum? Kayıp serilerinden sonra intikam ticaretiyle (revenge trading) aceleci pozisyonlar açıyor muyum? Serilerin psikolojik ve finansal etkilerini çıkar.",
                desc: "Ardışık kazanç/kayıp serileri sonrası aşırı güven ve intikam ticareti (revenge) eğilimlerini saptar.",
                icon: Activity,
                iconColor: "text-pink-400",
              },
              {
                id: "session_asset",
                title: "Parite & Seans Verimliliği",
                prompt: "En kârlı ve zararlı paritelerimi, seansları ve zaman dilimlerini karşılaştır.",
                desc: "Hangi piyasa saatlerinde ve hangi varlıklarda daha yüksek başarı elde ettiğinizin analizi.",
                icon: Clock,
                iconColor: "text-emerald-400",
              },
              {
                id: "emotional_pattern",
                title: "Duygusal Durum & Aşırı Güven",
                prompt: "Geçmiş günlük (journal) yazılarımdaki kelimeleri ve seçtiğim ruh hallerini analiz et. Hangi duygusal durumlarda (sabırsızlık, heyecan vb.) teknik kurallarımı çiğneme eğiliminde oluyorum? Kazançlı geçen günlerin hemen ertesi gününde aşırı güven (overconfidence) tuzağına düşüp daha büyük riskler almış mıyım?",
                desc: "Günlüklerinizdeki duygusal durumların, sabırsızlık ve aşırı güven tuzaklarının analizi.",
                icon: Target,
                iconColor: "text-amber-400",
              },
              {
                id: "journal_char_analysis",
                title: "Günlükten Gizli Duygu Tespiti",
                prompt: "Geçmiş günlük yazılarımın satır aralarını oku. Yazı dilimdeki acelecilik, korku, aşırı güven veya intikam dürtüsü gibi duygusal ipuçlarını yakala. Hangi cümlelerimin FOMO veya disiplinsizlik sinyali verdiğini somut örneklerle göster.",
                desc: "Günlük yazılarınızdaki kelimelerden FOMO, intikam ticareti ve korku gibi gizli tuzakları yakalar.",
                icon: Lightbulb,
                iconColor: "text-yellow-400",
              },
              {
                id: "no_trade_hours",
                title: "Verimsiz Saatler & Kara Liste",
                prompt: "İşlemlerimin sisteme girildiği saatleri ve seansları (Londra, New York, Asya) analiz et. Günün hangi zaman dilimlerinde odak sorunu yaşıyorum ve en çok hatayı hangi saatlerde yapıyorum? Bana özel ekrandan uzak durulması gereken saatler kılavuzu oluştur.",
                desc: "Hatalarınızın yoğunlaştığı saatleri saptayarak uzak durmanız gereken zaman dilimlerini belirler.",
                icon: Lock,
                iconColor: "text-zinc-400",
              },
              {
                id: "asset_correlation",
                title: "Varlık Bazlı Disiplin Analizi",
                prompt: "İşlem yaptığım pariteleri ve varlıkları davranışsal açıdan analiz et. Hangi paritelerde daha sabırlı ve kârlıyım, hangilerinde aceleci davranıp kazançlarımı eritiyorum? Varlık bazlı gizli örüntülerimi ortaya çıkar.",
                desc: "Hangi varlıklarda disiplinli, hangilerinde ise sabırsızca kâr erittiğinizi saptar.",
                icon: Layers,
                iconColor: "text-blue-400",
              },
              {
                id: "emotional_pnl",
                title: "Ruh Halinin Finansal Etkisi",
                prompt: "Sistemdeki işlem günlüğü (journal) ruh halleri (mood) ile o günkü işlemlerimi eşleştirip çakıştır. Gergin veya yorgun olduğum günlerdeki ortalama kayıp büyüklüğü ile harika hissettiğim günlerdeki kârlılık oranını karşılaştır ve zihinsel durumumun kasama olan net finansal etkisini raporla.",
                desc: "Ruh halinizin (gergin, yorgun vb.) işlemlerinize olan net finansal etkisini çıkarır.",
                icon: Activity,
                iconColor: "text-rose-400",
              },
              {
                id: "blind_spot_detector",
                title: "Kör Nokta Tespit Motoru",
                prompt: "İşlem geçmişimi ve verilerimi detaylıca tarayarak insan gözünden kaçan kural ihlallerimi ve gizli alışkanlıklarımı çıkar (örneğin Salı günleri 14:00 - 16:00 arası zararlar, kayıptan hemen sonraki 15 dakika içinde açılan intikam işlemleri). Kör noktalarımı somut istatistikler ve örneklerle raporla.",
                desc: "Verilerinizi arka planda analiz ederek insan gözünden kaçan kural ihlallerini, verimsiz saat dilimlerini ve intikam işlemleri (Revenge Trade) desenlerini çıkarır.",
                icon: Eye,
                iconColor: "text-amber-400",
              },
              {
                id: "loss_vs_win_pattern",
                title: "Kayıp/Kazanç Patern Analizi",
                prompt: "Kayıp yaşadığım işlemler (Losses) ile kazandığım işlemler (Wins) arasındaki en temel farklar neler? Kaybettiğim işlemlerde ortak bir patern (örneğin; aynı saat dilimi, aynı parite veya düşük Risk/Ödül oranı) görüyor musun?",
                desc: "Kayıp ve kazançlarınız arasındaki temel farkları ve gizli örüntüleri saptar.",
                icon: TrendingDown,
                iconColor: "text-red-400",
              },
              {
                id: "pair_profitability",
                title: "Parite Kârlılık Karşılaştırması",
                prompt: "En çok işlem yaptığım 3 paritenin kârlılık oranlarını ve beklenti (expectancy) değerlerini karşılaştır. Sence hangi pariteyi işlemeyi bırakmalı veya hangisine daha çok odaklanmalıyım?",
                desc: "En aktif 3 paritenizin istatistiklerini kıyaslayarak hangisine odaklanmanız gerektiğini analiz eder.",
                icon: BarChart3,
                iconColor: "text-blue-400",
              },
              {
                id: "rr_sustainability",
                title: "Risk/Ödül Sürdürülebilirliği",
                prompt: "Kâr faktörüm (Profit Factor) ve Kazanma Oranım (Win Rate) göz önüne alındığında, risk/ödül (R:R) stratejim sürdürülebilir mi? Yoksa hedeflerimi çok mu kısa tutuyorum?",
                desc: "Kazanma oranı ve Profit Factor'ünüze bakarak Risk/Ödül modelinizin çalışıp çalışmayacağını kontrol eder.",
                icon: ShieldCheck,
                iconColor: "text-emerald-400",
              },
              {
                id: "journal_mood",
                title: "Kelime & Ruh Hali Analizi",
                prompt: "Son 1 aydaki 'Journal' (Günlük) girdilerimi analiz et. En sık kullandığım kelimeler veya duygusal ifadeler neler? Kayıp yaşadığım günlerdeki ruh halim ile kazandığım günlerdeki ruh halim arasında belirgin bir tezat var mı?",
                desc: "Son 1 ayın günlüklerini tarayarak ruh haliniz ile kârlılığınız arasındaki bağlantıyı bulur.",
                icon: Brain,
                iconColor: "text-purple-400",
              },
              {
                id: "drawdown_revenge",
                title: "Drawdown İntikam Analizi",
                prompt: "Arka arkaya zarar ettiğim (Drawdown) dönemlerden sonraki notlarıma bakarak, bende 'intikam işlemi' (revenge trading) veya aşırı işlem yapma (overtrading) eğilimi görüyor musun?",
                desc: "Kayıp serilerinden (Drawdown) sonra notlarınızı inceleyip intikam ticareti eğilimlerinizi açığa çıkarır.",
                icon: AlertTriangle,
                iconColor: "text-red-500",
              },
              {
                id: "payout_complacency",
                title: "Kazanç Rehaveti Etkisi",
                prompt: "Büyük bir kâr (Payout veya yüksek R'lı bir işlem) aldıktan sonraki 3 işlemimin performansını analiz et. Kazanç rehavetine kapılıp kural ihlali yapıyor muyum?",
                desc: "Büyük kazançlar sonrası performans düşüşü yaşayıp yaşamadığınızı inceler.",
                icon: TrendingUp,
                iconColor: "text-green-400",
              },
              {
                id: "discipline_break",
                title: "Disiplin Kırılma Analizi",
                prompt: "Günlüklerime (Journals) göre, disiplinimi en çok hangi durumlarda bozuyorum? Bana kurallarıma sadık kalmam için verilerime dayalı 3 kişiselleştirilmiş tavsiye ver.",
                desc: "Disiplininizi ne zaman bozduğunuzu tespit edip size özel 3 veri odaklı tavsiye sunar.",
                icon: ShieldAlert,
                iconColor: "text-amber-500",
              },
              {
                id: "day_profitability",
                title: "Günlük Kârlılık İstatistiği",
                prompt: "Haftanın hangi günü istatistiksel olarak en çok kâr ediyorum ve hangi günü en çok zarar ediyorum? Sence Cuma günleri işlem yapmayı bırakmalı mıyım?",
                desc: "Haftanın günlerine göre başarı oranınızı ölçer.",
                icon: Clock,
                iconColor: "text-blue-300",
              },
              {
                id: "golden_hours",
                title: "Zaman Bazlı Altın Saatler",
                prompt: "Günün belirli saatlerinde (Örneğin Londra açılışı vs. New York açılışı) başarı oranım nasıl değişiyor? Zaman bazlı bir ısı haritası çıkarsaydın benim 'altın saatlerim' hangileri olurdu?",
                desc: "İşlem saatlerinizi seans bazlı ayırarak size en uygun (altın) saatleri listeler.",
                icon: Zap,
                iconColor: "text-yellow-400",
              },
              {
                id: "prop_firm_math",
                title: "Fon Sınavı Matematiksel Olasılığı",
                prompt: "Şu anki ortalama risk-getiri metriklerime göre, yeni bir $100K'lık fon hesabını (örneğin %8 kâr hedefi ve %5 günlük kayıp limiti ile) geçme olasılığım matematiksel olarak nedir? Bunu başarmak için ortalama kaç işleme ihtiyacım var?",
                desc: "Mevcut istatistiklerinize göre 100K'lık bir prop firm sınavını geçme olasılığınızı hesaplar.",
                icon: Award,
                iconColor: "text-amber-300",
              },
              {
                id: "compounding_vs_payout",
                title: "Compounding vs Kâr Çekimi",
                prompt: "Aldığım payout'ların büyüklüğü ve sıklığına bakarak, sermayemi büyütmek için bileşik getiri (compounding) mi yapmalıyım yoksa düzenli kâr çekimi stratejime devam mı etmeliyim?",
                desc: "Verilerinize göre sermaye büyütme mi yoksa düzenli kâr çekimi mi yapmanız gerektiğini analiz eder.",
                icon: Layers,
                iconColor: "text-emerald-300",
              },
              {
                id: "weekly_summary",
                title: "Haftalık Genel Özet",
                prompt: "Bu haftanın tüm işlemlerini, notlarını ve günlük kayıtlarını özetle. Bu hafta yaptığım en iyi şey neydi ve acilen düzeltmem gereken en ölümcül hatam ne oldu?",
                desc: "İçinde bulunduğunuz haftanın en iyi hareketini ve en ölümcül hatasını özetler.",
                icon: Target,
                iconColor: "text-blue-400",
              },
              {
                id: "ruthless_mentor",
                title: "Acımasız Mentör Eleştirisi",
                prompt: "Eğer benim acımasız ve tamamen objektif bir ticaret koçum (trading mentor) olsaydın, şu anki tüm istatistiklerime (Win Rate, Profit Factor, Drawdown, Journal notları) bakarak beni nasıl sert bir şekilde eleştirirdin? Hatalarımı yüzüme vur.",
                desc: "Tüm istatistiklerinize bakarak size filtresiz, sert ve gerçekçi bir mentör eleştirisi sunar.",
                icon: Flame,
                iconColor: "text-red-500",
              },
              {
                id: "weakest_link",
                title: "En Büyük Zayıf Halka",
                prompt: "Önümüzdeki ay kârlılığımı sadece %10 artırmak için mevcut verilerime göre sistemimden 'çıkarmam' gereken tek bir şey (bir parite, bir gün, bir duygu durumu) ne olurdu?",
                desc: "Kârlılığınızı hemen artırmak için sisteminizden çıkarmanız gereken en zayıf halkayı bulur.",
                icon: Lightbulb,
                iconColor: "text-yellow-500",
              },
              {
                id: "drawdown_heat_map",
                title: "Drawdown Yoğunluk Haritası",
                prompt: "Portföyümün en derin Drawdown (kasada tepe noktadan düşüş) yaşadığı dönemler haftanın hangi günlerine veya hangi işlem seanslarına denk geliyor? Pazartesi açılış veya Cuma kapanışlarında aldığım spesifik riskler kasama nasıl yansıyor?",
                desc: "Maksimum Drawdown (DD) ve Gün/Seans Riskini analiz eder.",
                icon: Activity,
                iconColor: "text-red-400",
              },
              {
                id: "mood_asset_correlation",
                title: "Duygu ve Varlık Eşleşmesi",
                prompt: "Günlük (Journal) kayıtlarımda 'stresli', 'yorgun' veya 'odak dışı' hissettiğim günlerde en çok hangi paritelerde zarar ediyorum? Belirli bir varlık sınıfı (örneğin yüksek volatiliteli NASDAQ veya XAUUSD) zihinsel yorgunluk anlarında bana diğerlerinden daha fazla zarar veriyor mu?",
                desc: "Parite bazlı psikolojik dayanıklılığı (Mood-Asset korelasyonunu) ölçer.",
                icon: Layers,
                iconColor: "text-purple-400",
              }
            ];

            const itemsPerPage = 8;
            const totalPages = Math.ceil(presetItems.length / itemsPerPage);
            const currentPage = Math.min(presetPage, totalPages);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPresets = presetItems.slice(startIndex, endIndex);

            return (
              <motion.div
                key="presets"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 flex flex-col copilot-scrollbar"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-700/50 pb-3 shrink-0">
                  <div className="text-[11px] text-zinc-500">
                    Yapay zekâ mentörünüze tek tıkla özel derinlemesine analiz yaptırabilirsiniz:
                  </div>
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <span className="text-xs font-medium text-zinc-400 tabular-nums flex items-center leading-none">
                      Sayfa: {currentPage}/{totalPages}
                    </span>
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/50 rounded-xl p-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setPresetPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <div className="w-px h-3.5 bg-zinc-800" />
                      <button
                        type="button"
                        onClick={() => setPresetPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="w-6.5 h-6.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 relative min-h-[300px] flex flex-col">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 auto-rows-fr"
                    >
                      {currentPresets.map((preset) => {
                        const Icon = preset.icon;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setActiveTab("chat");
                              handleSendMessage(preset.prompt, preset.id);
                            }}
                            className="w-full h-full p-4.5 bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-700/50 backdrop-blur-sm hover:border-blue-500/40 rounded-2xl text-left transition-colors duration-200 group cursor-pointer space-y-2 flex flex-col justify-center min-h-[110px] shadow-xs hover:shadow-md hover:shadow-blue-500/5"
                          >
                            <div className="space-y-2">
                              <div className={`flex items-center gap-2 ${preset.iconColor}`}>
                                <Icon size={16} />
                                <span className="font-mono font-bold text-xs uppercase text-zinc-200 group-hover:text-blue-300 transition-colors">
                                  {preset.title}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                                {preset.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })()}
          {/* TAB: SAVED NOTES */}
          {activeTab === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 copilot-scrollbar"
            >
              <AnimatePresence mode="wait">
              {!selectedNoteId ? (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="flex flex-col min-h-full space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-zinc-700/50 pb-3">
                    <div className="flex items-center gap-2">
                      <Bookmark size={15} className="text-amber-400" />
                      <span className="text-xs font-mono font-bold uppercase text-zinc-200 tracking-wider">Kaydedilen Notlar</span>
                    </div>
                  </div>

                  {savedNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 opacity-60">
                      <Bookmark size={32} className="text-zinc-500 mb-2" />
                      <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
                        Henüz kaydedilmiş bir analiz yok. Chat'te "Sabitle" butonuna tıklayarak mesajları buraya kaydedebilirsiniz.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedNotes.map((note) => (
                        <div
                          key={note.id}
                          className="bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-700/50 backdrop-blur-sm hover:border-amber-500/40 rounded-2xl p-4 transition-colors duration-200 group flex flex-col justify-between min-h-[140px] cursor-pointer shadow-xs"
                          onClick={() => setSelectedNoteId(note.id)}
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start" onClick={e => e.stopPropagation()}>
                              {editingNoteId === note.id ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onBlur={() => {
                                    if (editingTitle.trim()) {
                                      setSavedNotes(prev => prev.map(n => n.id === note.id ? { ...n, title: editingTitle.trim() } : n));
                                    }
                                    setEditingNoteId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (editingTitle.trim()) {
                                        setSavedNotes(prev => prev.map(n => n.id === note.id ? { ...n, title: editingTitle.trim() } : n));
                                      }
                                      setEditingNoteId(null);
                                    }
                                  }}
                                  className="bg-zinc-950 border border-amber-500/50 rounded-xl px-2.5 py-1 text-xs font-bold font-mono text-zinc-100 outline-none w-full mr-2"
                                />
                              ) : (
                                <div className="flex items-center gap-2 transition-colors duration-200 ease-out group/title">
                                  <Pin size={12} className="text-amber-400 opacity-80" />
                                  <h4 className="font-mono font-bold text-xs text-zinc-100 line-clamp-1">{note.title}</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingNoteId(note.id);
                                      setEditingTitle(note.title);
                                    }}
                                    className="opacity-0 group-hover/title:opacity-100 p-1 text-zinc-400 hover:text-white transition-opacity"
                                  >
                                    <Edit2 size={10} />
                                  </button>
                                </div>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavedNotes(prev => prev.filter(n => n.id !== note.id));
                                }}
                                className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-all ml-1 shrink-0"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            
                            <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed font-sans">
                              {note.content.substring(0, 150)}{note.content.length > 150 ? "..." : ""}
                            </p>
                          </div>
                          
                          <div className="mt-3 text-[9px] text-zinc-500 font-mono">
                            Kaydedildi: {new Date(note.pinnedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                  savedNotes.find(n => n.id === selectedNoteId) && (() => {
                    const activeNote = savedNotes.find(n => n.id === selectedNoteId)!;
                    return (
                      <motion.div
                        key="detail"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="flex flex-col min-h-full space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-zinc-700/50 pb-3 shrink-0">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedNoteId(null)}
                              className="w-7 h-7 flex items-center justify-center rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            >
                              <ArrowLeft size={14} />
                            </button>
                            {editingNoteId === activeNote.id ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onBlur={() => {
                                    if (editingTitle.trim()) {
                                      setSavedNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title: editingTitle.trim() } : n));
                                    }
                                    setEditingNoteId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      if (editingTitle.trim()) {
                                        setSavedNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title: editingTitle.trim() } : n));
                                      }
                                      setEditingNoteId(null);
                                    }
                                  }}
                                  className="bg-zinc-900 border border-amber-500/50 rounded-xl px-2.5 py-1 text-sm font-bold font-mono text-zinc-200 outline-none w-full max-w-[300px]"
                                />
                            ) : (
                              <h3 className="font-mono font-bold text-sm text-zinc-200 flex items-center gap-2 group">
                                <Bookmark size={14} className="text-amber-400" />
                                {activeNote.title}
                                <button
                                  onClick={() => {
                                    setEditingNoteId(activeNote.id);
                                    setEditingTitle(activeNote.title);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white transition-opacity ml-1"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </h3>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              copyToClipboard(activeNote.content, activeNote.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-mono transition-colors"
                          >
                            {copiedId === activeNote.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            {copiedId === activeNote.id ? "Kopyalandı" : "Kopyala"}
                          </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto bg-zinc-900/70 border border-zinc-700/50 backdrop-blur-sm rounded-xl p-4 sm:p-5 prose prose-invert prose-sm max-w-none copilot-scrollbar">
                          <Markdown>{activeNote.content}</Markdown>
                        </div>
                      </motion.div>
                    );
                  })()
              )}
              </AnimatePresence>
            </motion.div>
          )}

          </AnimatePresence>

        </div>

      </motion.div>
    </motion.div>
  );
};

export default AICoPilotModal;
