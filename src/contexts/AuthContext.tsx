import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { formatName } from "@/lib/utils";


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
  hasBudgetRole: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  hasBudgetRole: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasBudgetRole, setHasBudgetRole] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (data) {
      const formattedFirst = formatName(data.first_name);
      const formattedLast = formatName(data.last_name);
      
      if (formattedFirst !== data.first_name || formattedLast !== data.last_name) {
        console.log("Automatically formatting names for user:", userId);
        const { data: updatedData, error } = await supabase
          .from("profiles")
          .update({ 
            first_name: formattedFirst, 
            last_name: formattedLast 
          })
          .eq("id", userId)
          .select()
          .single();
          
        if (!error && updatedData) {
          setProfile(updatedData);
        } else {
          setProfile(data);
        }
      } else {
        setProfile(data);
      }
    } else {
      setProfile(null);
    }
  };


  const updateProfileFromGoogleIfNeeded = async (userId: string, user: User) => {
    try {
      const googleIdentity = user.identities?.find(i => i.provider === 'google');
      
      // Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) {
        let firstName = profile.first_name || '';
        let lastName = profile.last_name || '';
        let needsUpdate = false;

        // If names are missing, try to extract from Google
        if ((firstName === '' || lastName === '') && googleIdentity) {
          let firstName_google = '';
          let lastName_google = '';
          let fullName = '';

          const userAny = user as any;
          if (userAny.raw_user_meta_data) {
            firstName_google = userAny.raw_user_meta_data?.given_name || '';
            lastName_google = userAny.raw_user_meta_data?.family_name || '';
            fullName = userAny.raw_user_meta_data?.name || '';
          }

          if (!firstName_google && user.user_metadata) {
            firstName_google = user.user_metadata?.given_name || '';
            lastName_google = user.user_metadata?.family_name || '';
            fullName = user.user_metadata?.name || '';
          }

          if (!firstName && firstName_google) firstName = firstName_google;
          if (!lastName && lastName_google) lastName = lastName_google;

          if ((!firstName || !lastName) && fullName) {
            const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
            if (nameParts.length >= 2) {
              if (!firstName) firstName = nameParts.slice(0, -1).join(' ');
              if (!lastName) lastName = nameParts[nameParts.length - 1];
            } else if (nameParts.length === 1 && !firstName) {
              firstName = nameParts[0];
            }
          }
          needsUpdate = true;
        }

        // Always format names
        const formattedFirst = formatName(firstName);
        const formattedLast = formatName(lastName);

        if (formattedFirst !== profile.first_name || formattedLast !== profile.last_name) {
          firstName = formattedFirst;
          lastName = formattedLast;
          needsUpdate = true;
        }

        if (needsUpdate && (firstName || lastName)) {
          const { error } = await supabase
            .from("profiles")
            .update({
              first_name: firstName,
              last_name: lastName,
            })
            .eq("id", userId);

          if (!error) {
            await fetchProfile(userId);
          }
        }
      }
    } catch (err) {
      console.error("Error updating profile from Google:", err);
    }
  };


  const checkAdmin = async (userId: string) => {
    try {
      // Check if user email is admin@admin.com
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === "admin@admin.com") {
        setIsAdmin(true);
        setHasBudgetRole(true);
        return;
      }
      
      const { data: adminData, error: adminError } = await supabase.rpc("has_role_text", {
        _user_id: userId,
        _role: "admin",
      });
      
      if (!adminError) {
        setIsAdmin(!!adminData);
      }

      const { data: budgetData, error: budgetError } = await supabase.rpc("has_role_text", {
        _user_id: userId,
        _role: "manage_budget",
      });
      
      if (!budgetError) {
        setHasBudgetRole(!!budgetData);
      } else {
        setHasBudgetRole(false);
      }
    } catch (err) {
      console.error("Exception in checkAdmin:", err);
      setIsAdmin(false);
      setHasBudgetRole(false);
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
            // For Google users on first sign-in, update profile with Google data
            if (event === 'SIGNED_IN') {
              await updateProfileFromGoogleIfNeeded(currentUser.id, currentUser);
            }
            await Promise.all([
              fetchProfile(currentUser.id),
              checkAdmin(currentUser.id),
            ]);
            if (initialized) setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setHasBudgetRole(false);
          if (initialized) setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      initialized = true;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // For Google users, update profile with Google data if needed
        await updateProfileFromGoogleIfNeeded(currentUser.id, currentUser);
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
    setHasBudgetRole(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, hasBudgetRole, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
