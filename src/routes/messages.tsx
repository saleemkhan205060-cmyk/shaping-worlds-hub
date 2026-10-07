import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Layout } from "../components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfileDirectory } from "@/hooks/use-profile-directory";
import { playSoftChime } from "@/lib/notification-sound";
import { Send, Search, ArrowLeft, Loader2, MessageCircle, Smile, Paperclip, Camera, Mic, Trash2, Images, MapPin, FileText, User as UserIcon, MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { moderateMedia } from "@/lib/moderation-bridge";

// Capture a still frame from a video File as a JPEG Blob (for chat-video moderation).
async function captureChatVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
      v.onloadedmetadata = () => {
        const target = Math.min(1, Math.max(0.1, (v.duration || 2) * 0.25));
        try { v.currentTime = target; } catch { resolve(null); cleanup(); }
      };
      v.onseeked = () => {
        try {
          const c = document.createElement("canvas");
          const w = v.videoWidth || 320, h = v.videoHeight || 240;
          const scale = Math.min(1, 512 / Math.max(w, h));
          c.width = Math.max(1, Math.round(w * scale));
          c.height = Math.max(1, Math.round(h * scale));
          const ctx = c.getContext("2d");
          if (!ctx) { resolve(null); cleanup(); return; }
          ctx.drawImage(v, 0, 0, c.width, c.height);
          c.toBlob((b) => { resolve(b); cleanup(); }, "image/jpeg", 0.8);
        } catch { resolve(null); cleanup(); }
      };
      v.onerror = () => { resolve(null); cleanup(); };
    } catch { resolve(null); }
  });
}


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
  const { profiles, cacheProfile, ensureProfiles } = useProfileDirectory();
  const [activePeer, setActivePeer] = useState<string | null>(to ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [attachOpen, setAttachOpen] = useState(false);

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
      if (ids.size) ensureProfiles(Array.from(ids));
      setLoadingMsgs(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, to, ensureProfiles]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const handleNew = async (payload: any) => {
      const m = payload.new as Msg;
      if (m.sender_id !== user.id && m.recipient_id !== user.id) return;
      if (m.recipient_id === user.id && m.sender_id !== user.id) playSoftChime(m.id);
      setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      ensureProfiles([otherId]);
    };
    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        handleNew,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        handleNew,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, ensureProfiles]);

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
  endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
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
      // Sanitize: strip PostgREST filter grammar chars to prevent .or() injection
      const safe = q.replace(/[,()\\*%"]/g, "").slice(0, 100);
      if (!safe) {
        setSearchResults([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`)
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

  const shareLocation = () => {
    setAttachOpen(false);
    if (!navigator.geolocation) {
      toast.error("Location not supported on this device");
      return;
    }
    toast.message("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const url = `https://maps.google.com/?q=${latitude},${longitude}`;
        await sendContent(`📍 My location: ${url}`);
      },
      () => toast.error("Couldn't get your location"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const shareContact = async () => {
    setAttachOpen(false);
    const name = window.prompt("Contact name");
    if (!name) return;
    const phone = window.prompt("Phone number");
    if (!phone) return;
    await sendContent(`👤 Contact\nName: ${name}\nPhone: ${phone}`);
  };


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
    const { file, kind } = pending;
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("message-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      // Content-safety scan for images & videos before the message is sent.
      // Audio / file / document attachments are not visually scanned here
      // (text triggers still classify captions server-side).
      if (kind === "image" || kind === "video") {
        let framePath: string | null = null;
        if (kind === "video") {
          toast.message("Checking video…");
          const frame = await captureChatVideoFrame(file);
          if (frame) {
            framePath = `${user.id}/frames/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const frameFile = new File([frame], "frame.jpg", { type: "image/jpeg" });
            const { error: fErr } = await supabase.storage.from("message-media").upload(framePath, frameFile, {
              contentType: "image/jpeg", upsert: false,
            });
            if (fErr) framePath = null;
          }
        }
        const verdict = await moderateMedia({
          bucket: "message-media",
          path,
          mediaType: kind,
          surface: kind === "image" ? "chat_image" : "chat_video",
          framePath,
        });
        // Clean up the frame regardless of verdict; only the media path is referenced by the message.
        if (framePath) { try { await supabase.storage.from("message-media").remove([framePath]); } catch {} }
        if (!verdict.safe) {
          toast.error(
            `This ${kind} was blocked by our safety filter (${verdict.reason}). It was not sent.`,
            { duration: 6000 },
          );
          cancelPending();
          return;
        }
      }

      // Store an opaque reference; recipients fetch a short-lived signed URL on render
      await sendContent(`mm://${path}`);
      cancelPending();
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
    }
  };


  // voice recording (WhatsApp-style: tap mic to start, tap send to upload, tap trash to discard)
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const pickMime = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    if (typeof MediaRecorder === "undefined") return "";
    const MR = MediaRecorder as unknown as { isTypeSupported?: (t: string) => boolean };
    for (const m of candidates) {
      if (MR.isTypeSupported?.(m)) return m;
    }
    return "";
  };

  const cleanupRecorder = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordSecs(0);
  };

  const uploadAndSendVoice = async (blob: Blob, mime: string) => {
    if (!user || !activePeer) return;
    setBusy(true);
    try {
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const path = `${user.id}/voice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const file = new File([blob], path.split("/").pop()!, { type: mime || "audio/webm" });
      const { error: upErr } = await supabase.storage.from("message-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      await sendContent(`mm://${path}`);
    } catch {
      toast.error("Couldn't send voice message");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (!user || !activePeer) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording isn't supported on this device");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const actualMime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const wasCancelled = cancelledRef.current;
        cleanupRecorder();
        if (wasCancelled || blob.size === 0) return;
        void uploadAndSendVoice(blob, actualMime);
      };
      recorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordSecs(0);
      timerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    } catch {
      toast.error("Mic permission denied");
      cleanupRecorder();
    }
  };

  const stopAndSendRecording = () => {
    if (!recorderRef.current) return;
    cancelledRef.current = false;
    try { recorderRef.current.stop(); } catch { cleanupRecorder(); }
  };

  const cancelRecording = () => {
    if (!recorderRef.current) { cleanupRecorder(); return; }
    cancelledRef.current = true;
    try { recorderRef.current.stop(); } catch { cleanupRecorder(); }
  };

  useEffect(() => () => cleanupRecorder(), []);

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;




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
    <Layout hideMobileNav={!!activePeer} fullScreenMobile={!!activePeer}>
      <div
       className={`touch-none bg-[#f7faf8] border border-[#19D66B]/30 shadow-lg overflow-hidden flex flex-col md:flex-row md:rounded-2xl ${
        activePeer
         ? "h-[100dvh] min-h-0"
         : "h-[calc(100dvh-68px-56px)] rounded-2xl"
         } md:h-[calc(100vh-4rem)] md:min-h-[600px]`}
        >
        {/* Sidebar */}
        <aside
          className={`md:w-80 md:border-r border-slate-200 min-h-0 flex-col ${
            activePeer ? "hidden md:flex" : "flex"
          } flex-1 md:flex-none`}
        >
          <div className="shrink-0 px-3 py-3 bg-[#003D25] border-b border-[#19D66B]/30 flex items-center gap-2">
            <h2 className="font-bold text-[18px] text-white flex-1">
            Messages
            </h2>

            <button
           onClick={() => setSearchOpen((o) => !o)}
           className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
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
               className="w-full h-9 px-3 rounded-full bg-white border border-[#19D66B]/15 shadow-[0_2px_8px_rgba(0,61,37,0.06)] text-sm focus:outline-none focus:ring-2 focus:ring-[#19D66B]/40 focus:border-[#19D66B]/30 transition-all duration-200"
              />
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          cacheProfile(p);
                          setActivePeer(p.id);
                          setSearchOpen(false);
                          setSearchQ("");
                        }}
                        className="w-full text-left px-2 py-2 rounded-xl hover:bg-[#F0FBF4] active:bg-[#DFF7E8] hover:shadow-[0_2px_8px_rgba(0,61,37,0.06)] transition-all duration-200 flex items-center gap-2"
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
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
             <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#19D66B]/10 blur-3xl" />
             <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[#7CFF3B]/5 blur-3xl" />
             <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#005A35]/5 blur-3xl" />
             </div>
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
                          activePeer === c.peer
                        ? "bg-gradient-to-r from-[#DFF7E8] via-[#EAFBF0] to-white border-l-4 border-[#19D66B] shadow-[inset_0_0_18px_rgba(25,214,107,0.08),_0_3px_10px_rgba(0,61,37,0.06)]"
                        : ""
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
                        <span
                        className="h-5 min-w-5 px-1.5 rounded-full bg-[#19D66B] text-[#003D25] text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_rgba(25,214,107,0.45)] ring-1 ring-[#7CFF3B]/30"
                          >
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
        <section className={`flex-1 min-h-0 min-w-0 flex-col ${activePeer ? "flex bg-[#edf0e4]" : "hidden md:flex"}`}>
          {activePeer ? (
            <>
                <header className="shrink-0 bg-[#edf0e4] px-2 pt-1 pb-1 md:px-2">
                  <div className="flex items-center gap-1.5">
                  <div className="min-w-0 flex-1 rounded-full bg-[#075E54] text-white flex items-center gap-2 px-2.5 py-1 shadow-sm ring-1 ring-black/5">
                    <button
                      onClick={() => setActivePeer(null)}
                      className="md:hidden h-9 w-9 rounded-full hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-white shrink-0 transition-all duration-200 hover:scale-105 active:scale-95"
                      aria-label="Back"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </button>
                   <div className="relative shrink-0">
                  <div className="rounded-full p-[2px] bg-gradient-to-br from-[#7CFF3B] via-[#19D66B] to-[#003D25] shadow-[0_0_16px_rgba(25,214,107,0.42)]">
                  <div className="rounded-full bg-[#075E54] p-[1px]">
                  <Avatar p={profiles[activePeer]} size="h-10 w-10 text-sm" />
                  </div>
                  </div>

             <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-[#7CFF3B] border-2 border-[#075E54] shadow-[0_0_6px_rgba(124,255,59,0.7)]"
            aria-label="Online"
              />
                 </div>
                    <div className="flex-1 min-w-0 leading-tight pr-3">
                      <p className="font-bold text-[18px] leading-5 truncate">{peerName(activePeer)}</p>
                     <p className="text-[11px] leading-4 text-[#B8FFC9] flex items-center gap-1 font-medium tracking-wide">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7CFF3B] shadow-[0_0_5px_rgba(124,255,59,0.8)]" />
                    Online
                    </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="h-10 w-8 shrink-0 flex items-center justify-center text-slate-800 rounded-full hover:bg-white/20 active:bg-white/30 transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Conversation menu"
                  >
                    <MoreVertical className="h-7 w-7" />
                  </button>
                </div>
              </header>
              <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#edf0e4] relative"
               style={{ WebkitOverflowScrolling: "touch" }}
                >
                <div className="min-h-full flex flex-col p-4 space-y-2 relative z-10">
                {thread.length === 0 ? (
                  <div className="flex-1" />
                ) : (
                  thread.map((m) => {
                    const mine = m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[78%] px-3 py-2 rounded-2xl text-[15px] whitespace-pre-wrap break-words transition-all duration-200 hover:-translate-y-[1px] ${
                           mine
                           ? "bg-gradient-to-br from-[#006B3F] via-[#005A35] to-[#003D25] text-white rounded-2xl rounded-br-md shadow-[0_3px_10px_rgba(0,90,53,0.24)] ring-1 ring-[#19D66B]/20"
                          : "bg-gradient-to-br from-white via-white to-[#f4faf6] text-slate-800 border border-[#dce8e1] rounded-2xl rounded-bl-md shadow-[0_3px_10px_rgba(0,0,0,0.06)]"
                          }`}
                        >
                          {m.content.startsWith("mm://") ? (
                            <MessageAttachment
                              path={m.content.slice(5)}
                              messageId={m.id}
                              onDeleted={() => setMsgs((prev) => prev.filter((msg) => msg.id !== m.id))}
                            />
                          ) : (
                            m.content
                          )}
                          <div
                        className={`mt-1 flex items-center justify-end gap-0.5 text-[10px] opacity-90 ${
                       mine ? "text-white/70" : "text-slate-400"
                    }`}
                   >
             <span>
           {new Date(m.created_at).toLocaleTimeString([], {
          hour: "2-digit",
           minute: "2-digit",
          })}
           </span>

          {mine && (
           <span
            className={`text-[13px] font-semibold leading-none ${
           m.read_at ? "text-[#7CFF3B]" : "text-white/60"
               }`}
                 aria-label={m.read_at ? "Read" : "Sent"}
                    >
                     ✓✓
                      </span>
                        )}
                       </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
                </div>
              </div>
              {pending && (
                <div className="border-t border-[#19D66B]/15 bg-[#f7faf8] p-3 flex items-center gap-3 shadow-[0_-4px_14px_rgba(0,61,37,0.05)]">
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
                    className="h-10 px-4 rounded-full text-sm font-semibold bg-[#006B3F] hover:bg-[#007A48] active:bg-[#005A35] shadow-[0_0_14px_rgba(25,214,107,0.22)] text-white flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </button>
                </div>
              )}

              <div className="shrink-0 bg-[#edf0e4] px-1.5 py-0.5 pb-0.5 flex items-end gap-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) queueFile(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv,application/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) queueFile(f);
                    e.target.value = "";
                  }}
                />
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


                {recording ? (
                  <div className="flex-1 min-w-0 flex items-center gap-3 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] min-h-[56px]">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"
                      aria-label="Cancel recording"
                    >
                      <Trash2 className="h-7 w-7" />
                    </button>
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-base font-medium text-slate-700 tabular-nums">{fmtSecs(recordSecs)}</span>
                    <span className="flex-1 text-sm text-slate-500 truncate">Recording… tap send to share</span>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 flex items-center gap-1 bg-white rounded-full pl-2 pr-1.5 py-1 shadow-[0_4px_14px_rgba(0,61,37,0.09)] ring-1 ring-[#19D66B]/15 focus-within:ring-2 focus-within:ring-[#19D66B]/30 transition-all duration-200 min-h-[56px]">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                         className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-[#006B3F] bg-[#F7FCF9] border border-[#19D66B]/15 hover:bg-[#DFF7E8] hover:border-[#19D66B]/30 active:bg-[#C8F0D8] transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_3px_10px_rgba(25,214,107,0.18)]"
                          aria-label="Emoji"
                        >
                          <Smile className="h-8 w-8" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                      align="start"
                      side="top"
                      className="w-64 p-2 rounded-2xl border border-[#19D66B]/20 bg-white shadow-[0_8px_30px_rgba(0,61,37,0.14)]"
                        >
                        <div className="grid grid-cols-8 gap-1 text-xl">
                          {["😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🥳","😇","🙂","😉","😋","😜","🤔","😴","😢","😭","😡","👍","👎","🙏","👏","🙌","💪","👌","✌️","🤝","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💯","🔥","✨","🎉","🎊","🎁","🌹","🌸","☀️","🌙","⭐","⚡","☕","🍕","🍔","🍰","🍎","🍓","🍩","🍻"].map((e) => (
                            <button
                              key={e}
                              type="button"
                              className="h-8 w-8 rounded-xl hover:bg-[#DFF7E8] active:bg-[#C8F0D8] flex items-center justify-center transition-colors"
                              onClick={() => setText((t) => t + e)}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
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
                      className="flex-1 resize-none bg-transparent text-[17px] leading-6 py-2 px-1 max-h-32 focus:outline-none placeholder:text-slate-400 text-slate-800"
                    />
                    <Drawer open={attachOpen} onOpenChange={setAttachOpen}>
                      <DrawerTrigger asChild>
                        <button
                          type="button"
                          disabled={busy}
                          className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-[#006B3F] hover:bg-[#DFF7E8] active:bg-[#C8F0D8] disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_3px_10px_rgba(25,214,107,0.18)]"
                          aria-label="Attach"
                        >
                          <Paperclip className="h-7 w-7" />
                        </button>
                      </DrawerTrigger>
                      <DrawerContent className="rounded-t-3xl border-0 bg-[#f7faf8] shadow-[0_-8px_30px_rgba(0,61,37,0.12)]">
                        <DrawerTitle className="sr-only">Attach</DrawerTitle>
                        <div className="px-6 pt-1 text-center">
                        <p className="text-sm font-bold text-[#003D25] tracking-tight">Share with VIP Life</p>
                        <p className="mt-0.5 text-[11px] text-slate-500 tracking-wide">Choose a photo or take a new one</p>
                         </div>
                        <div className="px-6 pt-5 pb-8 grid grid-cols-2 gap-6 max-w-xs mx-auto w-full">
                          {[
                            { label: "Gallery", icon: Images, bg: "bg-[#DFF7E8]", fg: "text-[#006B3F]", onClick: () => { setAttachOpen(false); galleryInputRef.current?.click(); } },
                            { label: "Camera", icon: Camera, bg: "bg-[#DFF7E8]", fg: "text-[#006B3F]", onClick: () => { setAttachOpen(false); cameraInputRef.current?.click(); } },
                          ].map(({ label, icon: Icon, bg, fg, onClick }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={onClick}
                              className="flex flex-col items-center gap-1.5"
                            >
                             <span className={`h-14 w-14 rounded-2xl border border-[#19D66B]/20 shadow-[0_4px_12px_rgba(0,61,37,0.08)] flex items-center justify-center ${bg} transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_6px_16px_rgba(25,214,107,0.18)]}`}>
                                <Icon className={`h-7 w-7 ${fg}`} strokeWidth={2.2} />
                              </span>
                              <span className="text-[11px] font-semibold text-[#003D25] tracking-wide">{label}</span>
                            </button>
                          ))}
                        </div>
                      </DrawerContent>
                    </Drawer>
                  </div>

                )}

                <button
                  type="button"
                  onClick={() => {
                    if (recording) return stopAndSendRecording();
                    if (text.trim()) return send();
                    return startRecording();
                  }}
                   disabled={busy}
                    className={`h-[56px] w-[56px] shrink-0 rounded-full text-white flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] disabled:opacity-60 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_0_20px_rgba(25,214,107,0.32)] ${
                    recording ? "bg-red-500 hover:bg-red-600" : "bg-[#006B3F] hover:bg-[#007A48] active:bg-[#005A35] shadow-[0_0_16px_rgba(25,214,107,0.25)]"
                  }`}
                  aria-label={recording ? "Send voice message" : text.trim() ? "Send" : "Record voice"}
                >
                  {busy ? (
                    <Loader2 className="h-7 w-7 animate-spin" />
                  ) : recording || text.trim() ? (
                    <Send className="h-7 w-7" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>
              </div>

            </>
            ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-[#edf0e4]">
              <div className="flex flex-col items-center text-center px-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#DFF7E8] via-[#EAFBF0] to-white border border-[#19D66B]/30 shadow-[0_8px_30px_rgba(25,214,107,0.12)] flex items-center justify-center mb-4">
                  <MessageCircle className="h-9 w-9 text-[#006B3F]" strokeWidth={1.8} />
                </div>

                <h3 className="text-lg font-bold text-[#003D25]">
                  Your Messages
                </h3>

                <p className="mt-1 text-sm text-slate-500 max-w-xs">
                  Select a conversation to start chatting with someone.
                </p>

                <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-[#006B3F]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19D66B]" />
                  VIP Life Messages
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

function Avatar({ p, size }: { p: Profile | undefined; size?: string }) {
  const name = p?.display_name ?? p?.username ?? "U";
  return (
    <div className={`shrink-0 rounded-full bg-gradient-to-br from-[#19D66B] via-[#006B3F] to-[#003D25] flex items-center justify-center text-white font-bold overflow-hidden ${size ?? "h-10 w-10 text-sm"}`}>
      {p?.avatar_url ? (
        <img
          src={p.avatar_url}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        name[0]?.toUpperCase()
      )}
    </div>
  );
}

function MessageAttachment({
  path,
  messageId,
  onDeleted,
}: {
  path: string;
  messageId: string;
  onDeleted: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.storage
        .from("message-media")
        .createSignedUrl(path, 3600);
      if (!alive) return;
      if (error || !data?.signedUrl) setErr(true);
      else setUrl(data.signedUrl);
    })();
    return () => {
      alive = false;
    };
  }, [path]);

  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const fname = path.split("/").pop()?.toLowerCase() ?? "";
  const isVoice = fname.startsWith("voice-");
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(ext);
  const isAudio = isVoice || ["mp3", "wav", "m4a", "ogg", "oga", "weba"].includes(ext);
  const isVideo = !isAudio && ["mp4", "webm", "mov", "m4v"].includes(ext);

  const blobToBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const downloadFile = async () => {
    if (!url) {
      toast.error("Image not ready yet");
      return;
    }
    const filename = (fname || `image-${Date.now()}.${ext || "jpg"}`).replace(/[^a-z0-9._-]/gi, "-");
    try {
      const { data: signedDownload } = await supabase.storage
        .from("message-media")
        .createSignedUrl(path, 120, { download: filename });
      const downloadUrl = signedDownload?.signedUrl || url;
      const res = await fetch(downloadUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const file = new File([blob], filename, {
        type: blob.type || `image/${ext === "jpg" ? "jpeg" : ext || "jpeg"}`,
      });

      if (Capacitor.isNativePlatform()) {
        const [{ Filesystem, Directory }, { Share }] = await Promise.all([
          import("@capacitor/filesystem"),
          import("@capacitor/share"),
        ]);
        const base64 = await blobToBase64(blob);
        const cachePath = `downloads/${Date.now()}-${filename}`;
        await Filesystem.writeFile({
          path: cachePath,
          data: base64,
          directory: Directory.Cache,
          recursive: true,
        });
        const { uri } = await Filesystem.getUri({ path: cachePath, directory: Directory.Cache });
        await Share.share({
          title: filename,
          text: "Save image",
          files: [uri],
          url: uri,
          dialogTitle: "Save image",
        });
        return;
      }

      const mobileWeb = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const webShare = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      const sharePayload = { files: [file], title: filename, text: "Save image" } as ShareData;
      if (mobileWeb && webShare.share && webShare.canShare?.(sharePayload)) {
        await webShare.share(sharePayload);
        return;
      }

      // Web — trigger anchor download
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
      toast.success("Download started");
    } catch {
      // Last-resort fallback: open a signed attachment URL so the browser can save it.
      try {
        const { data: fallbackDownload } = await supabase.storage
          .from("message-media")
          .createSignedUrl(path, 120, { download: filename });
        window.open(fallbackDownload?.signedUrl || url, "_blank", "noopener,noreferrer");
      } catch {
        toast.error("Download failed");
      }
    }
  };

  const deleteMessage = async () => {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) toast.error("Couldn't delete");
    else {
      onDeleted();
      toast.success("Deleted");
    }
  };

  const startPress = () => {
    longPressed.current = false;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      try {
        if ("vibrate" in navigator) navigator.vibrate(15);
      } catch {}
      setMenuOpen(true);
    }, 450);
  };
  const clearPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  if (err) return <span className="italic opacity-70">Attachment unavailable</span>;
  if (!url) return <span className="italic opacity-70">Loading attachment…</span>;

  if (isImage)
    return (
      <>
        <button
          type="button"
          className="media-actions block max-w-full rounded-lg cursor-zoom-in select-none overflow-hidden touch-manipulation"
          onClick={() => {
            if (longPressed.current) {
              longPressed.current = false;
              return;
            }
            setOpen(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
          onTouchStart={startPress}
          onTouchEnd={clearPress}
          onTouchMove={clearPress}
          onTouchCancel={clearPress}
          aria-label="Open image"
        >
          <img
            src={url}
            alt="attachment"
            loading="lazy"
            draggable={false}
            className="block max-w-full max-h-64 rounded-lg select-none"
          />
        </button>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[300] bg-black/90 flex items-center justify-center p-4"
          >
            <div className="media-actions max-w-full max-h-full touch-manipulation">
              <img
                src={url}
                alt="attachment full size"
                draggable={false}
                className="max-w-full max-h-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(true);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  startPress();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  clearPress();
                }}
                onTouchMove={(e) => {
                  e.stopPropagation();
                  clearPress();
                }}
                onTouchCancel={(e) => {
                  e.stopPropagation();
                  clearPress();
                }}
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="absolute top-4 right-4 text-white text-2xl leading-none w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void downloadFile();
              }}
              className="absolute bottom-4 right-4 text-white text-sm px-4 py-2 rounded-full bg-black/50 hover:bg-black/70"
            >
              Download
            </button>
          </div>
        )}
        {menuOpen && (
          <div
            className="fixed inset-0 z-[400] bg-black/60 flex items-end sm:items-center justify-center"
            onClick={() => setMenuOpen(false)}
          >
            <div
              className="w-full sm:w-80 bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void downloadFile();
                }}
                className="w-full px-5 py-4 text-left text-sm font-semibold border-b border-slate-100 active:bg-slate-100 text-slate-800"
              >
                Download
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  void deleteMessage();
                }}
                className="w-full px-5 py-4 text-left text-sm font-semibold border-b border-slate-100 active:bg-slate-100 text-rose-600"
              >
                Delete
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full py-3 text-sm font-semibold text-slate-600 active:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </>
    );
  if (isVideo) return <video src={url} controls className="max-w-full max-h-64 rounded-lg" />;
  if (isAudio) return <audio src={url} controls className="max-w-full" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
      Open attachment
    </a>
  );
}

