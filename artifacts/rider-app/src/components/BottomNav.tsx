import { Link, useLocation } from "wouter";

interface NavItem { href: string; label: string; icon: string; activeIcon: string; }

const items: NavItem[] = [
  { href: "/", label: "Home", icon: "🏠", activeIcon: "🏠" },
  { href: "/active", label: "Active", icon: "📍", activeIcon: "📍" },
  { href: "/history", label: "History", icon: "📋", activeIcon: "📋" },
  { href: "/earnings", label: "Earnings", icon: "💰", activeIcon: "💰" },
  { href: "/profile", label: "Profile", icon: "👤", activeIcon: "👤" },
];

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg pb-safe">
      <div className="flex">
        {items.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active ? "text-green-600" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{active ? item.activeIcon : item.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? "text-green-600" : "text-gray-400"}`}>{item.label}</span>
              {active && <div className="absolute bottom-0 w-8 h-0.5 bg-green-600 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
