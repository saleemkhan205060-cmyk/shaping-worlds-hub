import { useState } from "react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: string;
};

/**
 * Avatar <img> that gracefully handles broken/blocked sources.
 * - referrerPolicy="no-referrer" prevents Google (lh3.googleusercontent.com),
 *   Facebook, and other CDNs from rejecting hot-linked avatars.
 * - On load error we fall back to the user's initial so posts never show
 *   the browser's broken-image icon.
 */
export function AvatarImg({ src, alt = "", className, fallback }: Props) {
  const [errored, setErrored] = useState(false);
  const initial = (fallback ?? alt ?? "?").trim().charAt(0).toUpperCase() || "?";

  if (!src || errored) {
    return (
      <span className={`flex items-center justify-center text-white font-semibold ${className ?? ""}`}>
        {initial}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={() => setErrored(true)}
    />
  );
}
