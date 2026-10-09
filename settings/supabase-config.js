
/* =========================================
   THE SYNDICATE
   SHARED SUPABASE CONFIGURATION
   ========================================= */

const SUPABASE_URL = "https://vjxbulbnozopbuzyxxob.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqeGJ1bGJub3pvcGJ1enl4eG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMTg0ODUsImV4cCI6MjEwNjg5NDQ4NX0.g91CnhZPOKdOsopg7gmv2ExXgen3g-ixXpJpITD9kq4";

// Shared database connection
window.syndicateDB = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
