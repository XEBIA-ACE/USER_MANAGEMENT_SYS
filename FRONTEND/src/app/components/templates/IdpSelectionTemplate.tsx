import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Header } from "../organisms/Header";
import { Footer } from "../organisms/Footer";
import { getIdpProviders } from "../../lib/api-client";
import { initiateOidcRedirect } from "../../lib/oidc-client";
import type { IdpProvider } from "../../types/oidc.types";

const NAV_ITEMS = [
  { label: "Home",     href: "/"          },
  { label: "Features", href: "/#features" },
  { label: "About",    href: "/#about"    },
];

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "redirecting"; provider: IdpProvider }
  | { status: "ready"; providers: IdpProvider[] };

export function IdpSelectionTemplate() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getIdpProviders();
        if (cancelled) return;

        if (!result.ok) {
          setState({ status: "error", message: "We couldn't load the sign-in options. Please try again." });
          return;
        }

        const providers = result.data;
        if (providers.length === 1) {
          setState({ status: "redirecting", provider: providers[0] });
          await initiateOidcRedirect(providers[0]);
          return;
        }

        setState({ status: "ready", providers });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "We couldn't load the sign-in options. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSelect(provider: IdpProvider) {
    setState({ status: "redirecting", provider });
    try {
      await initiateOidcRedirect(provider);
    } catch {
      setState({ status: "error", message: `We couldn't start sign-in with ${provider.displayName}. Please try again.` });
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ fontFamily: "'Inter','SF Pro Text','Roboto',sans-serif", backgroundColor: "#F5F5F5" }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-[100] px-4 py-2 rounded-md bg-[#1A73E8] text-white text-sm font-medium"
      >
        Skip to main content
      </a>

      <Header
        onSignIn={() => navigate("/login")}
        onRegister={() => navigate("/register")}
        navItems={NAV_ITEMS}
      />

      <main
        id="main-content"
        className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6"
        style={{ paddingTop: "calc(64px + 48px)", paddingBottom: "48px" }}
      >
        <section
          aria-labelledby="idp-select-heading"
          className="w-full mx-auto rounded-lg border border-[#E0E0E0] bg-white"
          style={{ maxWidth: 480, padding: 40 }}
        >
          <h1 id="idp-select-heading" style={{ color: "#212121" }}>Sign in with your organization</h1>
          <p className="mt-2 text-sm" style={{ color: "#616161" }}>
            Choose the identity provider you use to sign in.
          </p>

          <div className="mt-6" role="status" aria-live="polite">
            {state.status === "loading" && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#616161" }}>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading sign-in options…
              </div>
            )}

            {state.status === "redirecting" && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#616161" }}>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Redirecting you to {state.provider.displayName}…
              </div>
            )}

            {state.status === "error" && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-[#F5C6C6] bg-[#FDECEA] px-3 py-2 text-sm"
                style={{ color: "#B3261E" }}
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{state.message}</span>
              </div>
            )}

            {state.status === "ready" && state.providers.length === 0 && (
              <p className="text-sm" style={{ color: "#616161" }}>
                No identity providers are configured. Please contact your administrator.
              </p>
            )}

            {state.status === "ready" && state.providers.length > 1 && (
              <ul className="flex flex-col gap-3" aria-label="Identity providers">
                {state.providers.map((provider) => (
                  <li key={provider.id}>
                    <button
                      type="button"
                      data-idp-id={provider.id}
                      onClick={() => { void handleSelect(provider); }}
                      className="w-full h-12 flex items-center justify-between px-4 rounded-md border border-[#E0E0E0] bg-white font-semibold transition-colors duration-150 hover:border-[#1A73E8] hover:bg-[#F3F8FE] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(26,115,232,0.4)]"
                      style={{ color: "#212121" }}
                    >
                      <span>Continue with {provider.displayName}</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-6 text-sm" style={{ color: "#616161" }}>
            Prefer a password?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: "#1A73E8" }}
            >
              Sign in with email
            </button>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
