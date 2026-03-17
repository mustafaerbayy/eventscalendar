import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export const NotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );

  const [isSecure, setIsSecure] = useState(true);

  useEffect(() => {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isHttps = window.location.protocol === "https:";
    setIsSecure(isHttps || isLocalhost);
  }, []);

  const requestPermission = async () => {
    if (!isSecure) {
      toast.error("Bildirimler için güvenli bağlantı (HTTPS) gereklidir. Mobil cihazlarda HTTP üzerinden bildirim açılamaz.", {
        duration: 5000
      });
      return;
    }

    if (!("Notification" in window)) {
      toast.error("Bu tarayıcı bildirimleri desteklemiyor.");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      toast.success("Bildirimler başarıyla açıldı! 🎉");
      new Notification("Refik Keşif ve İnşâ", {
        body: "Bildirim izni doğrulandı. Artık güncellemeleri alabileceksiniz!",
        icon: "/images/logo.png"
      });
    } else if (result === "denied") {
      toast.error("Bildirim izni reddedildi. iPhone Ayarlar > Bildirimler > Refik kısmından açmanız gerekebilir.");
    }
  };

  if (permission === "granted") return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-in slide-in-from-bottom-5">
      <Button 
        onClick={requestPermission}
        className={`font-bold rounded-2xl shadow-2xl flex items-center gap-3 px-6 h-14 ${
          isSecure ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}
      >
        <Bell className={`w-5 h-5 ${isSecure ? "animate-bounce" : ""}`} />
        {isSecure ? "Bildirimleri Aktifleştir" : "Bağlantı Güvensiz (Bildirim Açılamaz)"}
      </Button>
    </div>
  );
};
