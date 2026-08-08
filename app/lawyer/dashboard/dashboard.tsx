"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { name:string; specialty:string; practice:string; location:string; languages:string; price:string; availability:string; accent:string; reasons:string[]; bio:string; experience:string; credentials:string; tags:string[]; published:boolean };
type Article = { id?:string; title:string; excerpt:string; body:string; published:boolean; updated_at?:string };
const blankProfile: Profile = { name:"", specialty:"", practice:"Business", location:"Remote", languages:"English", price:"Contact for pricing", availability:"Within one business day", accent:"blue", reasons:[], bio:"", experience:"", credentials:"Credentials pending verification", tags:[], published:false };
const blankArticle: Article = { title:"", excerpt:"", body:"", published:false };

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview"|"profile"|"articles">("overview");
  const [account, setAccount] = useState({ name:"", email:"" });
  const [profile, setProfile] = useState(blankProfile);
  const [articles, setArticles] = useState<Article[]>([]);
  const [article, setArticle] = useState(blankArticle);
  const [status, setStatus] = useState("Loading your workspace…");

  async function load() {
    const response = await fetch("/api/account");
    if (response.status === 401) { router.push("/lawyer/account"); return; }
    const data = await response.json(); setAccount(data.account); setArticles(data.articles || []);
    if (data.profile) setProfile({ ...data.profile, reasons:data.profile.reasons || [], tags:data.profile.tags || [] });
    else setProfile(current => ({ ...current, name:data.account.name }));
    setStatus("");
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const completeness = useMemo(() => Math.round([profile.name,profile.specialty,profile.practice,profile.location,profile.languages,profile.price,profile.availability,profile.bio,profile.experience,profile.tags.length].filter(Boolean).length / 10 * 100), [profile]);
  const update = (key:keyof Profile,value:string|boolean|string[]) => setProfile(current => ({...current,[key]:value}));

  async function saveProfile(publish = profile.published) {
    setStatus(publish ? "Publishing profile…" : "Saving profile…");
    const response = await fetch("/api/account/profile", { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...profile,published:publish,reasons:profile.reasons.join(", "),tags:profile.tags.join(", ")}) });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "Could not save profile."); return; }
    setProfile({...data.profile,reasons:data.profile.reasons || [],tags:data.profile.tags || []}); setStatus(publish ? "Profile published ✓" : "All changes saved ✓");
  }
  async function saveArticle(publish = article.published) {
    setStatus(publish ? "Publishing article…" : "Saving draft…");
    const response = await fetch("/api/account/articles", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...article,published:publish}) });
    const data = await response.json();
    if (!response.ok) { setStatus(data.error || "Could not save article."); return; }
    setArticle(data.article); setStatus(publish ? "Article published ✓" : "Draft saved ✓"); await load();
  }
  async function logout() { await fetch("/api/auth/logout",{method:"POST"}); router.push("/"); router.refresh(); }

  return <main className="dashboard-shell"><aside className="dashboard-nav"><Link className="brand" href="/"><span className="brand-mark">M</span><span>meet</span></Link><div className="account-mini"><span>{account.name.split(" ").map(n=>n[0]).join("").slice(0,2) || "L"}</span><div><strong>{account.name || "Lawyer"}</strong><small>{account.email}</small></div></div><nav><button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}>Overview</button><button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>Public profile</button><button className={tab==="articles"?"active":""} onClick={()=>setTab("articles")}>Articles <span>{articles.length}</span></button></nav><button className="logout-button" onClick={logout}>Sign out</button></aside>
    <section className="dashboard-content"><header><div><p className="section-kicker">Lawyer workspace</p><h1>{tab === "overview" ? `Good to see you, ${account.name.split(" ")[0] || "there"}.` : tab === "profile" ? "Design your profile." : "Share your expertise."}</h1></div><div className="save-state">{status || "Your work saves to your account"}</div></header>
    {tab === "overview" && <div className="overview-grid"><article className="metric-card main"><span>Profile strength</span><strong>{completeness}%</strong><div><i style={{width:`${completeness}%`}}/></div><p>{completeness < 80 ? "Add more detail to help clients understand why you are the right fit." : "Your profile gives clients a strong view of your practice."}</p><button onClick={()=>setTab("profile")}>Improve profile →</button></article><article className="metric-card"><span>Visibility</span><strong>{profile.published ? "Live" : "Draft"}</strong><p>{profile.published ? "Your profile can appear in relevant client matches." : "Publish when your profile is ready for clients."}</p></article><article className="metric-card"><span>Insights</span><strong>{articles.filter(a=>a.published).length}</strong><p>Published articles help clients understand your point of view.</p><button onClick={()=>setTab("articles")}>Write an article →</button></article><article className="workspace-card"><p className="section-kicker">Your public card</p><ProfilePreview profile={profile}/></article><article className="workspace-card"><p className="section-kicker">Latest writing</p>{articles.length ? articles.slice(0,3).map(item=><button className="article-row" key={item.id} onClick={()=>{setArticle(item);setTab("articles")}}><span>{item.published?"Published":"Draft"}</span><strong>{item.title}</strong><small>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "Recently edited"}</small></button>) : <div className="empty-state"><strong>No articles yet</strong><p>Turn questions you answer every day into useful guidance.</p><button onClick={()=>setTab("articles")}>Start writing →</button></div>}</article></div>}
    {tab === "profile" && <div className="editor-layout"><div className="profile-editor"><EditorSection number="01" title="Identity" copy="How clients recognize your practice."><Field label="Full name" value={profile.name} onChange={v=>update("name",v)}/><Field label="Professional title" value={profile.specialty} onChange={v=>update("specialty",v)}/><Field label="Primary practice area" value={profile.practice} onChange={v=>update("practice",v)}/><Field label="Location" value={profile.location} onChange={v=>update("location",v)}/></EditorSection><EditorSection number="02" title="Your expertise" copy="Specific detail improves matching."><Field label="Areas of expertise (comma separated)" value={profile.tags.join(", ")} onChange={v=>update("tags",v.split(",").map(x=>x.trim()).filter(Boolean))}/><Field label="Experience" value={profile.experience} onChange={v=>update("experience",v)}/><Field label="Credentials" value={profile.credentials} onChange={v=>update("credentials",v)}/><Field label="Languages" value={profile.languages} onChange={v=>update("languages",v)}/></EditorSection><EditorSection number="03" title="Client experience" copy="Set expectations before the first call."><Field label="Professional introduction" area value={profile.bio} onChange={v=>update("bio",v)}/><Field label="Why clients choose you (comma separated)" value={profile.reasons.join(", ")} onChange={v=>update("reasons",v.split(",").map(x=>x.trim()).filter(Boolean))}/><Field label="Consultation fee" value={profile.price} onChange={v=>update("price",v)}/><Field label="Availability" value={profile.availability} onChange={v=>update("availability",v)}/></EditorSection><div className="editor-actions"><button className="card-button" onClick={()=>saveProfile(false)}>Save draft</button><button className="primary-button compact" onClick={()=>saveProfile(true)}>{profile.published?"Update published profile":"Publish profile"}<span>→</span></button></div></div><aside className="sticky-preview"><p className="preview-label">Live profile preview</p><ProfilePreview profile={profile}/></aside></div>}
    {tab === "articles" && <div className="article-workspace"><div className="article-library"><div><p className="section-kicker">Your library</p><button className="new-article" onClick={()=>setArticle(blankArticle)}>+ New article</button></div>{articles.map(item=><button className={item.id===article.id?"selected":""} key={item.id} onClick={()=>setArticle(item)}><span>{item.published?"Published":"Draft"}</span><strong>{item.title}</strong><small>{item.updated_at ? new Date(item.updated_at).toLocaleDateString() : ""}</small></button>)}</div><div className="article-editor"><label>Article title<input value={article.title} onChange={e=>setArticle({...article,title:e.target.value})} placeholder="A clear, useful title"/></label><label>Short introduction<textarea rows={3} value={article.excerpt || ""} onChange={e=>setArticle({...article,excerpt:e.target.value})} placeholder="Tell readers what they will learn."/></label><label>Article body<textarea className="article-body" rows={18} value={article.body} onChange={e=>setArticle({...article,body:e.target.value})} placeholder="Write your practical guidance here…"/></label><div className="editor-actions"><button className="card-button" onClick={()=>saveArticle(false)}>Save draft</button><button className="primary-button compact" onClick={()=>saveArticle(true)}>Publish article<span>→</span></button></div></div></div>}
    </section></main>;
}

function Field({label,value,onChange,area=false}:{label:string;value:string;onChange:(value:string)=>void;area?:boolean}) { return <label>{label}{area?<textarea rows={5} value={value} onChange={e=>onChange(e.target.value)}/>:<input value={value} onChange={e=>onChange(e.target.value)}/>}</label> }
function EditorSection({number,title,copy,children}:{number:string;title:string;copy:string;children:React.ReactNode}) { return <section className="editor-section"><div className="editor-title"><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div></div><div className="editor-fields">{children}</div></section> }
function ProfilePreview({profile}:{profile:Profile}) { return <div className="dashboard-profile-card"><div className="profile-head"><div className={`avatar ${profile.accent} large`}>{profile.name.split(" ").map(n=>n[0]).join("").slice(0,2)||"ME"}</div><div><h2>{profile.name||"Your name"}</h2><p>{profile.specialty||"Your professional title"}</p></div><span className="verified">{profile.published?"Live":"Draft"}</span></div><p className="bio">{profile.bio||"Your professional introduction will appear here."}</p><div className="profile-tags">{profile.tags.length?profile.tags.map(tag=><span key={tag}>{tag}</span>):<span>Expertise</span>}</div><div className="profile-facts"><div><small>Experience</small><strong>{profile.experience||"Add details"}</strong></div><div><small>Languages</small><strong>{profile.languages}</strong></div><div><small>Consultation</small><strong>{profile.price}</strong></div></div></div> }
