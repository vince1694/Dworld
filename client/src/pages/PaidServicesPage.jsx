import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft, Banknote, CheckCircle2, Calendar, Clock, User, MapPin,
  ChevronRight, Search, Filter, Sparkles, Receipt, TrendingUp,
  ShieldCheck, RefreshCw, CalendarCheck, Award,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, delay: index * 0.06 }}
      onClick={() => navigate(`/appointment/${id}`)}
      style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", padding: "1.5rem", cursor: "pointer", transition: "all 0.2s ease", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 28px rgba(79,70,229,0.12)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 99, padding: "0.22rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <CheckCircle2 size={11} /> PAID
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.9rem", marginBottom: "1rem", paddingRight: "4.5rem" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 4px 12px rgba(79,70,229,0.22)", border: "2.5px solid #fff" }}>
          {avatar ? <img src={avatar} alt={specialistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#fff", fontWeight: 800, fontSize: "1rem", fontFamily: "Outfit" }}>{initials}</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontFamily: "Outfit", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{serviceName}</h3>
          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <User size={12} style={{ flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{specialistName}</span>
          </div>
        </div>
      </div>

      <div style={{ background: "#f8fafc", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: "1rem", border: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Calendar size={13} color="#6366f1" /></div>
          <div><div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Date</div><div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>{formatDate(appt.date)}</div></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={13} color="#f59e0b" /></div>
          <div><div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Time</div><div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600 }}>{appt.time || "—"} · {duration}min</div></div>
        </div>
        {location && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", gridColumn: "1 / -1" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MapPin size={13} color="#10b981" /></div>
            <div style={{ fontSize: "0.82rem", color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{location}</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}`, borderRadius: 99, padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize" }}>{status.label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "Outfit", color: "#8b5cf6", letterSpacing: "-0.01em" }}>{fmtCurrency(price)}</span>
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
      return [(a.service_id?.name || ""), (a.stylist_id?.name || a.service_id?.stylist_id?.name || ""), (a.date || "")]
        .some(s => s.toLowerCase().includes(q));
    });
    if (sortBy === "newest")  r = [...r].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    if (sortBy === "oldest")  r = [...r].sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));
    if (sortBy === "highest") r = [...r].sort((a, b) => (parseFloat(b.service_id?.price) || 0) - (parseFloat(a.service_id?.price) || 0));
    if (sortBy === "lowest")  r = [...r].sort((a, b) => (parseFloat(a.service_id?.price) || 0) - (parseFloat(b.service_id?.price) || 0));
    return r;
  }, [appointments, searchQuery, filterStatus, sortBy]);

  const FILTERS = ["all", "pending", "approved", "completed", "cancelled"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "clamp(1rem,4vw,2rem)", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes ps-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
        .ps-shimmer { background: linear-gradient(90deg,rgba(0,0,0,0.04) 0%,rgba(0,0,0,0.09) 40%,rgba(0,0,0,0.04) 80%); background-size:1200px 100%; animation:ps-shimmer 1.4s ease-in-out infinite; display:inline-block; }
        .ps-pill { padding:.38rem .85rem; border-radius:999px; font-size:.77rem; font-weight:600; cursor:pointer; border:1.5px solid; transition:all .15s ease; white-space:nowrap; text-transform:capitalize; }
        .ps-sort { appearance:none; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:.45rem 2rem .45rem .75rem; font-size:.82rem; font-family:inherit; color:#0f172a; cursor:pointer; outline:none; }
        @keyframes ps-spin { to { transform: rotate(360deg); } }
        @media(max-width:640px){.ps-stats{grid-template-columns:1fr 1fr !important}.ps-grid{grid-template-columns:1fr !important}.ps-bar{flex-direction:column !important}}
      `}</style>

      {/* Back */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button onClick={() => navigate("/dashboard")}
          style={{ display: "inline-flex", alignItems: "center", gap: ".45rem", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: ".875rem", fontWeight: 600, padding: ".4rem .6rem", borderRadius: 8 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.07)"; e.currentTarget.style.color = "#4f46e5"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748b"; }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#8b5cf6 100%)", borderRadius: 24, padding: "clamp(1.5rem,4vw,2.25rem)", marginBottom: "1.75rem", position: "relative", overflow: "hidden", boxShadow: "0 16px 48px rgba(79,70,229,0.28)" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: "30%", width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: ".5rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)" }}>
              <Banknote size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, color: "#fff", fontSize: "clamp(1.25rem,4vw,1.65rem)", fontFamily: "Outfit", fontWeight: 800 }}>Paid Services</h1>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: ".85rem" }}>Full history of every service you have invested in</p>
            </div>
          </div>
          <div className="ps-stats" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".85rem", marginTop: "1.5rem" }}>
            {[
              { label: "Total Invested",  value: fmtCurrency(totalSpent), icon: TrendingUp },
              { label: "Sessions Paid",   value: loading ? "—" : totalSessions, icon: CalendarCheck },
              { label: "Avg per Session", value: loading ? "—" : fmtCurrency(avgSession), icon: Award },
            ].map(({ label, value, icon: Icon }, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.13)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 16, padding: "1rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={18} color="#fff" /></div>
                <div>
                  <div style={{ fontSize: ".7rem", color: "rgba(255,255,255,0.7)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
                  <div style={{ fontSize: "1.1rem", color: "#fff", fontWeight: 800, fontFamily: "Outfit", lineHeight: 1.2 }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="ps-bar" style={{ background: "#fff", borderRadius: 18, border: "1px solid #e2e8f0", padding: "1rem 1.25rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: ".75rem", flexWrap: "wrap", boxShadow: "0 2px 8px rgba(15,23,42,0.05)" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <Search size={15} style={{ position: "absolute", left: ".75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search service, specialist, date…"
            style={{ width: "100%", padding: ".55rem .85rem .55rem 2.2rem", borderRadius: 999, border: "1.5px solid #e2e8f0", fontSize: ".84rem", outline: "none", background: "#f8fafc", fontFamily: "inherit", color: "#0f172a", transition: "all .2s ease" }}
            onFocus={e => { e.target.style.borderColor = "#6366f1"; e.target.style.background = "#fff"; }}
            onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }} />
        </div>
        <div style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
          {FILTERS.map(f => {
            const active = filterStatus === f;
            return <button key={f} className="ps-pill" onClick={() => setFilterStatus(f)} style={{ borderColor: active ? "#6366f1" : "#e2e8f0", background: active ? "#6366f1" : "#f8fafc", color: active ? "#fff" : "#64748b" }}>{f}</button>;
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: ".4rem", marginLeft: "auto" }}>
          <Filter size={14} color="#64748b" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="ps-sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest price</option>
            <option value="lowest">Lowest price</option>
          </select>
        </div>
        <button onClick={fetchPaid} disabled={loading}
          style={{ width: 36, height: 36, borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.borderColor = "#6366f1")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")} title="Refresh">
          <RefreshCw size={14} color="#64748b" style={{ animation: loading ? "ps-spin 1s linear infinite" : "none" }} />
        </button>
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
