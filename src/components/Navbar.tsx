import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, User, Settings, Calendar, BarChart3, Info, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import AboutModal from "@/components/AboutModal";

const Navbar = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-border/50 glass shadow-lg shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="container mx-auto flex items-center justify-between px-4 py-0 relative">
        <Link to="/" className="flex items-center group">
          <div className="relative flex h-20 w-20 md:h-28 md:w-28 items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 to-emerald-700/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
            <img src="/images/logo.png" alt="Refik Keşif ve İnşa" className="h-20 w-20 md:h-28 md:w-28 relative drop-shadow-lg object-contain" />
          </div>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            onClick={() => {
              if (window.location.pathname === '/') {
                document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
                setTimeout(() => document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
              }
            }}
            className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 rounded-lg hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 group flex items-center gap-2"
          >
            <span className="text-muted-foreground group-hover:text-accent transition-colors"><Calendar className="h-4 w-4" /></span>
            Etkinlikler
            <span className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </button>
          <NavItem to="/raporlar" label="Raporlar" icon={<BarChart3 className="h-4 w-4" />} />
          <button className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 rounded-lg hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 group flex items-center gap-2" onClick={() => setAboutOpen(true)}>
            <Info className="h-4 w-4" />
            Hakkımızda
            <span className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </button>
          
          <div className="ml-3 h-5 w-px bg-gradient-to-b from-border via-border to-transparent" />
          
          {user ? (
            <div className="ml-3 flex items-center gap-3" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 rounded-full px-3 py-2 hover:bg-gradient-to-r hover:from-primary/10 hover:to-accent/10 transition-all duration-200 group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-primary to-emerald-600 text-white text-xs font-bold ring-2 ring-amber-400/30 transition-all group-hover:ring-amber-400/60 group-hover:scale-110">
                  {profile?.first_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-foreground leading-tight">
                    {profile?.first_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.last_name}
                  </span>
                </div>
              </button>

              {dropdownOpen && (
                <div className="absolute top-16 right-4 z-50 min-w-[220px] rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl shadow-primary/20 py-2 animate-fade-in overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hesabım</p>
                  </div>
                  <button
                    onClick={() => { navigate("/profil"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all group"
                  >
                    <User className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                    <span>Profili Düzenle</span>
                  </button>
                  <button
                    onClick={() => { navigate("/profil?tab=reminders"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all group"
                  >
                    <Settings className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                    <span>Hatırlatıcılar</span>
                  </button>
                  {isAdmin && (
                    <>
                      <div className="my-2 h-px bg-border/30" />
                      <button
                        onClick={() => { navigate("/yonetim"); setDropdownOpen(false); }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all group"
                      >
                        <Shield className="h-4 w-4 text-primary/60 group-hover:text-primary transition-colors" />
                        <span>Yönetim</span>
                      </button>
                    </>
                  )}
                  <div className="my-2 h-px bg-border/30" />
                  <button
                    onClick={() => { handleSignOut(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-all group"
                  >
                    <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="ml-3 flex gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300 rounded-lg" onClick={() => navigate("/giris")}>
                Giriş Yap
              </Button>
              <Button size="sm" className="rounded-lg" onClick={() => navigate("/kayit")}>
                Kayıt Ol
              </Button>
            </div>
          )}
        </div>

        {/* Mobile: show nav links inline next to logo */}
        <div className="flex md:hidden items-center gap-1">
          <button
            className="px-2 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-primary/10 whitespace-nowrap"
            onClick={() => {
              if (window.location.pathname === '/') {
                document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' });
              } else {
                navigate('/');
                setTimeout(() => document.querySelector('#events-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
              }
            }}
          >
            Etkinlikler
          </button>
          <button
            className="px-2 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-primary/10 whitespace-nowrap"
            onClick={() => navigate("/raporlar")}
          >
            Raporlar
          </button>
          <button
            className="px-2 py-1.5 rounded-md text-xs font-semibold text-foreground hover:bg-primary/10 whitespace-nowrap"
            onClick={() => setAboutOpen(true)}
          >
            Hakkımızda
          </button>
          {user ? (
            <div className="relative ml-auto flex-shrink-0" ref={mobileDropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-primary to-emerald-600 text-white text-xs font-bold ring-2 ring-amber-400/30"
              >
                {profile?.first_name?.[0]?.toUpperCase() || "U"}
              </button>
              {dropdownOpen && (
                <div className="absolute top-10 right-0 z-50 min-w-[180px] rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl shadow-primary/20 py-2 overflow-hidden">
                  <button
                    onClick={() => { navigate("/profil"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                  >
                    <User className="h-4 w-4 text-primary/70" />
                    <span>Profili Düzenle</span>
                  </button>
                  <button
                    onClick={() => { navigate("/profil?tab=reminders"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                  >
                    <Settings className="h-4 w-4 text-primary/70" />
                    <span>Hatırlatıcılar</span>
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => { navigate("/yonetim"); setDropdownOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                    >
                      <Shield className="h-4 w-4 text-primary/70" />
                      <span>Yönetim</span>
                    </button>
                  )}
                  <div className="my-1 h-px bg-border/30" />
                  <button
                    onClick={() => { handleSignOut(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative ml-auto flex-shrink-0" ref={mobileDropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 via-primary to-emerald-600 text-white text-xs font-bold ring-2 ring-amber-400/30"
              >
                <User className="h-4 w-4" />
              </button>
              {dropdownOpen && (
                <div className="absolute top-10 right-0 z-50 min-w-[160px] rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-xl shadow-primary/20 py-2 overflow-hidden">
                  <button
                    onClick={() => { navigate("/giris"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                  >
                    <User className="h-4 w-4 text-primary/70" />
                    <span>Giriş Yap</span>
                  </button>
                  <div className="my-1 h-px bg-border/30" />
                  <button
                    onClick={() => { navigate("/kayit"); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5"
                  >
                    <Calendar className="h-4 w-4 text-primary/70" />
                    <span>Kayıt Ol</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </nav>
    <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
};

const NavItem = ({ to, label, icon }: { to: string; label: string; icon?: React.ReactNode }) => (
  <Link
    to={to}
    className="relative px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 rounded-lg hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 group flex items-center gap-2"
  >
    {icon && <span className="text-muted-foreground group-hover:text-accent transition-colors">{icon}</span>}
    {label}
    <span className="absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
  </Link>
);

const MobileNavItem = ({ to, label, icon, onClick }: { to: string; label: string; icon?: React.ReactNode; onClick: () => void }) => (
  <Link
    to={to}
    className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all flex items-center gap-2"
    onClick={onClick}
  >
    {icon && <span>{icon}</span>}
    {label}
  </Link>
);

export default Navbar;
