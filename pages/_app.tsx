import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import NormalLayout from "@/components/Layout";
import AuthLayout from "@/components/AuthLayout";
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Only use AuthLayout for /login
  const Layout = router.pathname === "/login" || router.pathname === "/register" ? NormalLayout : AuthLayout;
  console.log("pathname ===>" ,router.pathname)
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
