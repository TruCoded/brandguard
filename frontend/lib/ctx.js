"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
const BASE = process.env.NEXT_PUBLIC_API || "";

export function AppProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);
  const [brand, setBrandState] = useState("solarly");
  const [user, setUserState] = useState("");
  const [token, setTokenState] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [draft, setDraft] = useState({ title: "", text: "", channel: "instagram", has_image: false, alt_text: "", visual: {} });

  const say = useCallback(m => {
    setToast(m);
    clearTimeout(say.t);
    say.t = setTimeout(() => setToast(""), 4200);
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("bg_token") || "";
    const savedUser = localStorage.getItem("bg_user") || "";
    const savedBrand = localStorage.getItem("bg_brand") || "solarly";
    setTokenState(savedToken);
    setUserState(savedUser);
    setBrandState(savedBrand);

    Promise.all([
      fetch(BASE + "/api/brands").then(r => r.json()).catch(() => []),
      fetch(BASE + "/api/users").then(r => r.json()).catch(() => [])
    ]).then(([b, u]) => {
      setBrands(Array.isArray(b) ? b : []);
      setUsers(Array.isArray(u) ? u : []);
      if (savedUser && Array.isArray(u)) {
        const found = u.find(x => x.id === savedUser);
        if (found) setCurrentUser(found);
      }
      setReady(true);
    }).catch(() => {
      setToast("Cannot reach the API. Is the backend running?");
      setReady(true);
    });
  }, []);

  const login = async (username, password = "") => {
    try {
      const res = await fetch(BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");
      
      localStorage.setItem("bg_token", data.token);
      localStorage.setItem("bg_user", data.user.id);
      setTokenState(data.token);
      setUserState(data.user.id);
      setCurrentUser(data.user);
      say(`Signed in as ${data.user.name}`);
      return data;
    } catch (err) {
      say(err.message || "Login failed");
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("bg_token");
    localStorage.removeItem("bg_user");
    setTokenState("");
    setUserState("");
    setCurrentUser(null);
    say("Signed out successfully.");
  };

  const setBrand = b => {
    localStorage.setItem("bg_brand", b);
    setBrandState(b);
  };

  const setUser = u => {
    localStorage.setItem("bg_user", u);
    setUserState(u);
    const found = users.find(x => x.id === u);
    if (found) setCurrentUser(found);
  };

  const api = useCallback(async (path, body, method) => {
    const headers = {
      "Content-Type": "application/json",
      "X-User-Id": user || ""
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const o = {
      method: method || (body !== undefined ? "POST" : "GET"),
      headers
    };
    if (body !== undefined) o.body = JSON.stringify(body);
    const r = await fetch(BASE + "/api" + path, o);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = typeof j.detail === "string" ? j.detail : "Something went wrong";
      say(m);
      throw new Error(m);
    }
    return j;
  }, [user, token, say]);

  const me = currentUser || users.find(u => u.id === user) || (user ? { role: "creator", id: user, name: user } : null);

  return (
    <Ctx.Provider value={{
      brands,
      users,
      brand,
      user,
      token,
      currentUser,
      isLoggedIn: !!token,
      login,
      logout,
      setBrand,
      setUser,
      api,
      say,
      toast,
      me,
      ready,
      draft,
      setDraft,
      brandInfo: brands.find(b => b.id === brand)
    }}>
      {children}
    </Ctx.Provider>
  );
}
