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

// Chaque profil est un vrai compte Supabase (ID généré + mot de passe choisi
// à la création — voir GroupsService.createAccountWithId), pas une session
// anonyme : l'auth anonyme a été abandonnée après un bug RLS 42501 jamais
// élucidé (auth.uid() ne matchait jamais created_by malgré une session
// anonyme apparemment valide côté client). On ne crée donc plus de session
// ici automatiquement — soit il y en a déjà une (restaurée depuis
// AsyncStorage par le client au démarrage), soit l'utilisateur doit se
// (re)connecter via Login/ProfileSetup.
let ensureSessionPromise = null;

export const ensureSupabaseSession = () => {
  if (!ensureSessionPromise) {
    ensureSessionPromise = (async () => {
      const {data} = await supabase.auth.getSession();
      if (!data?.session) {
        ensureSessionPromise = null;
        throw new Error('Session expirée — reconnecte-toi.');
      }
      return data.session;
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
