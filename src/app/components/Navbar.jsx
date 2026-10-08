import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LogOut, AlertTriangle } from "lucide-react";
import Image from "next/image";
import ParticipantCompetitionStatus from "./ParticipantCompetitionStatus";

export default function Navbar({ onLogout, loading }) {
  const pathname = usePathname();
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/crisis", label: "Crisis", icon: AlertTriangle },
  ];

  return (
    <nav className="border-b backdrop-blur-md sticky top-0 z-50 shadow-lg" style={{ backgroundColor: 'rgba(48,13,19,0.88)', borderColor: 'rgba(232,199,122,0.22)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">

          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl backdrop-blur-sm flex items-center justify-center border shadow-lg transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: 'rgba(232,199,122,0.1)', borderColor: 'rgba(232,199,122,0.22)', boxShadow: '0 0 10px rgba(232,199,122,0.2)' }}>
              <Image 
                src="/assets/emp.png" 
                alt="Wolf of Tech Street logo" 
                width={48} 
                height={48} 
                className="text-white transition-transform duration-300 group-hover:rotate-12" 
              />
            </div>
            <span className="text-lg sm:text-xl font-bold drop-shadow-lg" style={{ color: '#F3D393' }}>
              Wolf of Tech Street <span className="hidden sm:inline" style={{ color: '#D3C3C5', fontWeight: 500 }}>— ACSEC XI</span>
            </span>
          </div>


          <div className="flex gap-2 items-center">
            <ParticipantCompetitionStatus />
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all duration-300
                    ${isActive 
                      ? "text-white shadow-lg scale-105" 
                      : "hover:bg-white/5 hover:text-white hover:shadow-md hover:scale-105 border border-transparent"
                    }
                  `}
                  style={isActive ? { backgroundColor: '#E8C77A', color: '#241006', boxShadow: '0 0 10px rgba(232,199,122,0.5)' } : { color: '#F3D393' }}
                >
                  <Icon size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
 
            {onLogout && (
              <button
                onClick={onLogout}
                disabled={loading}
                className="group flex items-center gap-2 px-3 py-2 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ml-2 hover:scale-105 max-w-full overflow-x-hidden"
                style={{ backgroundColor: '#E8C77A', color: '#241006', borderColor: '#E8C77A', boxShadow: '0 0 10px rgba(232,199,122,0.3)', minWidth: 0 }}
              >
                <LogOut size={18} className={`${loading ? 'animate-spin' : 'group-hover:translate-x-1'} transition-transform duration-300`} />
                <span className="hidden sm:inline">{loading ? 'Logging out...' : 'Logout'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      

      <div className="absolute bottom-0 left-0 w-full h-px" style={{ background: 'linear-gradient(to right, transparent, #E8C77A, transparent)' }}></div>
    </nav>
  );
}
