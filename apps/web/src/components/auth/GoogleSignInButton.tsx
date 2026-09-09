"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  mode?: "signin" | "signup";
  onError?: (msg: string) => void;
}

export default function GoogleSignInButton({
  mode = "signin",
  onError,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }

    const handleCredentialResponse = async (response: { credential: string }) => {
      if (!response.credential) {
        onError?.("Google authentication did not return credentials.");
        return;
      }

      setIsSubmitting(true);
      onError?.("");

      try {
        const res = await fetchApi("/auth/google/", {
          method: "POST",
          body: JSON.stringify({ credential: response.credential }),
        });

        localStorage.setItem("access_token", res.data.access_token);
        router.push("/dashboard");
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Google authentication failed. Please try again.");
        onError?.(error.message);
        setIsSubmitting(false);
      }
    };

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      buttonRef.current.innerHTML = "";
      const containerWidth = buttonRef.current.offsetWidth || 384;

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: mode === "signup" ? "signup_with" : "signin_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: containerWidth,
      });

      setIsSdkLoaded(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      // Keep script cached in head
    };
  }, [mode, onError, router]);

  return (
    <div className="w-full relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-20 bg-[#121218]/80 backdrop-blur-xs flex items-center justify-center rounded-xl border border-white/10">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400 mr-2" />
          <span className="text-xs text-gray-300 font-medium">
            Authenticating with Google...
          </span>
        </div>
      )}

      {/* Official Google Identity Services button container */}
      <div
        ref={buttonRef}
        className="w-full min-h-[44px] flex items-center justify-center overflow-hidden rounded-xl"
      />

      {/* Fallback placeholder while GIS library loads */}
      {!isSdkLoaded && (
        <button
          type="button"
          disabled
          className="w-full min-h-[44px] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-300 flex items-center justify-center gap-3 transition-opacity opacity-70"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>
            {mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
          </span>
        </button>
      )}
    </div>
  );
}
