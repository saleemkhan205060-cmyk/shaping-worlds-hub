DROP POLICY IF EXISTS "Users delete own sent messages" ON public.messages;

CREATE POLICY "Conversation participants can delete messages"
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);