import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LayoutDashboard, Trophy, AlertTriangle } from "lucide-react";
import Image from "next/image";
import AdminCompetitionBar from "./AdminCompetitionBar";

export default function AdminNavbar() {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/admin", label: "Users", icon: Users },
    { href: "/admin/crisis", label: "Crisis", icon: AlertTriangle },
    { href: "/admin/news", label: "Crisis Updates", icon: LayoutDashboard },
    { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <nav className="border-b backdrop-blur-sm sticky top-0 z-50" style={{ backgroundColor: 'rgba(48,13,19,0.88)', borderColor: 'rgba(232,199,122,0.22)' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center">
              <Image src="/assets/emp.png" alt="Wolf of Tech Street logo" width={48} height={48} className="text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: '#F3D393' }}>
              Wolf of Tech Street <span className="hidden sm:inline" style={{ color: '#D3C3C5', fontWeight: 500 }}>— ACSEC XI</span>
            </span>
          </div>

          <div className="flex gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                    ${isActive 
                      ? "text-white shadow-lg" 
                      : "hover:bg-white/5 hover:text-white"
                    }
                  `}
                  style={isActive ? { backgroundColor: '#E8C77A', color: '#241006', boxShadow: '0 0 10px rgba(232,199,122,0.5)' } : { color: '#F3D393' }}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <AdminCompetitionBar />
    </nav>
  );
}
