import { useAuthActions } from "@convex-dev/auth/react";

export function SignOutButton() {
  const { signOut } = useAuthActions();
  return (
    <button
      className="text-sm text-gray-600 hover:text-gray-900"
      onClick={() => void signOut()}
    >
      Sign Out
    </button>
  );
}
