import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft, Banknote, CheckCircle2, Calendar, Clock, User, MapPin,
  ChevronRight, Search, Filter, Sparkles, Receipt, TrendingUp,
  ShieldCheck, RefreshCw, CalendarCheck, Award, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";
import { API_URL } from "../config/api";

const formatDate = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" }); }
  catch { return d; }
};
const fmtCurrency = (n) => `₦${(parseFloat(n) || 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const STATUS_META = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)"  },
  approved:  { label: "Approved",  color: "#6366f1", bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.25)"  },
  completed: { label: "Completed", color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)"  },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)"   },
};

const SkeletonCard = () => (
  <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "1.5rem" }}>
    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
      <div className="ps-shimmer" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div className="ps-shimmer" style={{ height: "1rem", width: "55%", borderRadius: 6 }} />
        <div className="ps-shimmer" style={{ height: "0.8rem", width: "35%", borderRadius: 6 }} />
      </div>
    </div>
    <div className="ps-shimmer" style={{ height: 52, borderRadius: 12, marginBottom: "1rem" }} />
    <div style={{ display: "flex", gap: "0.5rem" }}>
      {[90, 110, 80].map((w, i) => <div key={i} className="ps-shimmer" style={{ height: 34, width: w, borderRadius: 10 }} />)}
    </div>
  </div>
);
const PaidCard = ({ appt, index }) => {
  const navigate = useNavigate();
  const id = appt._id || appt.id;
  const serviceName = appt.service_id?.name || "Styling Session";
  const specialistName = appt.stylist_id?.name || appt.service_id?.stylist_id?.name || "Specialist";
  const price = parseFloat(appt.service_id?.price) || 0;
  const duration = appt.service_id?.duration || 45;
  const location = appt.stylist_id?.address || appt.service_id?.stylist_id?.address || null;
  const status = STATUS_META[appt.status] || STATUS_META.pending;
  const avatar = appt.stylist_id?.avatar || appt.service_id?.stylist_id?.avatar || null;
  const initials = specialistName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.3) }}
      onClick={() => navigate(`/appointment/${id}`)}
      className="ps-paid-card"
      style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "clamp(1rem, 3.5vw, 1.4rem)", cursor: "pointer", transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(79,70,229,0.12)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {/* Top Header Row with flex-between (mobile safe — badge never overlaps title) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 4px 12px rgba(79,70,229,0.22)", border: "2px solid #fff" }}>
            {avatar ? <img src={avatar} alt={specialistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem", fontFamily: "Outfit" }}>{initials}</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: "0.98rem", fontFamily: "Outfit", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{serviceName}</h3>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <User size={12} style={{ flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{specialistName}</span>
            </div>
          </div>
        </div>
        <div style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 99, padding: "0.22rem 0.65rem", fontSize: "0.7rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
          <CheckCircle2 size={11} /> PAID
        </div>
      </div>

      <div className="ps-detail-grid" style={{ background: "#f8fafc", borderRadius: 12, padding: "0.75rem 0.95rem", marginBottom: "0.85rem", border: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={13} color="#6366f1" /></div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Date</div><div style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{formatDate(appt.date)}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={13} color="#f59e0b" /></div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>Time</div><div style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appt.time || "—"} · {duration}m</div></div>
        </div>
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", gridColumn: "1 / -1", minWidth: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MapPin size={13} color="#10b981" /></div>
            <div style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}`, borderRadius: 99, padding: "0.22rem 0.6rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize" }}>{status.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "Outfit", color: "#8b5cf6", letterSpacing: "-0.01em" }}>{fmtCurrency(price)}</span>
          <ChevronRight size={16} color="#94a3b8" />
        </div>
      </div>
    </motion.div>
  );
};

const PaidServicesPage = () => {
  const navigate = useNavigate();
  const { notify } = useNotify();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => { fetchPaid(); }, []);

  const fetchPaid = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/appointments/my-appointments`);
      if (res.data.success) setAppointments(res.data.data.filter(a => a.paymentStatus === "paid"));
    } catch { notify.error("Failed to load paid services."); }
    finally { setLoading(false); }
  };

  const { totalSpent, totalSessions, avgSession } = useMemo(() => {
    const total = appointments.reduce((s, a) => s + (parseFloat(a.service_id?.price) || 0), 0);
    return { totalSpent: total, totalSessions: appointments.length, avgSession: appointments.length ? total / appointments.length : 0 };
  }, [appointments]);

  const displayed = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let r = appointments.filter(a => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (!q) return true;
      const terms = q.split(/\s+/);
      const fields = [
        (a.service_id?.name || ""),
        (a.service_id?.category || ""),
        (a.stylist_id?.name || a.service_id?.stylist_id?.name || ""),
        (a.stylist_id?.address || a.service_id?.location || ""),
        (a.date || ""),
        formatDate(a.date),
        (a.time || ""),
        String(a.service_id?.price || ""),
        fmtCurrency(a.service_id?.price)
      ].map(s => s.toLowerCase());

      return terms.every(term => fields.some(f => f.includes(term)));
    });
    if (sortBy === "newest")  r = [...r].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    if (sortBy === "oldest")  r = [...r].sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    if (sortBy === "highest") r = [...r].sort((a, b) => (parseFloat(b.service_id?.price) || 0) - (parseFloat(a.service_id?.price) || 0));
    if (sortBy === "lowest")  r = [...r].sort((a, b) => (parseFloat(a.service_id?.price) || 0) - (parseFloat(b.service_id?.price) || 0));
    return r;
  }, [appointments, searchQuery, filterStatus, sortBy]);

  const FILTERS = ["all", "pending", "approved", "completed", "cancelled"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "clamp(0.75rem,3.5vw,2rem)", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes ps-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .ps-shimmer { background: linear-gradient(90deg,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.09) 40%,rgba(0,0,0,0.04) 80%); background-size:1200px 100%; animation:ps-shimmer 1.4s ease-in-out infinite; display:inline-block; }
        .ps-pill { padding:.4rem .85rem; border-radius:999px; font-size:.76rem; font-weight:700; cursor:pointer; border:1.5px solid; transition:all .15s ease; white-space:nowrap; text-transform:capitalize; flex-shrink:0; }
        .ps-sort { appearance:none; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:.45rem 2rem .45rem .75rem; font-size:.82rem; font-family:inherit; color:#0f172a; cursor:pointer; outline:none; }
        @keyframes ps-spin { to { transform: rotate(360deg); } }
        
        /* ── Mobile Sweeps ── */
        @media(max-width:640px){
          .ps-stats { grid-template-columns: 1fr 1fr !important; gap: 0.65rem !important; }
          .ps-stats > div:last-child { grid-column: span 2 !important; }
          .ps-grid { grid-template-columns: 1fr !important; }
          .ps-bar { flex-direction: column !important; align-items: stretch !important; gap: 0.65rem !important; padding: 0.85rem !important; }
          .ps-search-box { width: 100% !important; }
          .ps-chips-scroller { width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; scrollbar-width: none !important; padding-bottom: 2px !important; }
          .ps-chips-scroller::-webkit-scrollbar { display: none; }
          .ps-sort-refresh-row { width: 100% !important; display: flex !important; justify-content: space-between !important; align-items: center !important; margin-left: 0 !important; }
          .ps-paid-card { border-radius: 16px !important; }
        }
        @media(max-width:390px){
          .ps-stats { grid-template-columns: 1fr !important; }
          .ps-stats > div:last-child { grid-column: auto !important; }
          .ps-detail-grid { grid-template-columns: 1fr !important; gap: 0.5rem !important; }
        }
      `}</style>

      {/* Back Button */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", background: "rgba(255,255,255,0.85)", border: "1px solid #e2e8f0", cursor: "pointer", color: "#475569", fontSize: ".84rem", fontWeight: 700, padding: ".45rem .85rem", borderRadius: 10, backdropFilter: "blur(4px)", boxShadow: "0 1px 4px rgba(0,0,0,0.03)", transition: "all 0.15s ease" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#4f46e5"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#e2e8f0"; }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#8b5cf6 100%)", borderRadius: "clamp(18px, 4vw, 24px)", padding: "clamp(1.25rem,4vw,2.25rem)", marginBottom: "1.5rem", position: "relative", overflow: "hidden", boxShadow: "0 16px 48px rgba(79,70,229,0.28)" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "30%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: ".5rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)", flexShrink: 0 }}>
              <Banknote size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(1.2rem,4vw,1.65rem)", fontFamily: "Outfit", fontWeight: 800 }}>Paid Services</h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: ".82rem" }}>Full history of your verified investments & bookings</p>
            </div>
          </div>
          <div className="ps-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".85rem", marginTop: "1.25rem" }}>
            {[
              { label: "Total Invested",  value: fmtCurrency(totalSpent), icon: TrendingUp },
              { label: "Sessions Paid",   value: loading ? "—" : totalSessions, icon: CalendarCheck },
              { label: "Avg per Session", value: loading ? "—" : fmtCurrency(avgSession), icon: Award },
            ].map(({ label, value, icon: Icon }, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color="#fff" /></div>
                <div>
                  <div style={{ fontSize: ".68rem", color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <div style={{ fontSize: "1.05rem", color: "#fff", fontWeight: 800, fontFamily: "Outfit", lineHeight: 1.2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="ps-bar" style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: "0.85rem 1.15rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
        <div className="ps-search-box" style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
          <Search size={15} style={{ position: "absolute", left: ".8rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search service, specialist, date, price…"
            style={{ width: "100%", padding: ".52rem .85rem .52rem 2.25rem", borderRadius: 999, border: "1.5px solid #e2e8f0", fontSize: ".83rem", outline: "none", background: "#f8fafc", fontFamily: "inherit", color: "#0f172a", transition: "all .2s ease" }}
            onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; }}
            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: ".75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="ps-chips-scroller" style={{ display: "flex", gap: ".35rem" }}>
          {FILTERS.map(f => {
            const active = filterStatus === f;
            return <button key={f} className="ps-pill" onClick={() => setFilterStatus(f)} style={{ borderColor: active ? "#6366f1" : "#e2e8f0", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b" }}>{f}</button>;
          })}
        </div>
        <div className="ps-sort-refresh-row" style={{ display: "flex", alignItems: "center", gap: ".5rem", marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
            <Filter size={14} color="#64748b" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="ps-sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest price</option>
              <option value="lowest">Lowest price</option>
            </select>
          </div>
          <button onClick={fetchPaid} disabled={loading}
            style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, flexShrink: 0 }}
            onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = "#6366f1")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")} title="Refresh list">
            <RefreshCw size={14} color="#64748b" style={{ animation: loading ? "ps-spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      {!loading && displayed.length > 0 && (
        <div style={{ fontSize: ".8rem", color: "#64748b", fontWeight: 600, marginBottom: ".85rem", paddingLeft: ".25rem" }}>
          Showing <span style={{ color: "#0f172a" }}>{displayed.length}</span> paid service{displayed.length !== 1 ? "s" : ""}
          {filterStatus !== "all" ? ` · ${filterStatus}` : ""}
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,440px),1fr))", gap: "1rem" }}>
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </motion.div>
        ) : displayed.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ textAlign: "center", padding: "4rem 2rem", background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem", border: "2px solid rgba(99,102,241,0.15)" }}>
              <Receipt size={32} style={{ opacity: 0.5 }} color="#6366f1" />
            </div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a", fontFamily: "Outfit", fontWeight: 800 }}>{appointments.length === 0 ? "No paid services yet" : "No results match"}</h3>
            <p style={{ margin: ".5rem 0 1.5rem", fontSize: ".88rem", color: "#64748b", maxWidth: 360, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              {appointments.length === 0 ? "Once you pay for a booking, it will appear here with full session details." : "Try clearing your filters or adjust the search query."}
            </p>
            {appointments.length === 0
              ? <button onClick={() => navigate("/book")} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: ".7rem 1.4rem", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", boxShadow: "0 6px 20px rgba(79,70,229,0.3)" }}><Sparkles size={16} /> Book a Session</button>
              : <button onClick={() => { setSearchQuery(""); setFilterStatus("all"); }} style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "rgba(99,102,241,0.08)", color: "#6366f1", border: "1.5px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: ".55rem 1rem", fontWeight: 700, fontSize: ".85rem", cursor: "pointer" }}>Clear filters</button>
            }
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,440px),1fr))", gap: "1rem" }}>
            <AnimatePresence>{displayed.map((a, i) => <PaidCard key={a._id || a.id} appt={a} index={i} />)}</AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && displayed.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          style={{ marginTop: "2rem", textAlign: "center", fontSize: ".78rem", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
          <ShieldCheck size={13} /> All transactions are secured through D.WORLD verified payment system.
        </motion.div>
      )}
    </div>
  );
};

export default PaidServicesPage;
