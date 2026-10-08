"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Button from "./components/Button";

export default function LandingPage() {
  const router = useRouter();
  return (
  <main className="min-h-screen flex flex-col items-center justify-center font-sans text-white px-4" style={{ backgroundColor: '#14070A' }}>
      <div className="flex flex-col items-center gap-6 max-w-2xl text-center animate-fade-in">
        <div className="flex gap-8 items-center">
          <Image
            src="/assets/emp.png"
            alt="Wolf of Tech Street logo"
            width={110}
            height={110}
            className="drop-shadow-xl animate-fade-in delay-200"
            priority
          />
        </div>

        <span
          className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold uppercase animate-fade-in delay-200"
          style={{
            color: '#F3D393',
            background: 'rgba(232,199,122,0.08)',
            border: '1px solid rgba(245,223,163,0.16)',
            letterSpacing: '0.14em',
          }}
        >
          ACSEC XI
        </span>

        <h1 className="text-5xl md:text-6xl font-extrabold text-center tracking-tight animate-fade-in delay-300 text-white">
          Wolf of Tech Street
        </h1>
        <p className="text-base md:text-lg max-w-xl text-center animate-fade-in delay-400" style={{ color: '#D3C3C5' }}>
          The official trading portal for Wolf of Tech Street, hosted under ACSEC XI.
        </p>
        <div className="mt-4 animate-fade-in delay-500">
          <Button
            text="Login"
            color="#E8C77A"
            textColor="#241006"
            glowColor="#F3D393"
            rippleColor="rgba(36,16,6,0.2)"
            onClick={() => router.push("/login")}
          />
        </div>
      </div>
    </main>
  );
}
