"use client";
/** Generic editable table. fields: [{k,label,type:'text|number|date|select|csv|check|color', options, w}] */
export default function ListEditor({ items, onChange, fields, blank, readOnly, addLabel = "Add row", empty = "Nothing here yet." }) {
  const upd = (i, k, v) => onChange(items.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const cell = (r, i, f) => {
    const id = `${f.k}-${i}`, val = r[f.k];
    if (f.type === "check") return <input id={id} aria-label={f.label} type="checkbox" checked={val !== false} disabled={readOnly} onChange={e => upd(i, f.k, e.target.checked)} />;
    if (f.type === "select") return <select id={id} aria-label={f.label} value={val ?? ""} disabled={readOnly} onChange={e => upd(i, f.k, e.target.value)}>{f.options.map(o => <option key={o}>{o}</option>)}</select>;
    if (f.type === "csv") return <input id={id} aria-label={f.label} value={Array.isArray(val) ? val.join(", ") : val ?? ""} disabled={readOnly} onChange={e => upd(i, f.k, e.target.value.split(",").map(x => x.trimStart()))} onBlur={e => upd(i, f.k, e.target.value.split(",").map(x => x.trim()).filter(Boolean))} />;
    return <input id={id} aria-label={f.label} type={f.type || "text"} value={val ?? ""} disabled={readOnly} onChange={e => upd(i, f.k, f.type === "number" ? (e.target.value === "" ? "" : +e.target.value) : e.target.value)} />;
  };
  return (<div className="tablewrap"><table className="edtable"><thead><tr>{fields.map(f => <th key={f.k}>{f.label}</th>)}<th /></tr></thead><tbody>
    {items.map((r, i) => <tr key={i}>{fields.map(f => <td key={f.k} style={f.w ? { minWidth: f.w } : null}>{cell(r, i, f)}</td>)}<td>{!readOnly && <button className="btn sm alt" aria-label="Remove row" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>}</td></tr>)}
    {!items.length && <tr><td colSpan={fields.length + 1} className="note">{empty}</td></tr>}</tbody></table>
    {!readOnly && <button className="btn sm alt" style={{ marginTop: 8 }} onClick={() => onChange([...items, { ...blank }])}>{addLabel}</button>}</div>);
}
export const objToList = (o, a = "from", b = "to") => Object.entries(o || {}).map(([k, v]) => ({ [a]: k, [b]: v }));
export const listToObj = (l, a = "from", b = "to") => Object.fromEntries(l.filter(r => (r[a] || "").trim()).map(r => [r[a].trim(), r[b] ?? ""]));
