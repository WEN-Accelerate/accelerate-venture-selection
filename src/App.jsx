import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Target,
  TrendingUp,
  Globe,
  Briefcase,
  Cpu,
  Award,
  PieChart,
  ShieldCheck,
  Users,
  FileText,
  Settings,
  DollarSign,
  Loader2,
  Info,
  BarChart3,
  PlusCircle,
  Sparkles,
  X,
  Copy,
  MessageSquare,
  AlertTriangle,
  Newspaper,
  Wand2,
  ListTodo,
  LogOut,
  Download
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';

// --- FIREBASE SETUP ---
// Initialize Firebase using the global config injected by the environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- SUPABASE SETUP ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);


// --- DATA MODELS & CONSTANTS ---

const BRAND_COLORS = {
  red: 'bg-[#D32F2F]', // Wadhwani Red Anchor
  orange: 'bg-[#F57C00]', // Sunrise Orange
  yellow: 'bg-[#FBC02D]', // Positive Yellow
  textDark: 'text-gray-900',
  textLight: 'text-gray-600',
  bgLight: 'bg-gray-50',
};

const ARCHETYPES = [
  { id: 1, name: "Export Market Entry – Direct", icon: Globe, description: "Setting up direct sales channels in international markets." },
  { id: 2, name: "Export Market Entry – Digital", icon: Cpu, description: "Leveraging e-commerce and digital platforms for cross-border trade." },
  { id: 3, name: "Domestic Geographic Expansion", icon: TrendingUp, description: "Scaling operations to new regions within the home country." },
  { id: 4, name: "New Customer Segment Entry", icon: Users, description: "Targeting a distinct demographic or B2B vertical with existing products." },
  { id: 5, name: "New Product Introduction", icon: Package, description: "Launching entirely new offerings to existing or new markets." },
  { id: 6, name: "Product Upgrade / Premiumisation", icon: Award, description: "Moving up the value chain with higher-margin, premium offerings." },
  { id: 7, name: "Institutional Buyer Entry", icon: Briefcase, description: "Structuring the business to sell to large enterprises or government bodies." }
];

// Helper for icon fallback
function Package(props) { return <Target {...props} /> }

const STREAMS = [
  {
    id: 1,
    name: "Market Selection",
    objective: "Identify and prioritize high-potential target markets.",
    deliverables: "Market Scoring Model, Priority List",
    postSprint: "Market Entry Plan"
  },
  {
    id: 2,
    name: "Demand Validation",
    objective: "Confirm customer willingness to pay before scaling.",
    deliverables: "Customer Interviews, MVP Feedback",
    postSprint: "Validated Sales Pipeline"
  },
  {
    id: 3,
    name: "Value Proposition",
    objective: "Articulate unique benefits that resonate with the target segment.",
    deliverables: "Value Prop Canvas, Pitch Deck",
    postSprint: "Brand Messaging Guide"
  },
  {
    id: 4,
    name: "Offer Definition",
    objective: "Package the product/service for the specific market context.",
    deliverables: "Product Spec Sheet, Service Level Agreement",
    postSprint: "Product Roadmap"
  },
  {
    id: 5,
    name: "Pricing and Unit Economics",
    objective: "Ensure profitability at the unit level.",
    deliverables: "Pricing Model, Contribution Margin Analysis",
    postSprint: "Dynamic Pricing Strategy"
  },
  {
    id: 6,
    name: "Regulatory Compliance",
    objective: "Meet all legal standards for the new growth area.",
    deliverables: "Compliance Checklist, License Applications",
    postSprint: "Audit Framework"
  },
  {
    id: 7,
    name: "Quality and Certification",
    objective: "Adhere to industry standards and quality benchmarks.",
    deliverables: "QA Process Map, Certification Roadmap",
    postSprint: "ISO/Industry Certification"
  },
  {
    id: 8,
    name: "Channel Setup",
    objective: "Establish the pathways to reach customers.",
    deliverables: "Channel Partner List, Distribution Agreement",
    postSprint: "Partner Portal / Network"
  },
  {
    id: 9,
    name: "Sales Execution",
    objective: "Convert leads into paying customers systematically.",
    deliverables: "Sales Script, CRM Setup",
    postSprint: "Sales Playbook"
  },
  {
    id: 10,
    name: "Digital Sales Channels",
    objective: "Optimize online presence for conversion.",
    deliverables: "Landing Page, SEO Audit",
    postSprint: "E-commerce Optimization"
  },
  {
    id: 11,
    name: "Operations Readiness",
    objective: "Scale delivery capabilities to meet new demand.",
    deliverables: "Capacity Plan, Supply Chain Map",
    postSprint: "SOPs for Scale"
  },
  {
    id: 12,
    name: "Internal Business Systems",
    objective: "Ensure IT and data systems support growth.",
    deliverables: "Tech Stack Audit, Dashboard Setup",
    postSprint: "ERP/MIS Integration"
  },
  {
    id: 13,
    name: "Working Capital and Finance",
    objective: "Secure the cash flow required for expansion.",
    deliverables: "Cash Flow Forecast, Funding Needs",
    postSprint: "Fundraising / Credit Line"
  },
  {
    id: 14,
    name: "Institutional Procurement",
    objective: "Navigate complex buying cycles of large entities.",
    deliverables: "Vendor Registration, Tender Response Template",
    postSprint: "Key Account Management System"
  },
  {
    id: 15,
    name: "Governance and Execution Cadence",
    objective: "Maintain momentum through disciplined reviews.",
    deliverables: "Sprint Rhythm, KPI Dashboard",
    postSprint: "Quarterly Business Review Structure"
  }
];

// --- GEMINI API HELPER ---

const callGemini = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // Read from environment variables
  const model = "gemini-2.5-flash-preview-09-2025";

  if (!apiKey) {
    console.warn("API Key is missing (simulated environment).");
    return "AI simulation: Gemini would generate a response here based on your inputs. (API Key required for live generation)";
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API request failed');

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I couldn't reach the AI service right now. Please try again.";
  }
};

// --- GENERATIVE LOGIC ENGINE (Internal Templates) ---

const generateArchetypeSuggestion = (business) => {
  // Logic to suggest archetypes based on inputs (Simulated AI)
  if (business.markets === 'International' || business.revenue > '5M') {
    return [1, 2, 7]; // Export or Institutional for larger/global focus
  } else if (business.industry === 'Manufacturing') {
    return [3, 5, 6]; // Expansion, New Product, Upgrade
  } else {
    return [3, 4, 5]; // Generic growth for smaller SMEs
  }
};

const generateStreamQuestion = (streamId, archetypeId, business) => {
  const stream = STREAMS.find(s => s.id === streamId);
  const archetype = ARCHETYPES.find(a => a.id === archetypeId);
  const ind = business.industry || "business";

  const templates = {
    1: `Do you have a data-backed method to pick the best ${archetype.name.includes("Export") ? "countries" : "regions"}?`,
    2: `Have paying customers confirmed they want this specific ${archetype.name} offer?`,
    3: `Is it crystal clear why customers should choose you over competitors?`,
    4: `Is your product fully packaged and defined for this specific market?`,
    5: `Is this initiative profitable at the unit level?`,
    6: `Have you cleared all legal and regulatory hurdles for this path?`,
    7: `Does your quality meet the specific standards required here?`,
    8: `Are your distributors or partners ready to start selling?`,
    9: `Is your sales team trained with the right scripts for this?`,
    10: `Is your website ready to capture leads for this specific offer?`,
    11: `Can your operations handle a 3x spike in demand without breaking?`,
    12: `Do you have real-time visibility into this project's performance?`,
    13: `Do you have the specific funds set aside for this expansion?`,
    14: `Are you fully registered to bid on relevant tenders?`,
    15: `Do you review this project's progress every single week?`
  };

  return templates[streamId] || `Is your ${ind} business fully ready for ${stream.name}?`;
};

// --- COMPONENTS ---

const LoginScreen = ({ onLogin, loading }) => (
  <div className="min-h-screen bg-white flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
    {/* Background Decorations */}
    <div className={`absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full ${BRAND_COLORS.orange} opacity-10 blur-3xl`}></div>
    <div className={`absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full ${BRAND_COLORS.red} opacity-10 blur-3xl`}></div>

    <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 p-8 relative z-10">
      <div className="flex justify-center mb-6">
        <img
          src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
          alt="Wadhwani Foundation"
          className="h-16 w-auto object-contain"
        />
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 font-barlow">Wadhwani Accelerate</h1>
        <p className="text-gray-600 text-sm">AI-Powered Growth Diagnostic for SMEs</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin mb-2" />
            <span className="text-sm text-gray-500">Signing in...</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => onLogin('google')}
              className="w-full py-3.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">Or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              onClick={() => onLogin('guest')}
              className={`w-full py-3.5 px-4 ${BRAND_COLORS.red} text-white hover:opacity-90 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-red-200`}
            >
              Continue as Guest <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>

      <p className="mt-8 text-center text-[10px] text-gray-400 leading-tight">
        By continuing, you agree to the Terms of Service and Privacy Policy of the Wadhwani Foundation.
      </p>
    </div>
  </div>
);

const Header = ({ step, progress, user, onLogout }) => (
  <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
    <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="https://wadhwanifoundation.org/wp-content/uploads/2023/10/Wadhwani-Foundation-Logo.png"
          alt="Wadhwani Foundation"
          className="h-10 w-auto object-contain"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-gray-500">Step {step}/5</span>
          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${BRAND_COLORS.red}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {user && (
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  </header>
);

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "w-full py-3.5 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: `${BRAND_COLORS.red} text-white hover:bg-red-800 shadow-md shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed`,
    secondary: "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400",
    outline: `bg-transparent border border-red-600 text-red-700 hover:bg-red-50`
  };

  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const AIModal = ({ isOpen, onClose, title, content, isLoading, onCopy }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-2 text-indigo-700">
            <Sparkles size={18} />
            <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-[150px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-gray-500 animate-pulse">Generating insights...</p>
            </div>
          ) : (
            <div className="prose prose-sm prose-indigo max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {content}
            </div>
          )}
        </div>
        {!isLoading && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Close</button>
            {onCopy && (
              <button onClick={onCopy} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-sm">
                <Copy size={14} /> Copy to Clipboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showAllArchetypes, setShowAllArchetypes] = useState(false);

  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginInProgress, setLoginInProgress] = useState(false);

  // AI States
  const [aiModal, setAiModal] = useState({ open: false, title: '', content: '', loading: false });
  const [aiQuestionHelp, setAiQuestionHelp] = useState(null); // Stores object { why, example } or null
  const [aiQuestionLoading, setAiQuestionLoading] = useState(false);
  const [aiArchetypeReasoning, setAiArchetypeReasoning] = useState({}); // Stores customized descriptions
  const [aiStreamQuestions, setAiStreamQuestions] = useState({}); // Stores customized stream questions

  // State: Business Snapshot
  const [businessData, setBusinessData] = useState({
    name: '',
    industry: '',
    revenue: '',
    employees: '',
    description: '',
    expansionIdeas: ''
  });

  // State: Selection
  const [suggestedArchetypes, setSuggestedArchetypes] = useState([]);
  const [selectedArchetype, setSelectedArchetype] = useState(null);

  // State: Readiness
  const [readinessAnswers, setReadinessAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // --- PROFILE SYNC ---
  useEffect(() => {
    if (user && !authLoading) {
      const checkProfile = async () => {
        try {
          // Fetch profile for the current user
          const { data, error } = await supabase
            .from('profiles')
            .select('details')
            .eq('user_id', user.uid)
            .maybeSingle();

          if (data && data.details) {
            // Profile found, pre-fill App state
            setBusinessData(prev => ({
              ...prev,
              name: data.details.companyName || prev.name,
              industry: data.details.industry || prev.industry,
              revenue: data.details.revenue || prev.revenue,
              employees: data.details.employees || prev.employees,
              description: data.details.products ? `${data.details.products}. Target: ${data.details.customers}` : prev.description,
              expansionIdeas: data.details.ventureType ? `Expand to ${data.details.ventureType} markets` : prev.expansionIdeas
            }));
          } else {
            // No profile found, redirect to wizard
            // Check if we are just starting (step 1)
            if (step === 1 && !window.location.search.includes('skip')) {
              window.location.href = '/profile.html';
            }
          }
        } catch (err) {
          console.warn("Profile sync error:", err);
        }
      };

      checkProfile();
    }
  }, [user, authLoading, step]);

  // --- AUTH HANDLERS ---

  useEffect(() => {
    // 1. Check for custom token injected by environment (SSO support)
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (error) {
          console.error("Custom token auth failed:", error);
        }
      }
      setAuthLoading(false);
    };

    initAuth();

    // 2. Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (method) => {
    setLoginInProgress(true);

    // Check if we are running with the dummy local key
    // If so, bypass Firebase Auth because it will fail (Error: auth/api-key-not-valid)
    const isLocalDemo = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'DummyKeyForLocalDev';

    if (isLocalDemo) {
      console.warn("Using Dummy/Demo Login (No valid Firebase API Key found)");
      setTimeout(() => {
        setUser({
          uid: 'demo-guest-' + Date.now(),
          isAnonymous: true,
          displayName: 'Demo User'
        });
        setLoginInProgress(false);
      }, 800);
      return;
    }

    try {
      if (method === 'google') {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } else {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please try again.");
    } finally {
      setLoginInProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      restart(); // Reset app state on logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // --- LOGIC HANDLERS ---

  const handleAI_ExpansionBrainstorm = async () => {
    if (!businessData.industry || !businessData.description) {
      alert("Please enter industry and business description first.");
      return;
    }
    setAiModal({ open: true, title: 'AI Growth Brainstorm', content: '', loading: true });

    const prompt = `Act as a senior growth consultant for a ${businessData.industry} company generating ${businessData.revenue} annual revenue. 
    They do: "${businessData.description}". 
    Suggest 3 specific, actionable expansion ideas (1-2 sentences each) that align with standard growth strategies. 
    Format as a bulleted list. Be concise and high-impact.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: 'AI Growth Brainstorm', content: result, loading: false });
  };

  const handleAI_FutureHeadline = async (archetypeId, e) => {
    e.stopPropagation(); // Prevent card selection
    const archetype = ARCHETYPES.find(a => a.id === archetypeId);
    setAiModal({ open: true, title: 'Future Success Visualization', content: '', loading: true });

    const prompt = `Write a fake business news headline and opening paragraph from 2 years in the future about a ${businessData.industry} company named "${businessData.name}" successfully executing the "${archetype.name}" strategy. 
    Make it bold, specific, and inspiring. Mention a realistic metric they achieved.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: 'Future Success Visualization', content: result, loading: false });
  };

  const handleAI_QuestionHelp = async (streamId, archetypeId) => {
    const stream = STREAMS.find(s => s.id === streamId);
    const archetype = ARCHETYPES.find(a => a.id === archetypeId);

    // Use generated question if available, else template
    const question = aiStreamQuestions[streamId] || generateStreamQuestion(streamId, archetypeId, businessData);

    setAiQuestionLoading(true);
    setAiQuestionHelp(null);

    const prompt = `
      Context:
      Business: ${businessData.industry} (${businessData.employees} employees)
      Growth Path: ${archetype.name}
      Stream: ${stream.name}
      Question: ${question}

      Task:
      Provide a structured insight to help the user understand the importance of this question.
      1. "why": A simple, direct explanation (max 2 sentences) of why this is critical for their specific industry context.
      2. "example": A concrete, "Gold Standard" example of what being fully ready looks like (e.g., "A signed contract with...", "A dashboard showing...").

      Return strictly a JSON object:
      {
        "why": "string",
        "example": "string"
      }
      Do not include markdown formatting or code blocks. Just the raw JSON.
    `;

    try {
      const result = await callGemini(prompt);

      if (result.includes("AI simulation")) {
        // Mock structured response for simulation
        setAiQuestionHelp({
          why: "AI Simulation: This step is critical to ensure you don't overspend before validating demand.",
          example: "AI Simulation: A signed Letter of Intent from 3 major distributors."
        });
      } else {
        const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedHelp = JSON.parse(cleanedResult);
        setAiQuestionHelp(parsedHelp);
      }
    } catch (e) {
      console.error("Failed to generate help", e);
      setAiQuestionHelp({
        why: "This step ensures you have the right foundation before scaling.",
        example: "A documented plan approved by leadership."
      });
    }

    setAiQuestionLoading(false);
  };

  const handleAI_RiskRadar = async () => {
    const archetype = ARCHETYPES.find(a => a.id === selectedArchetype);
    setAiModal({ open: true, title: 'Hidden Risk Radar', content: '', loading: true });

    const prompt = `Act as a "Devil's Advocate" consultant. 
    For a ${businessData.industry} company attempting "${archetype.name}", what are the top 3 hidden risks or common failure points they often ignore?
    Provide them as a bulleted list with a one-sentence mitigation strategy for each.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: 'Hidden Risk Radar', content: result, loading: false });
  };

  const handleAI_DraftEmail = async (weakStreams) => {
    const archetype = ARCHETYPES.find(a => a.id === selectedArchetype);
    setAiModal({ open: true, title: 'Founder Kickoff Email', content: '', loading: true });

    const prompt = `Draft a short, inspiring kickoff email from the Founder to the team. 
    We are starting a growth sprint for "${archetype.name}". 
    Our key priority areas to improve are: ${weakStreams.map(s => s.name).join(', ')}. 
    
    Tone: Optimistic, urgent, and leadership-oriented. 
    Structure: 
    1. The Goal 
    2. The Why 
    3. The Immediate Focus.
    Keep it under 150 words.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: 'Founder Kickoff Email', content: result, loading: false });
  };

  const handleAI_RefinePitch = async () => {
    if (!businessData.description) return;
    setAiModal({ open: true, title: 'Professional Value Proposition', content: '', loading: true });

    const prompt = `Rewrite the following business description into a powerful, investor-ready value proposition (1-2 sentences). 
    Original: "${businessData.description}"
    Industry: ${businessData.industry}.
    Focus on clarity, authority, and impact.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: 'Professional Value Proposition', content: result, loading: false });
  };

  const handleAI_GenerateOKRs = async (streamId) => {
    const stream = STREAMS.find(s => s.id === streamId);
    setAiModal({ open: true, title: `90-Day OKRs: ${stream.name}`, content: '', loading: true });

    const prompt = `Generate a 90-day Objective and Key Results (OKR) set for a ${businessData.industry} company focusing on "${stream.name}".
    Company Size: ${businessData.employees} employees.
    Objective: One inspiring, qualitative goal.
    Key Results: 3 specific, measurable metrics to track progress.
    Format clearly.`;

    const result = await callGemini(prompt);
    setAiModal({ open: true, title: `90-Day OKRs: ${stream.name}`, content: result, loading: false });
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const handleSnapshotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const prompt = `
      Context:
      Business Name: ${businessData.name}
      Industry: ${businessData.industry}
      Description: ${businessData.description}
      Expansion Ideas (Goals): ${businessData.expansionIdeas}

      Standard Growth Archetypes List:
      ${JSON.stringify(ARCHETYPES.map(a => ({ id: a.id, name: a.name, desc: a.description })))}

      Task:
      1. Analyze the business context and their specific expansion ideas.
      2. Select the top 3 most relevant archetypes from the list.
      3. For each selected archetype, write a specific 1-2 sentence explanation ("reasoning") of why it fits this company's goals and ideas perfectly. 
         Use "Because you want to [reference idea]..." style phrasing.
      4. Return strictly valid JSON array of objects: [{ "id": number, "reasoning": "string" }].
      Do not include markdown formatting or code blocks. Just the raw JSON.
    `;

    try {
      // Try to get AI response
      const result = await callGemini(prompt);

      // Check for simulation message
      if (result.includes("AI simulation")) {
        throw new Error("Simulation Mode");
      }

      // Attempt to parse JSON response. 
      const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiSuggestions = JSON.parse(cleanedResult);

      if (Array.isArray(aiSuggestions) && aiSuggestions.length > 0) {
        const suggestionIds = aiSuggestions.map(s => s.id);
        const reasoningMap = {};
        aiSuggestions.forEach(s => {
          reasoningMap[s.id] = s.reasoning;
        });

        setSuggestedArchetypes(suggestionIds);
        setAiArchetypeReasoning(reasoningMap);
        setStep(2);
        setLoading(false);
        return;
      }
    } catch (error) {
      if (error.message !== "Simulation Mode") {
        console.error("AI Selection failed, falling back to simulated logic", error);
      }
    }

    // Fallback if API fails or returns invalid data
    setTimeout(() => {
      const suggestions = generateArchetypeSuggestion(businessData);
      setSuggestedArchetypes(suggestions);
      setStep(2);
      setLoading(false);
    }, 1200);
  };

  const handleArchetypeSelect = async (id) => {
    setSelectedArchetype(id);
    setLoading(true);

    const archetype = ARCHETYPES.find(a => a.id === id);

    // Prompt to generate contextual questions for all 15 streams
    const prompt = `
      Context:
      Business: ${businessData.name} (${businessData.industry})
      Description: ${businessData.description}
      Selected Growth Path: ${archetype.name} - ${archetype.description}

      Task:
      For each of the 15 standard growth streams, generate a VERY SIMPLE, DIRECT "Readiness Question" (Yes/No style).
      - Max 15 words per question.
      - No jargon.
      - Focus on immediate actionability.
      - Reference the industry if it keeps it short.

      Streams IDs and Names:
      ${STREAMS.map(s => `${s.id}: ${s.name}`).join('\n')}
      
      Return strictly a JSON object where keys are stream IDs (as strings "1" through "15") and values are the generated question strings.
      Example: { "1": "Do you have data proving demand in the target region?", "2": "..." }
      Do not include markdown formatting or code blocks. Just the raw JSON.
    `;

    try {
      const result = await callGemini(prompt);

      if (result.includes("AI simulation")) {
        throw new Error("Simulation Mode");
      }

      const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedQuestions = JSON.parse(cleanedResult);

      if (generatedQuestions && typeof generatedQuestions === 'object') {
        setAiStreamQuestions(generatedQuestions);
      }
    } catch (e) {
      if (e.message !== "Simulation Mode") {
        console.error("Failed to generate stream questions, using templates", e);
      }
    }

    setStep(3);
    setLoading(false);
  };

  const handleReadinessAnswer = (status) => {
    const streamId = STREAMS[currentQuestionIndex].id;
    setReadinessAnswers(prev => ({ ...prev, [streamId]: status }));
    setAiQuestionHelp(null); // Reset AI help for next Q

    if (currentQuestionIndex < STREAMS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setLoading(true);
      setTimeout(() => {
        setStep(4);
        setLoading(false);
      }, 1000);
    }
  };

  const handleCommitmentSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setStep(5);
      setLoading(false);
    }, 1500);
  };

  const restart = () => {
    setStep(1);
    setBusinessData({ name: '', industry: '', revenue: '', employees: '', description: '', expansionIdeas: '' });
    setSelectedArchetype(null);
    setReadinessAnswers({});
    setCurrentQuestionIndex(0);
    setShowAllArchetypes(false);
    setAiQuestionHelp(null);
    setAiArchetypeReasoning({});
    setAiStreamQuestions({});
  };

  // --- VIEWS ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className={`w-12 h-12 ${BRAND_COLORS.textDark} animate-spin mb-4`} />
        <p className="text-gray-500 mt-2">Loading Wadhwani Accelerate...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} loading={loginInProgress} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className={`w-12 h-12 ${BRAND_COLORS.textDark} animate-spin mb-4`} />
        <h3 className="text-xl font-bold text-gray-800">Analyzing your Growth DNA...</h3>
        <p className="text-gray-500 mt-2">Connecting with Wadhwani Accelerate Intelligence</p>
      </div>
    );
  }

  return (
    <>
      <AIModal
        isOpen={aiModal.open}
        onClose={() => setAiModal({ ...aiModal, open: false })}
        title={aiModal.title}
        content={aiModal.content}
        isLoading={aiModal.loading}
        onCopy={() => copyToClipboard(aiModal.content)}
      />

      {/* STEP 1: BUSINESS SNAPSHOT */}
      {step === 1 && (
        <div className={`min-h-screen ${BRAND_COLORS.bgLight} font-sans`}>
          <Header step={1} progress={20} user={user} onLogout={handleLogout} />
          <main className="max-w-md mx-auto p-4 pb-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Business Snapshot</h1>
              <p className="text-gray-600 text-sm">Let's build your growth profile. This helps us customize your sprint plan.</p>
            </div>

            <form onSubmit={handleSnapshotSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  required
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                  placeholder="e.g. Acme Innovations"
                  value={businessData.name}
                  onChange={e => setBusinessData({ ...businessData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry Sector</label>
                <select
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600 outline-none"
                  value={businessData.industry}
                  onChange={e => setBusinessData({ ...businessData, industry: e.target.value })}
                >
                  <option value="">Select Industry</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="SaaS / IT Services">SaaS / IT Services</option>
                  <option value="Consumer Goods (CPG)">Consumer Goods (CPG)</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Professional Services">Professional Services</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Revenue</label>
                  <select
                    required
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                    value={businessData.revenue}
                    onChange={e => setBusinessData({ ...businessData, revenue: e.target.value })}
                  >
                    <option value="">Select Range</option>
                    <option value="<1M">&lt; $1M / ₹8Cr</option>
                    <option value="1M-5M">$1M - $5M</option>
                    <option value="5M-20M">$5M - $20M</option>
                    <option value=">20M">&gt; $20M</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employees</label>
                  <input
                    type="number"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="Count"
                    value={businessData.employees}
                    onChange={e => setBusinessData({ ...businessData, employees: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">What do you do? (One sentence)</label>
                  <button
                    type="button"
                    onClick={handleAI_RefinePitch}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-full transition-colors"
                  >
                    <Wand2 size={12} /> Polish with AI
                  </button>
                </div>
                <textarea
                  required
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                  placeholder="e.g. We manufacture precision auto components for domestic OEMs."
                  value={businessData.description}
                  onChange={e => setBusinessData({ ...businessData, description: e.target.value })}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Planned Expansion Ideas</label>
                  <button
                    type="button"
                    onClick={handleAI_ExpansionBrainstorm}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-full transition-colors"
                  >
                    <Sparkles size={12} /> Spark Ideas
                  </button>
                </div>
                <textarea
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 outline-none"
                  placeholder="e.g. Exploring export to Middle East or launching a new EV component line."
                  value={businessData.expansionIdeas}
                  onChange={e => setBusinessData({ ...businessData, expansionIdeas: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <Button type="submit">
                  Select Your Growth Journey <ArrowRight size={20} />
                </Button>
              </div>
            </form>
          </main>
        </div>
      )}

      {/* STEP 2: ARCHETYPE SELECTION */}
      {step === 2 && (
        <div className={`min-h-screen ${BRAND_COLORS.bgLight} font-sans`}>
          <Header step={2} progress={40} user={user} onLogout={handleLogout} />
          <main className="max-w-md mx-auto p-4 pb-20">
            <div className="mb-4">
              <h1 className="text-xl font-bold text-gray-900">Recommended Growth Paths</h1>
              <p className="text-gray-600 text-sm mt-1">Based on your profile, we've identified the high-impact archetypes for {businessData.name}.</p>
            </div>

            <div className="space-y-4">
              {suggestedArchetypes.map((id) => {
                const archetype = ARCHETYPES.find(a => a.id === id);
                const Icon = archetype.icon;

                // --- CUSTOM AI REASONING RENDER ---
                const customDescription = aiArchetypeReasoning[id];

                return (
                  <div
                    key={id}
                    onClick={() => handleArchetypeSelect(id)}
                    className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${BRAND_COLORS.orange}`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${BRAND_COLORS.bgLight} text-red-700`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex items-center gap-2">
                        {/* AI Feature 1: Future Headline */}
                        <button
                          onClick={(e) => handleAI_FutureHeadline(id, e)}
                          className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-100 transition-colors"
                        >
                          <Newspaper size={10} /> Visualize Success
                        </button>
                        <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">Recommended</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{archetype.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {customDescription ? (
                        <span className="text-gray-700 italic">"{customDescription}"</span>
                      ) : (
                        <span>Since you are in {businessData.industry}, this path focuses on {archetype.description.toLowerCase()}</span>
                      )}
                    </p>
                    <div className="flex items-center text-red-700 text-sm font-semibold group-hover:underline">
                      Select this path <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>

            {!showAllArchetypes && (
              <button
                onClick={() => setShowAllArchetypes(true)}
                className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} />
                Add new from the standard 7 growth archetypes
              </button>
            )}

            {showAllArchetypes && (
              <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Other Standard Paths</h2>
                <div className="space-y-4">
                  {ARCHETYPES.filter(a => !suggestedArchetypes.includes(a.id)).map((archetype) => {
                    const Icon = archetype.icon;
                    return (
                      <div
                        key={archetype.id}
                        onClick={() => handleArchetypeSelect(archetype.id)}
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-400 transition-all cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className={`p-2 rounded-lg bg-gray-100 text-gray-600`}>
                            <Icon size={24} />
                          </div>
                          <button
                            onClick={(e) => handleAI_FutureHeadline(archetype.id, e)}
                            className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-100 transition-colors"
                          >
                            <Newspaper size={10} /> Visualize Success
                          </button>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1">{archetype.name}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {archetype.description}
                        </p>
                        <div className="flex items-center text-gray-600 text-sm font-semibold group-hover:text-red-600 group-hover:underline">
                          Select this path <ChevronRight size={16} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-400">Selecting a path unlocks the 15-stream diagnostic.</p>
            </div>
          </main>
        </div>
      )}

      {/* STEP 3: READINESS ASSESSMENT */}
      {step === 3 && (
        <div className={`min-h-screen ${BRAND_COLORS.bgLight} font-sans flex flex-col`}>
          <Header step={3} progress={40 + ((currentQuestionIndex / STREAMS.length) * 40)} user={user} onLogout={handleLogout} />

          <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                  Stream {currentQuestionIndex + 1}/{STREAMS.length}
                </span>
                <span className="text-xs font-semibold text-gray-500">{STREAMS[currentQuestionIndex].name}</span>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center relative overflow-hidden transition-all duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-50 rounded-full opacity-50 z-0"></div>

                <h2 className="text-xl font-medium text-gray-900 leading-snug mb-6 relative z-10">
                  {aiStreamQuestions[STREAMS[currentQuestionIndex].id] || generateStreamQuestion(STREAMS[currentQuestionIndex].id, selectedArchetype, businessData)}
                </h2>

                <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start relative z-10 mb-4">
                  <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-800 font-semibold mb-1">Objective</p>
                    <p className="text-xs text-blue-700 leading-relaxed">{STREAMS[currentQuestionIndex].objective}</p>
                  </div>
                </div>

                {/* AI Context Button */}
                <button
                  onClick={() => handleAI_QuestionHelp(STREAMS[currentQuestionIndex].id, selectedArchetype)}
                  className="relative z-10 flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 p-2 rounded-lg transition-colors w-fit"
                >
                  <Sparkles size={16} />
                  {aiQuestionLoading ? "Analyzing..." : "Ask AI: Why this matters?"}
                </button>

                {/* AI Output Section */}
                {aiQuestionHelp && (
                  <div className="mt-4 bg-white border border-indigo-100 rounded-xl relative z-10 animate-in fade-in slide-in-from-top-2 overflow-hidden shadow-sm">
                    {/* Header */}
                    <div className="flex justify-between items-center p-3 bg-indigo-50 border-b border-indigo-100">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
                        <Sparkles size={14} className="text-indigo-600" /> Why this matters
                      </div>
                      <button onClick={() => setAiQuestionHelp(null)} className="p-1 hover:bg-indigo-100 rounded-full transition-colors">
                        <X size={14} className="text-indigo-400" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Why Section */}
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {typeof aiQuestionHelp === 'object' ? aiQuestionHelp.why : aiQuestionHelp}
                        </p>
                      </div>

                      {/* Example Section */}
                      {typeof aiQuestionHelp === 'object' && aiQuestionHelp.example && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle size={14} className="text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-800 uppercase">What 'Ready' Looks Like</span>
                          </div>
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            {aiQuestionHelp.example}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3 pb-8">
              <button
                onClick={() => handleReadinessAnswer('Ready')}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-500 hover:bg-green-50 hover:text-green-800 text-left font-medium text-gray-700 transition-all flex items-center justify-between group"
              >
                <span>Yes, fully ready</span>
                <CheckCircle size={20} className="text-gray-300 group-hover:text-green-600" />
              </button>

              <button
                onClick={() => handleReadinessAnswer('Partial')}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-yellow-500 hover:bg-yellow-50 hover:text-yellow-800 text-left font-medium text-gray-700 transition-all flex items-center justify-between group"
              >
                <span>Partially / In Progress</span>
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-yellow-600"></div>
              </button>

              <button
                onClick={() => handleReadinessAnswer('Not Ready')}
                className="w-full p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-red-500 hover:bg-red-50 hover:text-red-800 text-left font-medium text-gray-700 transition-all flex items-center justify-between group"
              >
                <span>Not started yet</span>
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-red-600"></div>
              </button>
            </div>
          </main>
        </div>
      )}

      {/* STEP 4: COMMITMENT CHECK */}
      {step === 4 && (
        <div className={`min-h-screen ${BRAND_COLORS.bgLight} font-sans`}>
          <Header step={4} progress={90} user={user} onLogout={handleLogout} />
          <main className="max-w-md mx-auto p-4 pb-20">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Execution Commitment</h1>
              <p className="text-gray-600 text-sm">
                We identified {Object.values(readinessAnswers).filter(v => v === 'Not Ready').length} streams needing attention. Growth requires rigor. Are you ready to commit?
              </p>
            </div>

            <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              {/* AI Feature 2: Risk Radar */}
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-800 text-sm">Pre-Mortem Reality Check</h3>
                    <p className="text-xs text-orange-700 mt-1">
                      Before you commit, let AI identify the top 3 specific "hidden risks" for this strategy in the {businessData.industry} sector.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAI_RiskRadar}
                  className="mt-2 w-full py-2 bg-white border border-orange-200 text-orange-700 font-bold text-xs rounded-lg shadow-sm hover:bg-orange-100 flex items-center justify-center gap-2"
                >
                  <Sparkles size={12} /> Run Risk Radar
                </button>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="font-semibold text-gray-800 mb-3">
                  1. Are you willing to dedicate 4-6 hours per week specifically to drive this {ARCHETYPES.find(a => a.id === selectedArchetype).name} initiative?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="q1" className="text-red-600 focus:ring-red-600" /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" name="q1" className="text-red-600 focus:ring-red-600" /> No</label>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="font-semibold text-gray-800 mb-3">
                  2. Can you assign a dedicated 'Growth Lead' from your team to own the sprint deliverables?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="q2" className="text-red-600 focus:ring-red-600" /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" name="q2" className="text-red-600 focus:ring-red-600" /> No</label>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="font-semibold text-gray-800 mb-3">
                  3. Are you open to external expert audits of your current {businessData.industry} processes?
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" name="q3" className="text-red-600 focus:ring-red-600" /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" name="q3" className="text-red-600 focus:ring-red-600" /> No</label>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <Button onClick={handleCommitmentSubmit}>
                Generate Support Plan
              </Button>
            </div>
          </main>
        </div>
      )}

      {/* STEP 5: SUPPORT PLAN */}
      {step === 5 && (
        <div className="min-h-screen bg-white font-sans">
          <header className={`${BRAND_COLORS.red} text-white p-6 pb-12`}>
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-2 mb-4 opacity-90">
                <CheckCircle size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Diagnostic Complete</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Accelerate Plan</h1>
              <p className="opacity-90 text-sm">Prepared for {businessData.name}</p>
            </div>
          </header>

          <main className="max-w-md mx-auto -mt-8 px-4 pb-20">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-4">
                <div className={`p-3 rounded-lg ${BRAND_COLORS.bgLight} text-red-700`}>
                  <Target size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Selected Path</p>
                  <h2 className="font-bold text-gray-900">{ARCHETYPES.find(a => a.id === selectedArchetype).name}</h2>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Based on your revenue of {businessData.revenue} and {businessData.employees} employees,
                focusing on the following streams will yield the highest ROI in the next 90 days.
              </p>
            </div>

            {/* Priority Streams */}
            <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Top 5 Priority Streams</h3>

            <div className="space-y-4">
              {STREAMS.filter(s => readinessAnswers[s.id] === 'Not Ready' || readinessAnswers[s.id] === 'Partial').slice(0, 5).map((stream, idx) => (
                <div key={stream.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${idx < 2 ? BRAND_COLORS.red : BRAND_COLORS.orange}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800">{stream.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${idx < 2 ? BRAND_COLORS.red : BRAND_COLORS.orange}`}>
                      {idx < 2 ? 'CRITICAL' : 'HIGH PRIORITY'}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Sprint Deliverable</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                      {stream.deliverables}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-3 items-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                      <Users size={12} /> Expert Review
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      <FileText size={12} /> Masterclass
                    </span>
                    {/* AI Feature: Generate OKRs */}
                    <button
                      onClick={() => handleAI_GenerateOKRs(stream.id)}
                      className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded border border-teal-100 transition-colors"
                    >
                      <ListTodo size={12} /> Generate OKRs
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Generator for Step 5 */}
            <button
              onClick={() => handleAI_DraftEmail(STREAMS.filter(s => readinessAnswers[s.id] === 'Not Ready' || readinessAnswers[s.id] === 'Partial').slice(0, 5))}
              className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={20} className="text-yellow-300" />
              Draft Kickoff Email for Team
            </button>

            {/* Recommendations */}
            <div className={`mt-8 ${BRAND_COLORS.yellow} bg-opacity-10 rounded-xl p-6 border border-yellow-200`}>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Next Steps</h3>
              <ul className="space-y-3 text-sm text-gray-800">
                <li className="flex gap-2">
                  <CheckCircle size={18} className="text-yellow-600 shrink-0" />
                  <span>Join the <strong>Accelerate Kick-off</strong> workshop next Tuesday.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={18} className="text-yellow-600 shrink-0" />
                  <span>Download the <strong>{ARCHETYPES.find(a => a.id === selectedArchetype).name.split(' ')[0]} Toolkit</strong> from the dashboard.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle size={18} className="text-yellow-600 shrink-0" />
                  <span>Schedule your 1:1 with a Wadhwani Growth Navigator.</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <Button onClick={() => window.print()}>
                <Download size={20} /> Export to PDF
              </Button>
              <Button variant="secondary" onClick={restart}>Start New Assessment</Button>
            </div>
          </main>
        </div>
      )}
    </>
  );
}