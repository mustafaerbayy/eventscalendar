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

  const updateProfileFromGoogleIfNeeded = async (userId: string, user: User) => {
    try {
      // Check if user has Google identity
      const googleIdentity = user.identities?.find(i => i.provider === 'google');
      
      if (!googleIdentity) {
        console.log("No Google identity found");
        return;
      }

      console.log("Full user object:", user);
      console.log("raw_user_meta_data:", user.raw_user_meta_data);
      console.log("user_metadata:", user.user_metadata);
      console.log("Google identity:", googleIdentity);

      // Get current profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      console.log("Current profile:", profile);

      // If first_name and last_name are empty, extract from Google data
      if (profile && (profile.first_name === '' || profile.last_name === '')) {
        let firstName = profile.first_name || '';
        let lastName = profile.last_name || '';

        // Extract from Google OAuth metadata - try multiple locations
        let firstName_google = '';
        let lastName_google = '';
        let fullName = '';

        // Try raw_user_meta_data
        if (user.raw_user_meta_data) {
          firstName_google = user.raw_user_meta_data?.given_name || '';
          lastName_google = user.raw_user_meta_data?.family_name || '';
          fullName = user.raw_user_meta_data?.name || '';
        }

        // Try user_metadata
        if (!firstName_google && user.user_metadata) {
          firstName_google = user.user_metadata?.given_name || '';
          lastName_google = user.user_metadata?.family_name || '';
          fullName = user.user_metadata?.name || '';
        }

        // Try identity metadata
        if (!firstName_google && googleIdentity.identity_data) {
          firstName_google = googleIdentity.identity_data?.given_name || '';
          lastName_google = googleIdentity.identity_data?.family_name || '';
          fullName = googleIdentity.identity_data?.name || '';
        }

        console.log("Extracted Google data - given_name:", firstName_google, "family_name:", lastName_google, "name:", fullName);

        // Use Google data if we have it
        if (!firstName && firstName_google) {
          firstName = firstName_google;
        }
        if (!lastName && lastName_google) {
          lastName = lastName_google;
        }

        // If names are still empty, try to split the full name
        if ((!firstName || !lastName) && fullName) {
          const nameParts = fullName.trim().split(' ');
          if (!firstName && nameParts.length > 0) {
            firstName = nameParts[0];
          }
          if (!lastName && nameParts.length > 1) {
            lastName = nameParts.slice(1).join(' ');
          }
        }

        console.log("Final names to update - firstName:", firstName, "lastName:", lastName);

        // Update profile if we have names to update
        if (firstName || lastName) {
          const { error } = await supabase
            .from("profiles")
            .update({
              first_name: firstName,
              last_name: lastName,
            })
            .eq("id", userId);

          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Profile updated successfully");
            // Refresh profile to reflect changes
            await fetchProfile(userId);
          }
        } else {
          console.log("No names to update");
        }
      } else {
        console.log("Profile already has names or doesn't exist");
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
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
