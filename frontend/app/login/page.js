"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn, me, logout } = useApp();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (userToLogin, pass = "") => {
    setError("");
    setLoading(true);
    try {
      await login(userToLogin || username, pass || password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { id: "admin", name: "Admin (Brand HQ & Policies)", role: "admin", desc: "Full access to rules, facts, brands and models" },
    { id: "priya", name: "Priya (Content Creator)", role: "creator", desc: "Drafts copy, uploads media, reviews and applies fixes" },
    { id: "maya", name: "Maya (Marketing Manager)", role: "manager", desc: "Approves content, assigns tasks, coordinates campaigns" },
    { id: "leena", name: "Leena (Compliance Reviewer)", role: "reviewer", desc: "Handles critical legal claim escalations" },
  ];

  return (
    <div className="login-container" style={{
      maxWidth: "520px",
      margin: "40px auto",
      padding: "32px",
      borderRadius: "16px",
      background: "var(--card-bg, #ffffff)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      border: "1px solid var(--border, #e5e7eb)"
    }}>
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #6d4ad4 0%, #a981e8 100%)",
          color: "#fff",
          marginBottom: "16px"
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 20 6v5c0 5-3.3 8.6-8 10-4.7-1.4-8-5-8-10V6l8-3Z" />
            <path d="m9 12 2 2 4-5" />
          </svg>
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0" }}>Sign in to BrandGuard</h1>
        <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>
          Enter your credentials to access your brand workspace.
        </p>
      </div>

      {isLoggedIn && me && (
        <div style={{
          padding: "16px",
          marginBottom: "24px",
          borderRadius: "10px",
          background: "rgba(109, 74, 212, 0.08)",
          border: "1px solid rgba(109, 74, 212, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Currently signed in as:</div>
            <strong>{me.name}</strong> <span style={{ fontSize: "12px", background: "#6d4ad4", color: "#fff", padding: "2px 8px", borderRadius: "12px", marginLeft: "6px" }}>{me.role}</span>
          </div>
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                background: "#6d4ad4",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                marginRight: "8px",
                fontWeight: 600
              }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={logout}
              style={{
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #ef4444",
                padding: "6px 10px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2",
          color: "#b91c1c",
          padding: "10px 14px",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "14px",
          border: "1px solid #fecaca"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
            Username or Email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. admin, priya, or your name"
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              boxSizing: "border-box"
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          style={{
            width: "100%",
            padding: "12px",
            background: "linear-gradient(135deg, #6d4ad4 0%, #8257e8 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "15px",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(109, 74, 212, 0.3)"
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div style={{ marginTop: "28px", borderTop: "1px solid #e5e7eb", paddingTop: "20px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", marginBottom: "12px", textAlign: "center" }}>
          Quick Demo Accounts (1-Click Sign In)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {demoAccounts.map(acc => (
            <button
              key={acc.id}
              type="button"
              onClick={() => handleLogin(acc.id)}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6d4ad4"; e.currentTarget.style.background = "#faf5ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#f9fafb"; }}
            >
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>{acc.name.split(" ")[0]}</div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>{acc.role}</div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px" }}>
        <Link href="/" style={{ color: "#6d4ad4", textDecoration: "none" }}>
          ← Back to Public Overview
        </Link>
      </div>
    </div>
  );
}
