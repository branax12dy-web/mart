import { Link, useLocation } from "wouter";

const items = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/orders", label: "Orders", icon: "📦" },
  { href: "/products", label: "Products", icon: "🍽️" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-lg">
      <div className="flex">
        {items.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors ${active ? "text-orange-500" : "text-gray-400"}`}>
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={`text-[10px] font-semibold ${active ? "text-orange-500" : "text-gray-400"}`}>{item.label}</span>
              {active && <div className="absolute bottom-0 w-8 h-0.5 bg-orange-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
