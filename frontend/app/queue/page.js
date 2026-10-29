"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/lib/ctx";
import { Card, Sev, Field } from "@/components/ui";
const STATUS = { draft: "Draft", in_review: "With manager", escalated: "With reviewer", changes_requested: "Changes requested", approved: "Approved", published: "Published" };
export default function Queue() {
  const { api, brand, me, user, say, setDraft } = useApp();
  const [list, setList] = useState([]);
  const [id, setId] = useState(null);
  const [s, setS] = useState(null);
  const [cm, setCm] = useState(""); const [jf, setJf] = useState("");
  useEffect(() => { setId(new URLSearchParams(window.location.search).get("id")); }, []);
  const load = useCallback(async () => { setList(await api(`/submissions?brand_id=${brand}`)); if (id) setS(await api(`/submissions/${id}`)); else setS(null); }, [api, brand, id]);
  useEffect(() => { load().catch(() => {}); }, [load, user]);
  const v = s?.versions.at(-1);
  const canDecide = s && ((s.status === "in_review" && ["manager", "reviewer", "admin"].includes(me.role)) || (s.status === "escalated" && ["reviewer", "admin"].includes(me.role)));
  const dec = async d => { await api(`/submissions/${id}/decision`, { decision: d, comment: cm, justification: jf }); setCm(""); setJf(""); say(d === "approve" ? "Approved." : "Changes requested."); load(); };
  const pick = sid => { setId(String(sid)); history.replaceState(null, "", `?id=${sid}`); };
  return (<>
    <h1>Approvals</h1><p className="sub">Minor issues go to a manager. Major and critical issues go to a reviewer. Nobody approves their own content, and every decision is logged.</p>
    <div className="split">
      <Card><div className="tablewrap"><table><thead><tr><th>Title</th><th>Status</th><th>Risk</th></tr></thead><tbody>
        {list.map(x => <tr key={x.id}><td><a href={`?id=${x.id}`} onClick={e => { e.preventDefault(); pick(x.id); }}>#{x.id} {x.title}</a></td><td>{STATUS[x.status]}</td><td>{x.top_severity === "none" ? "none" : <Sev s={x.top_severity} />}</td></tr>)}
        {!list.length && <tr><td colSpan={3} className="empty">Nothing yet. Submit content from Review, or run the Agent studio.</td></tr>}</tbody></table></div></Card>
      {s && <Card><h2>#{s.id} {s.title}</h2><p><b>{STATUS[s.status]}</b> · version {v.n} · {s.channel} · author {s.author_id}</p>
        <div className="card flat" style={{ whiteSpace: "pre-wrap", marginBottom: 12 }}>{v.text}</div>
        <h3>Findings in this version ({v.findings.length})</h3>
        {v.findings.map((f, i) => <p key={i}><Sev s={f.severity} /> <b>{f.title}</b>: <mark className="ev">{f.evidence}</mark></p>)}{!v.findings.length && <p>None.</p>}
        {v.dismissals.length > 0 && <><h3>Dismissed by author</h3>{v.dismissals.map((d, i) => <p key={i} className="note">{d.rule_id}: {d.reason}</p>)}</>}
        <h3>Versions</h3><p className="note">{s.versions.map(x => `v${x.n} (${x.findings.length} findings)`).join(" → ")}</p>
        <h3>Discussion</h3>{s.comments.map((c, i) => <p key={i}><b>{c.user}</b>: {c.body}</p>)}{!s.comments.length && <p className="note">No comments.</p>}
        <Field label="Comment" id="cm"><textarea id="cm" rows={2} style={{ minHeight: 60 }} value={cm} onChange={e => setCm(e.target.value)} /></Field>
        {canDecide && v.findings.some(f => f.severity === "critical") && <Field label="Written justification (required to approve with critical issues)" id="jf"><input id="jf" value={jf} onChange={e => setJf(e.target.value)} /></Field>}
        <div className="row" style={{ marginTop: 12 }}>
          {canDecide && <><button className="btn go" onClick={() => dec("approve")}>Approve</button><button className="btn bad" onClick={() => dec("request_changes")}>Request changes</button></>}
          {s.status === "approved" && ["manager", "reviewer", "admin"].includes(me.role) && <Link className="btn" href="/publish">Schedule publishing</Link>}
          {["draft", "changes_requested"].includes(s.status) && s.author_id === user && <Link className="btn alt" href="/review" onClick={() => setDraft({ title: s.title, text: v.text, channel: s.channel, has_image: v.has_image, alt_text: v.alt_text, visual: v.visual })}>Edit and resubmit</Link>}
          <button className="btn alt" onClick={async () => { if (cm) { await api(`/submissions/${id}/comment`, { body: cm }); setCm(""); load(); } }}>Add comment</button></div>
        {!canDecide && <p className="note">{s.status === "escalated" ? "Only a Reviewer can decide this item." : s.status === "in_review" ? "Switch to the Manager or Reviewer user to decide." : ""}</p>}
      </Card>}
    </div></>);
}
