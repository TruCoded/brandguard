"use client";
import Island from "@/components/Island";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/ctx";

export default function DashboardPage() {
  const router = useRouter();
  const { isLoggedIn, ready } = useApp();

  useEffect(() => {
    if (ready && !isLoggedIn) {
      router.push("/login");
    }
  }, [ready, isLoggedIn, router]);

  if (!ready) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <p>Loading workspace...</p>
      </div>
    );
  }

  return <Island />;
}
