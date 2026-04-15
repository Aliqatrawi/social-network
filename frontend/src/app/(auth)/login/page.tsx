"use client";

import { useState } from "react";
import { Button, Input } from "@heroui/react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateEmail, validatePassword } from "@/lib/validators";
import { useAuth } from "@/context/AuthContext";
import { showToast } from "@/lib/toast";

function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function validate(): boolean {
    const errors: string[] = [];

    const emailResult = validateEmail(email);
    if (!emailResult.valid) errors.push(emailResult.error!);

    const passwordResult = validatePassword(password);
    if (!passwordResult.valid) errors.push(passwordResult.error!);

    if (errors.length > 0) {
      showToast({
        title: "Validation Error",
        description: errors.join(". "),
        color: "danger",
      });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    const result = await login({ email, password });

    if (result.error) {
      showToast({
        title: "Login Failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Welcome back!",
      description: "You have been logged in successfully.",
      color: "success",
    });

    // Redirect to feed
    router.push("/feed");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
      <p className="text-default-500 text-center text-sm mb-8">
        Sign in to continue to Waves
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onValueChange={setEmail}
          variant="bordered"
          size="lg"
          classNames={{
            inputWrapper: "glass-input",
          }}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onValueChange={setPassword}
          variant="bordered"
          size="lg"
          classNames={{
            inputWrapper: "glass-input",
          }}
          endContent={
            <button
              type="button"
              className="text-default-400 hover:text-default-600 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        />

        <Button
          type="submit"
          color="primary"
          size="lg"
          className="mt-2 font-semibold shadow-lg shadow-primary/30"
          isLoading={isLoading}
          fullWidth
        >
          Login
        </Button>
      </form>

      <p className="text-center text-sm text-default-500 mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-primary font-semibold hover:underline"
        >
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}
