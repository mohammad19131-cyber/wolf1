"use client";

import Button from "../components/Button";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const [username, setusername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const router = useRouter();

			const handleLogin = async () => {
				setError("");
				try {
					const res = await fetch("/api/login", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ username, password }),
						credentials: "include",
					});
					
					if (!res.ok) {
						const data = await res.json().catch(() => ({ error: "Login failed" }));
						setError(data.error || "Login failed");
						return;
					}
					
					const data = await res.json();
					if (data.success) {
						if (data.tokenType === "admin") {
							router.push("/admin");
						} else {
							router.push("/dashboard");
						}
					} else {
						setError(data.error || "Login failed");
					}
				} catch (err) {
					console.error("Login error:", err);
					setError("Network error. Please check your connection and try again.");
				}
			};

	return (
		<main className="min-h-screen flex flex-col items-center justify-center font-sans text-white px-4" style={{ backgroundColor: '#14070A' }}>
			<form
				className="rounded-2xl shadow-2xl p-8 flex flex-col items-center w-full max-w-sm animate-fade-in"
				style={{
					backgroundImage: 'linear-gradient(145deg, rgba(66,18,27,0.96), rgba(35,8,13,0.96))',
					border: '1px solid rgba(232,199,122,0.15)',
					boxShadow: '0 16px 38px rgba(0,0,0,0.42)',
				}}
				onSubmit={e => { e.preventDefault(); handleLogin(); }}
			>
				<Image
					src="/assets/emp.png"
					alt="Wolf of Tech Street logo"
					width={80}
					height={80}
					className="mb-6 drop-shadow-xl"
					priority
				/>
				<span
					className="mb-3 px-3 py-1 rounded-full text-[10px] font-semibold uppercase"
					style={{
						color: '#F3D393',
						background: 'rgba(232,199,122,0.08)',
						border: '1px solid rgba(245,223,163,0.16)',
						letterSpacing: '0.14em',
					}}
				>
					ACSEC XI
				</span>
				<h2 className="text-2xl font-bold mb-6 text-white">Login</h2>
				<div className="w-full mb-4">
					<label htmlFor="username" className="block mb-2 text-sm font-medium text-white">username</label>
					<input
						type="text"
						id="username"
						name="username"
						autoComplete="username"
						required
						value={username}
						onChange={e => setusername(e.target.value)}
						className="w-full px-4 py-2 rounded-lg text-white border focus:outline-none focus:ring-2 transition-all"
						style={{ backgroundColor: '#14070A', borderColor: '#3D171E' }}
						onFocus={e => { e.currentTarget.style.borderColor = '#E8C77A'; }}
						onBlur={e => { e.currentTarget.style.borderColor = '#3D171E'; }}
					/>
				</div>
				<div className="w-full mb-6">
					<label htmlFor="password" className="block mb-2 text-sm font-medium text-white">Password</label>
					<input
						type="password"
						id="password"
						name="password"
						autoComplete="current-password"
						required
						value={password}
						onChange={e => setPassword(e.target.value)}
						className="w-full px-4 py-2 rounded-lg text-white border focus:outline-none focus:ring-2 transition-all"
						style={{ backgroundColor: '#14070A', borderColor: '#3D171E' }}
						onFocus={e => { e.currentTarget.style.borderColor = '#E8C77A'; }}
						onBlur={e => { e.currentTarget.style.borderColor = '#3D171E'; }}
					/>
				</div>
				{error && <div className="text-red-400 mb-4 text-sm">{error}</div>}
				<Button
					text="Login"
					color="#E8C77A"
					textColor="#241006"
					glowColor="#F3D393"
					rippleColor="rgba(36,16,6,0.2)"
					onClick={handleLogin}
				/>
			</form>
		</main>
	);
}
