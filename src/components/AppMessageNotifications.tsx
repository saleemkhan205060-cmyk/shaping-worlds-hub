import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  initBackgroundMessageNotifications,
  initNotificationSoundUnlock,
  playSoftChime,
  showNewMessageNotification,
} from "@/lib/notification-sound";
import { initNativePushNotifications } from "@/lib/push";

type MessagePayload = {
  id?: string;
  sender_id?: string;
  recipient_id?: string;
  content?: string | null;
};

type SenderProfile = {
  display_name: string | null;
  username: string | null;
};

function previewText(content?: string | null) {
  const text = (content ?? "").trim();
  if (!text) return "You received a new message";
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

export function AppMessageNotifications() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    initNotificationSoundUnlock();
  }, []);

  useEffect(() => {
    if (!userId) return;

    initNotificationSoundUnlock();
    initBackgroundMessageNotifications();
    void initNativePushNotifications(userId);

    const channel = supabase
      .channel(`app-message-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        async (payload) => {
          const message = payload.new as MessagePayload;
          if (message.sender_id === userId) return;


          playSoftChime(message.id);

          if (typeof document !== "undefined" && document.visibilityState === "visible") return;

          let senderName = "New message";
          if (message.sender_id) {
            const { data } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", message.sender_id)
              .maybeSingle();

            const profile = data as SenderProfile | null;
            senderName = profile?.display_name || profile?.username || senderName;
          }

          await showNewMessageNotification({
            title: senderName,
            body: previewText(message.content),
            tag: message.id ? `message-${message.id}` : "message-new",
            url: "/messages",
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}