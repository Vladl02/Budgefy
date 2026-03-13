import { RootLayoutContent } from "@/src/components/app/RootLayoutContent";
import { AuthProvider } from "@/src/providers/AuthProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutContent />
    </AuthProvider>
  );
}
