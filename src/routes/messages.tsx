import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Send, Search, ArrowLeft, Loader2, MessageCircle, Smile, Paperclip, Camera, Mic } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  component: Messages,
  validateSearch: (s: Record<string, unknown>) => ({
    to: typeof s.to === "string" ? s.to : undefined,
  }),
});

type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { to } = Route.useSearch();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [activePeer, setActivePeer] = useState<string | null>(to ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // redirect to auth if not signed in
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // fetch all messages involving me
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoadingMsgs(true);
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: true });
      if (!alive) return;
      const list = (data ?? []) as Msg[];
      setMsgs(list);
      const ids = new Set<string>();
      list.forEach((m) => {
        ids.add(m.sender_id);
        ids.add(m.recipient_id);
      });
      if (to) ids.add(to);
      ids.delete(user.id);
      if (ids.size) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", Array.from(ids));
        const map: Record<string, Profile> = {};
        (ps ?? []).forEach((p: any) => (map[p.id] = p));
        setProfiles(map);
      }
      setLoadingMsgs(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, to]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as Msg;
          if (m.sender_id !== user.id && m.recipient_id !== user.id) return;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
          if (!profiles[otherId]) {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("id", otherId)
              .maybeSingle();
            if (data) setProfiles((p) => ({ ...p, [otherId]: data as Profile }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profiles]);

  // conversations list
  const conversations = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, { peer: string; last: Msg; unread: number }>();
    for (const m of msgs) {
      const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const cur = map.get(peer);
      const unread = !m.read_at && m.recipient_id === user.id ? 1 : 0;
      if (!cur || new Date(m.created_at) > new Date(cur.last.created_at)) {
        map.set(peer, { peer, last: m, unread: (cur?.unread ?? 0) + unread });
      } else {
        map.set(peer, { ...cur, unread: cur.unread + unread });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime()
    );
  }, [msgs, user]);

  const thread = useMemo(() => {
    if (!user || !activePeer) return [];
    return msgs.filter(
      (m) =>
        (m.sender_id === user.id && m.recipient_id === activePeer) ||
        (m.sender_id === activePeer && m.recipient_id === user.id)
    );
  }, [msgs, user, activePeer]);

  // scroll on new
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length, activePeer]);

  // mark as read
  useEffect(() => {
    if (!user || !activePeer) return;
    const unreadIds = thread
      .filter((m) => m.recipient_id === user.id && !m.read_at)
      .map((m) => m.id);
    if (!unreadIds.length) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (!error) {
          setMsgs((prev) =>
            prev.map((m) =>
              unreadIds.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m
            )
          );
        }
      });
  }, [user, activePeer, thread]);

  // search users
  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQ.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(15);
      setSearchResults(((data ?? []) as Profile[]).filter((p) => p.id !== user?.id));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, searchOpen, user]);

  const sendContent = async (content: string) => {
    if (!user || !activePeer) return;
    content = content.trim();
    if (!content) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: activePeer, content })
      .select()
      .single();
    setBusy(false);
    if (error || !data) {
      toast.error("Couldn't send message");
      return;
    }
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  };

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setText("");
    await sendContent(content);
  };

  // pending file preview before send
  const [pending, setPending] = useState<{ file: File; url: string; kind: "image" | "video" | "audio" | "file" } | null>(null);

  const kindOf = (file: File): "image" | "video" | "audio" | "file" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return "file";
  };

  const queueFile = (file: File) => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending({ file, url: URL.createObjectURL(file), kind: kindOf(file) });
  };

  const cancelPending = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const confirmSendPending = async () => {
    if (!pending || !user || !activePeer) return;
    const { file } = pending;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      await sendContent(pub.publicUrl);
      cancelPending();
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };

  // voice recording
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    if (!user || !activePeer) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        queueFile(file);
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      toast.error("Mic permission denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };




  const peerName = (id: string) => {
    const p = profiles[id];
    return p?.display_name ?? p?.username ?? "User";
  };

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row h-[calc(100dvh-8rem)] md:h-[calc(100vh-6rem)] md:min-h-[600px]">
        {/* Sidebar */}
        <aside
          className={`md:w-80 md:border-r border-slate-200 flex-col ${
            activePeer ? "hidden md:flex" : "flex"
          } flex-1 md:flex-none`}
        >
          <div className="p-3 border-b border-slate-200 flex items-center gap-2">
            <h2 className="font-bold text-base flex-1">Messages</h2>
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
              aria-label="New chat"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
          {searchOpen && (
            <div className="p-3 border-b border-slate-200">
              <input
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search users…"
                className="w-full h-9 px-3 rounded-full bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setProfiles((map) => ({ ...map, [p.id]: p }));
                          setActivePeer(p.id);
                          setSearchOpen(false);
                          setSearchQ("");
                        }}
                        className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Avatar p={p} />
                        <span className="text-sm font-medium truncate">
                          {p.display_name ?? p.username ?? "User"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {loadingMsgs ? (
              <div className="flex justify-center py-8 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-8 px-4">
                No conversations yet. Tap the search icon to start one.
              </p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const p = profiles[c.peer];
                  return (
                    <li key={c.peer}>
                      <button
                        onClick={() => setActivePeer(c.peer)}
                        className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50 ${
                          activePeer === c.peer ? "bg-indigo-50" : ""
                        }`}
                      >
                        <Avatar p={p} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate flex-1">
                              {peerName(c.peer)}
                            </p>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(c.last.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {c.last.sender_id === user.id ? "You: " : ""}
                            {c.last.content}
                          </p>
                        </div>
                        {c.unread > 0 && (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unread}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`flex-1 flex-col ${activePeer ? "flex" : "hidden md:flex"}`}>
          {activePeer ? (
            <>
              <header className="p-3 border-b border-slate-200 flex items-center gap-2">
                <button
                  onClick={() => setActivePeer(null)}
                  className="md:hidden h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Avatar p={profiles[activePeer]} />
                <p className="font-semibold text-sm">{peerName(activePeer)}</p>
              </header>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                {thread.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-8">
                    Say hi 👋
                  </p>
                ) : (
                  thread.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                            mine
                              ? "bg-indigo-600 text-white rounded-br-md"
                              : "bg-white border border-slate-200 rounded-bl-md"
                          }`}
                        >
                          {m.content}
                          <div
                            className={`text-[10px] mt-0.5 ${
                              mine ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>
              {pending && (
                <div className="border-t border-slate-200 bg-white p-3 flex items-center gap-3">
                  <div className="shrink-0">
                    {pending.kind === "image" ? (
                      <img src={pending.url} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                    ) : pending.kind === "video" ? (
                      <video src={pending.url} className="h-20 w-20 object-cover rounded-lg border border-slate-200" />
                    ) : pending.kind === "audio" ? (
                      <audio src={pending.url} controls className="h-10" />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs px-2 text-center break-all">
                        {pending.file.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{pending.file.name}</p>
                    <p className="text-xs text-slate-500">{(pending.file.size / 1024).toFixed(1)} KB · Preview before sending</p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelPending}
                    disabled={busy}
                    className="h-10 px-3 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSendPending}
                    disabled={busy}
                    className="h-10 px-4 rounded-full text-sm font-semibold bg-[#00a884] hover:bg-[#019574] text-white flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              )}

              <div className="shrink-0 border-t border-slate-200 bg-[#ebe5dc] px-2 py-2 flex items-end gap-1.5" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
                <input
                  ref={attachInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) queueFile(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) queueFile(f);
                    e.target.value = "";
                  }}
                />


                <div className="flex-1 min-w-0 flex items-center gap-0.5 bg-white rounded-full pl-2 pr-2 py-1 shadow-sm min-h-12">
                  <button
                    type="button"
                    className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100"
                    aria-label="Emoji"
                  >
                    <Smile className="h-6 w-6" />
                  </button>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Message"
                    disabled={busy}
                    maxLength={2000}
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[16px] leading-6 py-1.5 px-1 max-h-32 focus:outline-none placeholder:text-slate-500 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => attachInputRef.current?.click()}
                    disabled={busy}
                    className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    aria-label="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  {!text.trim() && (
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={busy}
                      className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      aria-label="Camera"
                    >
                      <Camera className="h-5 w-5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (text.trim()) return send();
                    if (recording) return stopRecording();
                    return startRecording();
                  }}
                  disabled={busy && !recording}
                  className={`h-12 w-12 shrink-0 rounded-full text-white flex items-center justify-center shadow-md disabled:opacity-60 transition-colors ${
                    recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#00a884] hover:bg-[#019574]"
                  }`}
                  aria-label={text.trim() ? "Send" : recording ? "Stop recording" : "Record voice"}
                >
                  {busy && !recording ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : text.trim() ? (
                    <Send className="h-5 w-5" />

                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 flex-col gap-2">
              <MessageCircle className="h-10 w-10" />
              <p className="text-sm">Select a conversation</p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Avatar({ p }: { p: Profile | undefined }) {
  const name = p?.display_name ?? p?.username ?? "U";
  return (
    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
      {p?.avatar_url ? (
        <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" />
      ) : (
        name[0]?.toUpperCase()
      )}
    </div>
  );
}
