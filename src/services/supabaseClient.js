import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://uzipsttfezyhyswxesze.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E3rxP4MCxq3Tw_2LGdGEWQ_sIaB82GH';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Chaque appareil devient un utilisateur "anonyme" Supabase — pas de compte,
// pas d'email, pas de mot de passe visible pour l'utilisateur, mais un vrai
// auth.uid() stable côté serveur qui permet d'écrire des règles RLS fiables
// (voir supabase/schema.sql). C'est ce qui remplace le "juste un nom" —
// le nom reste juste une étiquette d'affichage, l'identité réelle est cet id.
let ensureSessionPromise = null;

export const ensureSupabaseSession = () => {
  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const {data} = await supabase.auth.getSession();
      if (data?.session) {
        return data.session;
      }

      const {data: signInData, error} = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Supabase anonymous sign-in failed:', error);
        ensureSessionPromise = null;
        throw error;
      }
      return signInData.session;
    })();
  }
  return ensureSessionPromise;
};

export const getSupabaseUserId = async () => {
  const session = await ensureSupabaseSession();
  return session?.user?.id ?? null;
};

// À appeler après un signInWithPassword / updateUser réussi, pour que le
// cache de session (ensureSessionPromise) reflète immédiatement la nouvelle
// session plutôt que de renvoyer l'ancienne session anonyme mise en cache.
export const setSupabaseSession = (session) => {
  ensureSessionPromise = Promise.resolve(session);
};
