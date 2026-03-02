// Supabase ve diğer hata mesajlarını kullanıcı dostu Türkçe mesajlara çevirir
export const getErrorMessage = (error: any): string => {
  if (!error) return "Bir hata oluştu.";

  const message = error.message || error.error_description || error.msg || "";
  const code = error.code || error.status;

  // Supabase Auth hataları
  if (message.includes("Invalid login credentials") || message.includes("invalid_grant")) {
    return "E-posta veya şifre hatalı. Lütfen tekrar deneyin.";
  }

  if (message.includes("Email not confirmed")) {
    return "E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı kontrol edin.";
  }

  if (message.includes("User already registered")) {
    return "Bu e-posta adresi zaten kayıtlı.";
  }

  if (message.includes("Password should be at least")) {
    return "Şifre en az 6 karakter olmalıdır.";
  }

  if (message.includes("Unable to validate email address")) {
    return "Geçersiz e-posta adresi.";
  }

  if (message.includes("signup_disabled") || message.includes("Signups not allowed")) {
    return "Şu anda yeni kayıtlar kabul edilmiyor.";
  }

  if (message.includes("Email rate limit exceeded")) {
    return "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.";
  }

  if (message.includes("invalid_credentials") || message.includes("Invalid email or password")) {
    return "Giriş bilgileri hatalı.";
  }

  if (message.includes("not authorized") || message.includes("unauthorized") || code === 401) {
    return "Bu işlem için yetkiniz bulunmuyor.";
  }

  if (message.includes("not found") || code === 404) {
    return "Aradığınız sayfa veya kayıt bulunamadı.";
  }

  if (message.includes("Network request failed") || message.includes("fetch")) {
    return "Bağlantı hatası. İnternet bağlantınızı kontrol edin.";
  }

  if (message.includes("timeout")) {
    return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
  }

  if (code === 500 || message.includes("Internal server error")) {
    return "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
  }

  if (message.includes("weak password") || message.includes("password is too weak")) {
    return "Şifreniz çok zayıf. Lütfen daha güçlü bir şifre seçin.";
  }

  if (message.includes("User not found")) {
    return "Kullanıcı bulunamadı.";
  }

  if (message.includes("Same password")) {
    return "Yeni şifre eski şifrenizle aynı olamaz.";
  }

  if (message.includes("session_expired") || message.includes("refresh_token_not_found")) {
    return "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.";
  }

  // Genel hata mesajı
  if (message) {
    return `Bir hata oluştu: ${message}`;
  }

  return "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.";
};
