import React, { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Menu,
  X,
  LogIn,
  CalendarCheck,
  UserPlus,
  LogOut,
  Scissors,
} from "lucide-react";

import { ASSETS, NAV_LINKS } from "@/lib/assets";
import { useAuth } from "@/lib/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const {
    isAuthenticated,
    signOut,
    isBarber,
  } = useAuth();

  const isActive = (to) =>
    to === "/"
      ? pathname === "/"
      : pathname.startsWith(to);

  const handleSignOut = async () => {
    try {
      setOpen(false);

      await signOut();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Unable to sign out:",
        error
      );
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5">
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0"
        >
          <img
            src={ASSETS.logoColor}
            alt="All Stylez Pro"
            className="h-9 w-9 object-contain"
          />

          <span className="font-heading font-extrabold tracking-tight text-ink text-sm hidden sm:block">
            ALL STYLEZ PRO
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-9">
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
        </ul>

        <div className="hidden md:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {isBarber ? (
                <Link
                  to="/barber-portal"
                  className="inline-flex items-center gap-2 bg-cta text-white rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-cta/90 transition-colors"
                >
                  <Scissors size={15} />
                  Barber Portal
                </Link>
              ) : (
                <Link
                  to="/bookings"
                  className="inline-flex items-center gap-2 bg-cta text-white rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-cta/90 transition-colors"
                >
                  <CalendarCheck size={15} />
                  My Bookings
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 border border-ink/15 text-ink rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 border border-ink/15 text-ink rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-muted transition-colors"
              >
                <LogIn size={15} />
                Sign in
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-cta text-white rounded-full px-5 py-2.5 font-heading text-xs font-bold tracking-wide hover:bg-cta/90 transition-colors"
              >
                <UserPlus size={15} />
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden text-ink p-2 -mr-2"
          onClick={() =>
            setOpen((value) => !value)
          }
          aria-label="Toggle menu"
        >
          {open ? (
            <X size={22} />
          ) : (
            <Menu size={22} />
          )}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-black/5 bg-white">
          <ul className="px-5 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={() =>
                    setOpen(false)
                  }
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

            <li className="pt-2 border-t border-ink/5 mt-2">
              {isAuthenticated ? (
                <div className="flex flex-col gap-1">
                  {isBarber ? (
                    <Link
                      to="/barber-portal"
                      onClick={() =>
                        setOpen(false)
                      }
                      className="inline-flex items-center gap-2 py-3 font-heading text-sm font-bold tracking-wide text-cta"
                    >
                      <Scissors size={16} />
                      Barber Portal
                    </Link>
                  ) : (
                    <Link
                      to="/bookings"
                      onClick={() =>
                        setOpen(false)
                      }
                      className="inline-flex items-center gap-2 py-3 font-heading text-sm font-bold tracking-wide text-cta"
                    >
                      <CalendarCheck
                        size={16}
                      />
                      My Bookings
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-2 py-3 font-heading text-sm font-bold tracking-wide text-ink/70 hover:text-red-600 text-left"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Link
                    to="/login"
                    onClick={() =>
                      setOpen(false)
                    }
                    className="block py-3 font-heading text-sm font-bold tracking-wide text-cta"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register"
                    onClick={() =>
                      setOpen(false)
                    }
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
