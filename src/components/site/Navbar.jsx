import React, { useState } from "react";
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Menu,
  UserPlus,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "@/lib/AuthContext";
import { ASSETS } from "@/lib/assets";

const NAV_LINKS = [
  {
    label: "Home",
    to: "/",
  },
  {
    label: "Teams",
    to: "/teams",
  },
  {
    label: "Locations",
    to: "/locations",
  },
  {
    label: "Services",
    to: "/services",
  },
  {
    label: "Contact",
    to: "/contact",
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const {
    profile,
    isAdmin,
    isBarber,
    isAuthenticated,
    signOut,
  } = useAuth();

  const closeMenu = () => {
    setOpen(false);
  };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  };

  const handleLogout = async () => {
    try {
      await signOut();
      closeMenu();
      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error("Unable to sign out:", error);
    }
  };

  const showBarberPortal =
    Boolean(isBarber) && !Boolean(isAdmin);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          onClick={closeMenu}
        >
          <img
            src={ASSETS.logoColor}
            alt="All Stylez Pro"
            className="h-9 w-9 object-contain"
          />

          <span className="hidden font-heading text-sm font-extrabold tracking-tight text-ink sm:block">
            ALL STYLEZ PRO
          </span>
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`font-heading text-[13px] font-bold tracking-wide transition-colors hover:text-cta ${
                  isActive(link.to)
                    ? "text-cta"
                    : "text-ink"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {showBarberPortal && (
            <li>
              <Link
                to="/portal"
                className={`font-heading text-[13px] font-bold tracking-wide transition-colors hover:text-cta ${
                  isActive("/portal")
                    ? "text-cta"
                    : "text-ink"
                }`}
              >
                Portal
              </Link>
            </li>
          )}

          {isAdmin && (
            <li>
              <Link
                to="/admin"
                className={`font-heading text-[13px] font-bold tracking-wide transition-colors hover:text-cta ${
                  isActive("/admin")
                    ? "text-cta"
                    : "text-ink"
                }`}
              >
                Admin
              </Link>
            </li>
          )}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <div className="mr-2 hidden text-right lg:block">
                <p className="text-xs font-semibold text-ink">
                  {profile?.full_name || "Account"}
                </p>

                <p className="text-[11px] capitalize text-ink/50">
                  {profile?.role || "customer"}
                </p>
              </div>

              {!isAdmin && (
                <Link
                  to="/bookings"
                  className="inline-flex items-center gap-2 rounded-full bg-cta px-5 py-2.5 font-heading text-xs font-bold tracking-wide text-white transition-colors hover:bg-cta/90"
                >
                  <CalendarCheck size={15} />
                  My Bookings
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 font-heading text-xs font-bold tracking-wide text-ink transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 font-heading text-xs font-bold tracking-wide text-ink transition-colors hover:bg-muted"
              >
                <LogIn size={15} />
                Sign in
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-cta px-5 py-2.5 font-heading text-xs font-bold tracking-wide text-white transition-colors hover:bg-cta/90"
              >
                <UserPlus size={15} />
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="-mr-2 p-2 text-ink md:hidden"
          onClick={() => {
            setOpen((current) => !current);
          }}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-black/5 bg-white md:hidden">
          <ul className="space-y-1 px-5 py-4">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={closeMenu}
                  className={`block py-3 font-heading text-sm font-bold tracking-wide ${
                    isActive(link.to)
                      ? "text-cta"
                      : "text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}

            {showBarberPortal && (
              <li>
                <Link
                  to="/portal"
                  onClick={closeMenu}
                  className={`block py-3 font-heading text-sm font-bold tracking-wide ${
                    isActive("/portal")
                      ? "text-cta"
                      : "text-ink"
                  }`}
                >
                  Portal
                </Link>
              </li>
            )}

            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  onClick={closeMenu}
                  className={`block py-3 font-heading text-sm font-bold tracking-wide ${
                    isActive("/admin")
                      ? "text-cta"
                      : "text-ink"
                  }`}
                >
                  Admin
                </Link>
              </li>
            )}

            <li className="mt-2 border-t border-ink/5 pt-2">
              {isAuthenticated ? (
                <div>
                  <div className="py-3">
                    <p className="text-sm font-semibold text-ink">
                      {profile?.full_name || "Account"}
                    </p>

                    <p className="text-xs capitalize text-ink/50">
                      {profile?.role || "customer"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {!isAdmin && (
                      <Link
                        to="/bookings"
                        onClick={closeMenu}
                        className="block py-3 font-heading text-sm font-bold tracking-wide text-cta"
                      >
                        My Bookings
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 py-3 font-heading text-sm font-bold tracking-wide text-ink/70 hover:text-red-600"
                    >
                      <LogOut size={16} />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="block py-3 font-heading text-sm font-bold tracking-wide text-cta"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="block py-3 font-heading text-sm font-bold tracking-wide text-cta"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
