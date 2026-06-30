
CREATE OR REPLACE FUNCTION public.classify_risky_text(_t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text := lower(coalesce(_t,''));
  url_match text;
  host text;
  trusted text[] := ARRAY[
    'youtube.com','youtu.be','m.youtube.com',
    'instagram.com','www.instagram.com',
    'facebook.com','www.facebook.com','fb.com','m.facebook.com',
    'twitter.com','x.com','www.twitter.com','www.x.com',
    'tiktok.com','www.tiktok.com',
    'wikipedia.org','en.wikipedia.org',
    'google.com','www.google.com',
    'viplifes.com','www.viplifes.com',
    'lovable.app','vip-life.lovable.app'
  ];
  bad_shorteners text[] := ARRAY[
    'bit.ly','tinyurl.com','cutt.ly','is.gd','rebrand.ly',
    'shorturl.at','ow.ly','t.co','buff.ly','rb.gy','s.id',
    't.me','wa.me','chat.whatsapp.com'
  ];
  bad_tlds text[] := ARRAY['.xyz','.top','.click','.work','.loan','.country','.gq','.tk','.ml','.cf','.zip','.mov'];
  tld text;
BEGIN
  IF s = '' THEN RETURN NULL; END IF;

  -- Phase 1 patterns
  IF s ~ '(elon\s*musk|elonmusk|mr\.?\s*beast|mrbeast|cristiano\s*ronaldo|leo\s*messi|messi\s*official|imran\s*khan\s*(official|pti)|narendra\s*modi|bill\s*gates|jeff\s*bezos|mark\s*zuckerberg|donald\s*trump)'
  THEN RETURN 'impersonation'; END IF;

  IF s ~ '(bitcoin|\bbtc\b|\busdt\b|\beth\b|crypto|forex|binary\s*option|double\s*your\s*money|guaranteed\s*(profit|return)|investment\s*plan|trading\s*signal)'
  THEN RETURN 'scam_keywords'; END IF;

  IF s ~ '(whats\s*app|whatsapp|wa\.me|telegram|t\.me|gmail|contact\s*me|dm\s*me|inbox\s*me).{0,60}(invest|signal|profit|trade|crypto|earn|withdraw|bonus)'
  THEN RETURN 'contact_scam'; END IF;

  -- Phase 2: URL scanning. First try explicit http(s) URL.
  url_match := (regexp_match(s, '(https?://[^\s]+)'))[1];
  IF url_match IS NULL THEN
    -- bare domain like example.com or sub.example.co
    url_match := (regexp_match(s, '(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,})'))[1];
  END IF;

  IF url_match IS NOT NULL THEN
    host := regexp_replace(url_match, '^https?://', '');
    host := split_part(host, '/', 1);
    host := split_part(host, '?', 1);
    host := split_part(host, '#', 1);
    host := trim(both '.' from host);
    host := trim(host);

    IF host <> '' THEN
      IF host = ANY(bad_shorteners) THEN
        RETURN 'suspicious_link';
      END IF;

      FOREACH tld IN ARRAY bad_tlds LOOP
        IF host LIKE '%' || tld THEN
          RETURN 'suspicious_link';
        END IF;
      END LOOP;

      IF host ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' THEN
        RETURN 'suspicious_link';
      END IF;

      IF host = ANY(trusted) THEN
        RETURN NULL;
      END IF;
      FOREACH tld IN ARRAY trusted LOOP
        IF host LIKE '%.' || tld THEN
          RETURN NULL;
        END IF;
      END LOOP;

      RETURN 'external_link';
    END IF;
  END IF;

  RETURN NULL;
END $$;
