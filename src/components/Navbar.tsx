import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, User, Settings, Calendar, BarChart3, Info, Shield, Search, MessageSquare, Wallet, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import AboutModal from "@/components/AboutModal";
import { NotificationsMenu } from "@/components/NotificationsMenu";
import { useTheme } from "@/contexts/ThemeContext";

const Navbar = () => {
  const { user, profile, isAdmin, hasBudgetRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) setScrolled(true);
    else setScrolled(false);
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickedDesktop = dropdownRef.current?.contains(e.target as Node);
      const clickedMobile = mobileDropdownRef.current?.contains(e.target as Node);
      if (!clickedDesktop && !clickedMobile) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-4 pointer-events-none">
        <motion.nav
          initial={false}
          animate={{
            width: scrolled ? "auto" : "100%",
            maxWidth: scrolled ? "800px" : "1400px",
            y: scrolled ? 10 : 0,
            borderRadius: scrolled ? "24px" : "16px",
            paddingLeft: scrolled ? "1.5rem" : "1.5rem",
            paddingRight: scrolled ? "1rem" : "1.5rem",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`
            mx-auto pointer-events-auto relative flex items-center justify-between h-16
            bg-background/80 backdrop-blur-lg border border-border/40
            shadow-md
            before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
            before:bg-gradient-to-r before:from-emerald-500/20 before:via-white/5 before:to-amber-500/20
            before:-z-10 overflow-visible
          `}
        >
          {/* Brand/Logo Section */}
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2 group shrink-0"
          >
            <motion.div
              animate={{ scale: scrolled ? 0.8 : 1 }}
              className="relative flex h-12 w-12 items-center justify-center transition-transform group-hover:scale-110"
            >
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src="/images/logo.png" alt="Logo" className="h-full w-full object-contain relative drop-shadow-emerald" />
            </motion.div>

          </Link>

          {/* Mobile Login Button (Centered) - Only for unauthenticated users */}
          {!user && (
            <div className="flex-1 flex justify-center md:hidden">
              <button
                onClick={() => navigate("/giris")}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-bold rounded-xl text-[11px] px-3 py-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] whitespace-nowrap"
              >
                <User className="w-3 h-3" />
                Giriş Yap / Kayıt Ol
              </button>
            </div>
          )}

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 mx-4">
            <Link
              to="/etkinlikler"
              className="px-4 py-2 text-sm font-bold text-foreground/70 hover:text-foreground transition-all flex items-center gap-2 rounded-xl hover:bg-foreground/5 relative group"
            >
              <Calendar className="h-4 w-4" />
              <span>Etkinlikler</span>
              <motion.div className="absolute inset-0 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              to="/raporlar"
              className="px-4 py-2 text-sm font-bold text-foreground/70 hover:text-foreground transition-all flex items-center gap-2 rounded-xl hover:bg-foreground/5 relative group"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Raporlar</span>
              <motion.div className="absolute inset-0 bg-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              to="/sosyal"
              className="px-4 py-2 text-sm font-bold text-foreground/70 hover:text-foreground transition-all flex items-center gap-2 rounded-xl hover:bg-foreground/5 relative group"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Fikir Meydanı</span>
              <motion.div className="absolute inset-0 bg-primary/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              to="/butce"
              className="px-4 py-2 text-sm font-bold text-emerald-400/90 hover:text-emerald-400 transition-all flex items-center gap-2 rounded-xl hover:bg-emerald-500/10 relative group"
            >
              <Wallet className="h-4 w-4" />
              <span>Bütçe</span>
              <motion.div className="absolute inset-0 bg-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* 
            <button
              onClick={() => setAboutOpen(true)}
              className="px-4 py-2 text-sm font-bold text-foreground/70 hover:text-foreground transition-all flex items-center gap-2 rounded-xl hover:bg-foreground/5 relative group"
            >
              <Info className="h-4 w-4" />
              <span>Biz Kimiz</span>
              <motion.div className="absolute inset-0 bg-amber-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            */}
          </div>

          {/* Action Bar / User Section */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-8 w-px bg-foreground/5 mx-1" />

            {/* Theme Toggle - Desktop only */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden md:flex items-center justify-center h-10 w-10 rounded-xl bg-foreground/5 border border-border/40 text-foreground/70 hover:text-foreground hover:bg-foreground/10 transition-all"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications Menu */}
            <NotificationsMenu />

            {/* Desktop-only User Section */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-3 select-none p-1 rounded-full bg-foreground/5 border border-border/40 hover:border-primary/50 transition-all duration-300 group"
                  >
                    <div className="relative h-8 w-8 rounded-full overflow-hidden bg-gradient-to-tr from-emerald-500 to-amber-500 p-[1px]">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-[10px] font-black text-foreground">
                        {profile?.first_name?.[0]?.toLocaleUpperCase('tr-TR') || "U"}
                      </div>
                    </div>
                    {!scrolled && (
                      <span className="text-xs font-bold text-foreground/90 pr-2 hidden lg:inline">
                        {profile?.first_name}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-3 w-56 rounded-2xl bg-background/95 backdrop-blur-lg border border-border shadow-2xl p-2 z-[200]"
                      >
                        <div className="px-3 py-2 mb-2 border-b border-border/40">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Panelim</p>
                        </div>
                        <DropdownItem onClick={() => { navigate("/profil"); setDropdownOpen(false); }} icon={<User className="h-4 w-4" />} label="Profil" />
                        {isAdmin && <DropdownItem onClick={() => { navigate("/yonetim"); setDropdownOpen(false); }} icon={<Shield className="h-4 w-4" />} label="Yönetim" isSpecial />}
                        <div className="my-2 h-px bg-foreground/5" />
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-3 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Çıkış Yap</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-foreground/70 hover:text-foreground font-bold rounded-xl"
                    onClick={() => navigate("/giris", { state: { from: location.pathname } })}
                  >
                    Giriş
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-black rounded-xl px-5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                    onClick={() => navigate("/kayit", { state: { from: location.pathname } })}
                  >
                    Kayıt
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 border border-border/40 text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.nav>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[150] md:hidden"
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-background border-l border-border/40 p-6 shadow-2xl flex flex-col overflow-y-auto pt-24">
              <MobileLink
                icon={<Calendar />}
                label="Etkinlikler"
                onClick={() => { navigate("/etkinlikler"); setMobileOpen(false); }}
              />
              <MobileLink icon={<BarChart3 />} label="Raporlar" onClick={() => { navigate("/raporlar"); setMobileOpen(false); }} />

              <MobileLink icon={<MessageSquare />} label="Fikir Meydanı" onClick={() => { navigate("/sosyal"); setMobileOpen(false); }} />

              <MobileLink icon={<Wallet />} label="Bütçe" onClick={() => { navigate("/butce"); setMobileOpen(false); }} />

              {/* <MobileLink icon={<Info />} label="Biz Kimiz" onClick={() => { setAboutOpen(true); setMobileOpen(false); }} /> */}

              {/* Theme Toggle - Mobile */}
              <div className="mt-6 mb-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-4 w-full p-4 rounded-2xl text-lg font-black text-foreground/70 hover:text-foreground hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/30"
                >
                  <div className="text-emerald-500">
                    {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
                  </div>
                  <span>{theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}</span>
                </button>
              </div>

              <div className="mt-auto pt-6 border-t border-border/40 space-y-4">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-foreground/5 border border-border/40 mb-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-black font-black">
                        {profile?.first_name?.[0]?.toLocaleUpperCase('tr-TR') || "U"}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-black text-foreground truncate">{profile?.first_name} {profile?.last_name}</span>
                        <span className="text-[10px] text-emerald-400/80 font-bold truncate">{user?.email}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        className="justify-start gap-2 border-border/40 font-bold rounded-xl text-xs h-10"
                        onClick={() => { navigate("/profil"); setMobileOpen(false); }}
                      >
                        <User className="h-3 w-3" /> Profil
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          className="justify-start gap-2 border-border/40 font-bold rounded-xl text-emerald-400 h-10 text-xs"
                          onClick={() => { navigate("/yonetim"); setMobileOpen(false); }}
                        >
                          <Shield className="h-4 w-4" /> Yönetim Paneli
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 font-bold text-red-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl"
                      onClick={() => { handleSignOut(); setMobileOpen(false); }}
                    >
                      <LogOut className="h-4 w-4" /> Çıkış Yap
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full font-bold border-border/20 rounded-xl py-6" onClick={() => navigate("/giris", { state: { from: location.pathname } })}>Giriş Yap</Button>
                    <Button className="w-full font-black bg-emerald-500 text-black rounded-xl py-6" onClick={() => navigate("/kayit", { state: { from: location.pathname } })}>Kayıt Ol</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
};

const DropdownItem = ({ onClick, icon, label, isSpecial }: { onClick: () => void; icon: React.ReactNode; label: string; isSpecial?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl transition-all group ${isSpecial ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
      }`}
  >
    <div className="transition-transform group-hover:scale-110">{icon}</div>
    <span>{label}</span>
  </button>
);

const MobileLink = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-4 w-full p-4 rounded-2xl text-lg font-black text-foreground/70 hover:text-foreground hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/30 mb-2"
  >
    <div className="text-emerald-500">{icon}</div>
    <span>{label}</span>
  </button>
);

export default Navbar;
