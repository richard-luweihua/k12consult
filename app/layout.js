import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata = {
  title: "香港 K12 择校前诊 MVP",
  description: "面向香港 K12 择校咨询的结构化前诊与结果生成系统"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
