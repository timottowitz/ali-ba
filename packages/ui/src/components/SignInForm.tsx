import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<"signIn" | "signUp">("signIn");

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex mb-6">
          <button
            className={`flex-1 py-2 px-4 text-center ${
              step === "signIn"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-gray-500"
            }`}
            onClick={() => setStep("signIn")}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 px-4 text-center ${
              step === "signUp"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-gray-500"
            }`}
            onClick={() => setStep("signUp")}
          >
            Sign Up
          </button>
        </div>
        <SignInWithPassword handleSubmit={signIn} step={step} />
      </div>
    </div>
  );
}

function SignInWithPassword({
  handleSubmit,
  step,
}: {
  handleSubmit: (formData: FormData) => void;
  step: "signIn" | "signUp";
}) {
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        handleSubmit(formData);
      }}
    >
      <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1">
        Email
      </label>
      <input
        name="email"
        id="email"
        className="mb-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        type="email"
        required
      />
      <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1">
        Password
      </label>
      <input
        name="password"
        id="password"
        className="mb-6 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        type="password"
        required
      />
      <input name="flow" value={step} type="hidden" />
      <button
        className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
        type="submit"
      >
        {step === "signIn" ? "Sign In" : "Sign Up"}
      </button>
    </form>
  );
}
