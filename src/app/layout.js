import "./globals.css";
import { Poppins } from "next/font/google";
import Footer from "./components/Footer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata = {
  title: "Wolf of Tech Street | ACSEC XI",
  description: "The official portal for Wolf of Tech Street at ACSEC XI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body
        className="antialiased min-h-screen flex flex-col"
        style={{ backgroundColor: "#14070A" }}
      >
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
