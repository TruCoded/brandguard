"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const BASE = process.env.NEXT_PUBLIC_API || "";

export function AppProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);
  const [brand, setBrandState] = useState("solarly");
  const [user, setUserState] = useState("priya");
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ title: "", text: "", channel: "instagram", has_image: false, alt_text: "", visual: {} });

  useEffect(() => {
    setBrandState(localStorage.getItem("bg_brand") || "solarly");
    setUserState(localStorage.getItem("bg_user") || "priya");
    Promise.all([fetch(BASE + "/api/brands").then(r => r.json()), fetch(BASE + "/api/users").then(r => r.json())])
      .then(([b, u]) => { setBrands(b); setUsers(u); setReady(true); })
      .catch(() => setToast("Cannot reach the API. Is the backend running?"));
  }, []);
  const setBrand = b => { localStorage.setItem("bg_brand", b); setBrandState(b); };
  const setUser = u => { localStorage.setItem("bg_user", u); setUserState(u); };
  const say = useCallback(m => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(""), 4200); }, []);
  const api = useCallback(async (path, body, method) => {
    const o = { method: method || (body !== undefined ? "POST" : "GET"), headers: { "X-User-Id": user, "Content-Type": "application/json" } };
    if (body !== undefined) o.body = JSON.stringify(body);
    const r = await fetch(BASE + "/api" + path, o); const j = await r.json().catch(() => ({}));
    if (!r.ok) { const m = typeof j.detail === "string" ? j.detail : "Something went wrong"; say(m); throw new Error(m); }
    return j;
  }, [user, say]);
  const me = users.find(u => u.id === user) || { role: "creator", id: user };
  return <Ctx.Provider value={{ brands, users, brand, user, setBrand, setUser, api, say, toast, me, ready, draft, setDraft, brandInfo: brands.find(b => b.id === brand) }}>{children}</Ctx.Provider>;
}
