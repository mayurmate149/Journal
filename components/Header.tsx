import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const { pathname } = useRouter();
  const router = useRouter();

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`relative px-4 py-2 rounded-md font-medium transition-all duration-200 ${
          active
            ? "bg-white text-blue-700 shadow-md"
            : "text-white hover:bg-white/20 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.replace("/login"); // redirect to login page
      } else {
        alert("Logout failed");
      }
    } catch (err) {
      console.error(err);
      alert("Logout failed");
    }
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          {/* Brand */}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Mayur Journal
          </h1>

          {/* Navigation */}
          <nav className="flex items-center gap-4 text-sm">
            {navLink("/dashboard", "Dashboard")}
            {navLink("/trades/list", "Trades")}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition-all"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
