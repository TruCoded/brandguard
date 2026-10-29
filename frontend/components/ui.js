"use client";
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
export const Pill = ({ kind, children }) => <span className={`pill ${kind || ""}`}>{children}</span>;
export const Sev = ({ s }) => <Pill kind={s}>{s}</Pill>;
export const Card = ({ children, flat, style, ...p }) => <section className={`card ${flat ? "flat" : ""}`} style={style} {...p}>{children}</section>;
export const Kpi = ({ v, l, hint }) => <div className="card kpi" title={hint}><b>{v ?? "–"}</b><span>{l}</span></div>;
export const Empty = ({ children }) => <div className="card empty">{children}</div>;
export const Field = ({ label, id, children }) => <div><label className="field-label" htmlFor={id}>{label}</label>{children}</div>;
export const PALETTE = { mint: "#5dc9a0", sun: "#ffd23f", coral: "#ff6b5e", plum: "#6c4ab6", sky: "#4aa3df" };

export function Plot({ config, height = 260 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const dark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    Chart.defaults.color = dark ? "#b4bde0" : "#4a5778";
    const c = new Chart(ref.current, { ...config, options: { responsive: true, maintainAspectRatio: false, ...(config.options || {}) } });
    return () => c.destroy();
  }, [JSON.stringify(config)]);
  return <div style={{ position: "relative", height }}><canvas ref={ref} role="img" aria-label="chart" /></div>;
}
export const fileToB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
