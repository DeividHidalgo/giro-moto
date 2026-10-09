// Copy to config.js and fill in. The publishable (anon) key is meant to be public;
// data is protected by the Row Level Security policies in sql/schema.sql.
window.GIRO_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_KEY: "YOUR-PUBLISHABLE-KEY",
  // Usernames are mapped to e-mails using Gmail-style plus addressing: you+username@gmail.com.
  // Use an address you own (Supabase rejects non-existent domains).
  EMAIL_BASE: "you@example.com"
};
