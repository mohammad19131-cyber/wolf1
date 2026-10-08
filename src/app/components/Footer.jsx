"use client";

import Link from "next/link";
import { Github, Instagram } from "lucide-react";

function Footer() {
  return (
    <footer className="w-full py-2 sm:py-4 px-3 sm:px-4 border-t relative backdrop-blur-md overflow-hidden mt-8 sm:mt-12" style={{ backgroundColor: '#14070A', borderColor: 'rgba(232,199,122,0.22)' }}>

      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[length:30px_30px] animate-pulse" style={{ backgroundImage: 'linear-gradient(45deg,transparent_25%,rgba(232,199,122,0.1)_25%,rgba(232,199,122,0.1)_50%,transparent_50%,transparent_75%,rgba(232,199,122,0.1)_75%)' }}></div>
      </div>


      <div className="absolute top-0 left-0 w-full h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(232,199,122,0.6), transparent)' }}></div>


      <div className="relative max-w-6xl mx-auto">

        <div className="flex flex-col items-center gap-1.5 sm:gap-3">

          <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 text-[10px] sm:text-xs" style={{ color: 'rgba(232,199,122,0.8)' }}>
            <span className="font-semibold">Copyright © ACSEC XI</span>
            <span className="hidden sm:inline" style={{ color: 'rgba(232,199,122,0.5)' }}>•</span>
            <span className="hidden sm:inline">All Rights Reserved</span>
          </div>


          <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
            <span className="hidden sm:inline" style={{ color: '#F3D393' }}>Made by:</span>
            <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2">
               <Link
                href="https://www.instagram.com/mbj.2010/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-1.5 py-0.5 sm:px-2 sm:py-1 rounded border sm:rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                style={{ backgroundColor: 'rgba(232,199,122,0.1)', borderColor: 'rgba(232,199,122,0.3)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(232,199,122,0.2)';
                  e.currentTarget.style.borderColor = 'rgba(232,199,122,0.5)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(232,199,122,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(232,199,122,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(232,199,122,0.3)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="flex items-center gap-1 sm:gap-1.5 group-hover:text-white font-medium" style={{ color: '#F3D393' }}>
                  <Instagram size={10} className="sm:hidden group-hover:rotate-12 transition-transform duration-300" />
                  <Instagram size={12} className="hidden sm:block group-hover:rotate-12 transition-transform duration-300" />
                  <span className="text-[10px] sm:text-xs">MBJ</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(232,199,122,0.3), transparent)' }}></div>
    </footer>
  );
}

export default Footer;
