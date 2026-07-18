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

/**
 * Normalize profile roles so values such as:
 * "Barber", "BARBER", or " barber "
 * are consistently treated as "barber".
 */
function normalizeRole(role) {
  return role?.trim().toLowerCase() || "";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  // Supabase Auth user from auth.users
  const [user, setUser] = useState(null);

  // Application profile from public.profiles
  const [profile, setProfile] = useState(null);

  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  /**
   * Load the public.profiles row that matches
   * the authenticated Supabase Auth user's UUID.
   *
   * auth.users.id === public.profiles.id
   */
  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      return null;
    }

    // Always keep the authenticated Supabase user available.
    setUser(authUser);

    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          phone,
          role,
          created_at
        `
      )
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Unable to load user profile:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });

      throw error;
    }

    /**
     * If the authenticated user does not have a profile row,
     * keep profile as null.
     *
     * This prevents accidentally granting a role that does
     * not exist in public.profiles.
     */
    if (!data) {
      console.warn(
        "No public.profiles row was found for authenticated user:",
        authUser.id
      );

      setProfile(null);
      return null;
    }

    const normalizedProfile = {
      ...data,
      role: normalizeRole(data.role),
    };

    setProfile(normalizedProfile);

    return normalizedProfile;
  }, []);

  /**
   * Initialize authentication when the app first loads.
   */
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

        if (currentSession?.user) {
          await loadProfile(currentSession.user);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error(
          "Authentication initialization failed:",
          error
        );

        if (active) {
          setSession(null);
          setUser(null);
          setProfile(null);
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

    /**
     * Listen for:
     * - sign in
     * - sign out
     * - token refresh
     * - OAuth authentication changes
     */
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
          if (nextSession?.user) {
            await loadProfile(nextSession.user);
          } else {
            setUser(null);
            setProfile(null);
          }

          if (active) {
            setAuthError(null);
          }
        } catch (error) {
          console.error(
            "Unable to load profile after authentication change:",
            error
          );

          if (active) {
            setProfile(null);
            setAuthError(error);
          }
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

  /**
   * Email/password sign in.
   */
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

  /**
   * Create a customer account.
   *
   * Barber accounts should continue to be created/managed
   * manually for now.
   *
   * Do not allow users to assign themselves the "barber"
   * or "admin" role from the signup form.
   */
  const signUp = async ({
    email,
    password,
    fullName,
  }) => {
    const { data, error } =
      await supabase.auth.signUp({
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

  /**
   * Sign in with Google.
   */
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

  /**
   * Send password reset email.
   */
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

  /**
   * Update the currently authenticated user's password.
   */
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

  /**
   * Sign out.
   *
   * Your navbar can navigate to "/" after this function
   * resolves so the user returns to the home page.
   */
  const signOut = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  /**
   * Reload the public.profiles row.
   *
   * Useful during development if you manually change
   * Samuel's role in Supabase.
   */
  const refreshProfile = useCallback(async () => {
    const authUser =
      session?.user ?? user;

    if (!authUser) {
      setProfile(null);
      return null;
    }

    return loadProfile(authUser);
  }, [loadProfile, session, user]);

  /**
   * Role helpers.
   */
  const role = normalizeRole(profile?.role);

  const isBarber =
    role === "barber" ||
    role === "admin";

  const isAdmin =
    role === "admin";

  /**
   * Keep the context object stable unless one of its
   * dependencies actually changes.
   */
  const value = useMemo(
    () => ({
      // Authentication
      session,
      user,
      profile,

      // Role information
      role,
      isBarber,
      isAdmin,

      // Authentication state
      isAuthenticated: Boolean(session?.user),
      isLoadingAuth,

      // Alias for components that use "loading"
      loading: isLoadingAuth,

      authChecked,
      authError,

      // Authentication actions
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      role,
      isBarber,
      isAdmin,
      isLoadingAuth,
      authChecked,
      authError,
      refreshProfile,
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
