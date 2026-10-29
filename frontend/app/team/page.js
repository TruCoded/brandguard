"use client";
import { useEffect, useState, useCallback } from "react";
import { useApp } from "@/lib/ctx";
import { Card, Pill, Field } from "@/components/ui";
export default function Team() {
  const { api, me, say, user } = useApp(); const [U, setU] = useState([]); const [f, setF] = useState({ id: "", name: "", role: "creator", team: "" });
  const load = useCallback(async () => setU(await fetch((process.env.NEXT_PUBLIC_API || "") + "/api/users").then(r => r.json())), []);
  useEffect(() => { load(); }, [load]);
  const admin = me.role === "admin";
  return (<><span className="crumb">Team</span><h1>Team and roles</h1>
    <p className="sub">Creators draft, managers approve routine work, authorised reviewers decide on risky items, and admins manage guidelines. Role changes are logged.</p>
    <div className="grid g2"><Card><h2>People ({U.length})</h2><table><tbody>{U.map(u => <tr key={u.id}><td><b>{u.name}</b><br /><span className="note">{u.id} · {u.team}</span></td><td><Pill>{u.role}</Pill></td>
      <td>{admin && u.id !== user && <button className="btn sm alt" onClick={async () => { if (confirm("Remove " + u.name + "?")) { await api("/users/" + u.id, undefined, "DELETE"); load(); } }}>Remove</button>}</td></tr>)}</tbody></table></Card>
      <Card><h2>Add or update a person</h2>
        <Field label="Short ID" id="ui"><input id="ui" value={f.id} disabled={!admin} onChange={e => setF({ ...f, id: e.target.value })} /></Field>
        <Field label="Name" id="un"><input id="un" value={f.name} disabled={!admin} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Role" id="ur"><select id="ur" value={f.role} disabled={!admin} onChange={e => setF({ ...f, role: e.target.value })}>{["creator", "manager", "reviewer", "admin"].map(r => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Team or agency" id="ut"><input id="ut" value={f.team} disabled={!admin} onChange={e => setF({ ...f, team: e.target.value })} /></Field>
        <div style={{ marginTop: 12 }}><button className="btn" disabled={!admin || !f.id || !f.name} onClick={async () => { await api("/users", f); say("Saved."); setF({ id: "", name: "", role: "creator", team: "" }); load(); setTimeout(() => window.location.reload(), 400); }}>Save person</button></div>
        {!admin && <p className="note">Only a Brand Admin can manage people.</p>}</Card></div></>);
}
