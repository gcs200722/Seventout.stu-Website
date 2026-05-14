"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { clearStoredTokens, setStoredTokens, AUTH_TOKENS_CHANGED_EVENT } from "@/lib/auth-storage";
import { mergeGuestCartAfterLogin } from "@/lib/cart-api";

const errorMessages: Record<string, string> = {
  oauth_failed: "Đăng nhập Google thất bại. Vui lòng thử lại.",
};

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusMessage = useMemo(() => {
    const error = searchParams.get("error");
    if (error) {
      return errorMessages[error] ?? "Không thể hoàn tất đăng nhập Google.";
    }
    return "Đang hoàn tất đăng nhập Google...";
  }, [searchParams]);

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error || !accessToken || !refreshToken) {
      clearStoredTokens();
      router.replace("/?auth_error=google");
      return;
    }

    setStoredTokens({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    window.dispatchEvent(new Event(AUTH_TOKENS_CHANGED_EVENT));
    void (async () => {
      try {
        await mergeGuestCartAfterLogin();
      } catch {
        /* ignore */
      }
      router.replace("/");
    })();
  }, [router, searchParams]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center px-4 text-center">
      <p className="text-sm text-stone-600">{statusMessage}</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <main className="mx-auto flex min-h-[50vh] w-full items-center justify-center">
      <Suspense fallback={<p className="text-sm text-stone-600">Đang hoàn tất đăng nhập Google...</p>}>
        <GoogleCallbackContent />
      </Suspense>
    </main>
  );
}
