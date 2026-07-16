import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, created_at")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const combinedUser = {
      ...authUser,
      ...(profile ?? {}),
      email: profile?.email || authUser.email,
    };

    setUser(combinedUser);

    return combinedUser;
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeAuth() {
      setIsLoadingAuth(true);
      setAuthError(null);

      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        setSession(currentSession);
        await loadProfile(currentSession?.user ?? null);
      } catch (error) {
        console.error("Authentication initialization failed:", error);

        if (active) {
          setSession(null);
          setUser(null);
          setAuthError(error);
        }
      } finally {
        if (active) {
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
      }
    }

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
        setIsLoadingAuth(true);

        try {
          await loadProfile(nextSession?.user ?? null);
          setAuthError(null);
        } catch (error) {
          console.error("Unable to load user profile:", error);
          setAuthError(error);
        } finally {
          if (active) {
            setIsLoadingAuth(false);
            setAuthChecked(true);
          }
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email, password) => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      throw error;
    }

    return data;
  };

  const signUp = async ({
    email,
    password,
    fullName,
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const signInWithGoogle = async () => {
    const redirectTo =
      `${window.location.origin}${import.meta.env.BASE_URL}`;

    const { data, error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

    if (error) {
      throw error;
    }

    return data;
  };

  const resetPassword = async (email) => {
    const redirectTo =
      `${window.location.origin}${import.meta.env.BASE_URL}#/reset-password`;

    const { data, error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo,
        }
      );

    if (error) {
      throw error;
    }

    return data;
  };

  const updatePassword = async (password) => {
    const { data, error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      throw error;
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(session?.user),
      isLoadingAuth,
      authChecked,
      authError,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
    }),
    [
      session,
      user,
      isLoadingAuth,
      authChecked,
      authError,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
