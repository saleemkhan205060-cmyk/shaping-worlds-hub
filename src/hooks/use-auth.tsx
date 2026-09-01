  // Absolute safety net: whatever happens to storage or the network, the app
  // must stop showing the startup spinner and become interactive.
  const loadingFallbackRevision = authRevision;
  window.setTimeout(() => {
    if (authRevision === loadingFallbackRevision && authState.loading) {
      publishAuthState({ session: null, user: null, loading: false });
    }
  }, AUTH_REQUEST_TIMEOUT_MS + 2_000);

  const initializationRevision = authRevision;

  withAuthTimeout(
    supabase.auth.getSession(),
    "Auth session initialization timed out",
  )
    .then(({ data, error }) => {
      if (error) throw error;

      // An auth event may complete while this initial storage read is pending.
      // Never let the older result overwrite a newer SIGNED_IN/USER_UPDATED event.
      if (authRevision !== initializationRevision) return;

      if (data.session) {
        persistSession(data.session);
        publishAuthState({
          session: data.session,
          user: data.session.user,
          loading: false,
        });
        return;
      }

      return withAuthTimeout(
        restorePersistedSessionOnce(),
        "Auth session restore timed out",
      ).then((restored) => {
        if (authRevision !== initializationRevision) return;

        publishAuthState({
          session: restored,
          user: restored?.user ?? null,
          loading: false,
        });
      });
    })
    .catch(async (error) => {
      if (authRevision !== initializationRevision) return;

      if (isInvalidRefreshSession(error)) {
        await clearBrokenLocalSession();

        try {
          const restored = await withAuthTimeout(
            restorePersistedSessionOnce(),
            "Auth session restore timed out",
          );

          if (authRevision !== initializationRevision) return;

          if (restored) {
            publishAuthState({
              session: restored,
              user: restored.user,
              loading: false,
            });
            return;
          }
        } catch (restoreError) {
          console.error("Auth session restore failed:", restoreError);
        }
      } else {
        console.error("Auth session load failed:", error);
      }

      publishAuthState({
        session: null,
        user: null,
        loading: false,
      });
    });
