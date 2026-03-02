import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  reminder_2h: boolean;
  reminder_1d: boolean;
  reminder_2d: boolean;
  reminder_3d: boolean;
  reminder_1w: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
  };

  const checkAdmin = async (userId: string) => {
    try {
      // Check if user email is admin@admin.com
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === "admin@admin.com") {
        setIsAdmin(true);
        return;
      }
      
      const { data, error } = await supabase.rpc("has_role_text", {
        _user_id: userId,
        _role: "admin",
      });
      
      if (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
        return;
      }
      
      setIsAdmin(!!data);
    } catch (err) {
      console.error("Exception in checkAdmin:", err);
      setIsAdmin(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let initialized = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(async () => {
            await Promise.all([
              fetchProfile(currentUser.id),
              checkAdmin(currentUser.id),
            ]);
            if (initialized) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          if (initialized) setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialized = true;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await Promise.all([
          fetchProfile(currentUser.id),
          checkAdmin(currentUser.id),
        ]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
