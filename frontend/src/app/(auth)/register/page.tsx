"use client";

import { useState, useRef } from "react";
import { Button, Input, Textarea, Avatar, Progress } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRequired,
  validateDateOfBirth,
  validateUsername,
  getPasswordStrength,
} from "@/lib/validators";
import { registerUser } from "@/lib/api";
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

function CameraIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step management
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 2 fields
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [aboutMe, setAboutMe] = useState("");

  // State
  const [isLoading, setIsLoading] = useState(false);

  const usernameValidation = validateUsername(username);

  function validateStep1(): boolean {
    const errors: string[] = [];

    const fnResult = validateRequired(firstName, "First name");
    if (!fnResult.valid) errors.push(fnResult.error!);

    const lnResult = validateRequired(lastName, "Last name");
    if (!lnResult.valid) errors.push(lnResult.error!);

    const emailResult = validateEmail(email);
    if (!emailResult.valid) errors.push(emailResult.error!);

    const passResult = validatePassword(password);
    if (!passResult.valid) errors.push(passResult.error!);

    const matchResult = validatePasswordMatch(password, confirmPassword);
    if (!matchResult.valid) errors.push(matchResult.error!);

    const dobResult = validateDateOfBirth(dateOfBirth);
    if (!dobResult.valid) errors.push(dobResult.error!);

    if (errors.length > 0) {
      showToast({
        title: "Please fix the following",
        description: errors.join(". "),
        color: "danger",
      });
      return false;
    }
    return true;
  }

  function handleNext() {
    if (validateStep1()) {
      setStep(2);
      showToast({
        title: "Almost there!",
        description: "Choose your username to complete registration.",
        color: "primary",
      });
    }
  }

  function handleBack() {
    setStep(1);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast({
          title: "Invalid file",
          description: "Please upload an image file (JPEG, PNG, or GIF).",
          color: "warning",
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast({
          title: "File too large",
          description: "Image must be under 5MB.",
          color: "warning",
        });
        return;
      }
      setAvatar(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeAvatar() {
    setAvatar(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const usernameResult = validateUsername(username);
    if (!usernameResult.valid) {
      showToast({
        title: "Invalid username",
        description: usernameResult.error!,
        color: "danger",
      });
      return;
    }

    setIsLoading(true);

    const result = await registerUser({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      username,
      nickname: nickname || undefined,
      aboutMe: aboutMe || undefined,
      avatar: avatar || undefined,
    });

    if (result.error) {
      showToast({
        title: "Registration Failed",
        description: result.error,
        color: "danger",
      });
      setIsLoading(false);
      return;
    }

    showToast({
      title: "Account created!",
      description: "Welcome to Waves. Please login to continue.",
      color: "success",
    });

    router.push("/login");
  }

  return (
    <div>
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-default-500 mb-2">
          <span className={step === 1 ? "text-primary font-semibold" : ""}>
            Account Details
          </span>
          <span className={step === 2 ? "text-primary font-semibold" : ""}>
            Personalize
          </span>
        </div>
        <Progress
          value={step === 1 ? 50 : 100}
          color="primary"
          size="sm"
          className="max-w-full"
        />
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-center mb-2">
              Create your account
            </h1>
            <p className="text-default-500 text-center text-sm mb-6">
              Step 1: Fill in your details
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNext();
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={firstName}
                  onValueChange={setFirstName}
                  maxLength={10}
                  variant="bordered"
                  classNames={{ inputWrapper: "glass-input" }}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onValueChange={setLastName}
                  maxLength={10}
                  variant="bordered"
                  classNames={{ inputWrapper: "glass-input" }}
                />
              </div>

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onValueChange={setEmail}
                maxLength={254}
                variant="bordered"
                classNames={{ inputWrapper: "glass-input" }}
              />

              <div className="flex flex-col gap-1">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  value={password}
                  onValueChange={setPassword}
                  maxLength={72}
                  variant="bordered"
                  classNames={{ inputWrapper: "glass-input" }}
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
                {password.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <Progress
                      value={getPasswordStrength(password).score}
                      color={getPasswordStrength(password).color}
                      size="sm"
                      className="flex-1"
                    />
                    <span
                      className={`text-xs font-medium text-${getPasswordStrength(password).color}`}
                    >
                      {getPasswordStrength(password).label}
                    </span>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant="bordered"
                classNames={{ inputWrapper: "glass-input" }}
                endContent={
                  <button
                    type="button"
                    className="text-default-400 hover:text-default-600 transition-colors"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />

              <Input
                label="Date of Birth"
                type="date"
                placeholder="Select your date of birth"
                value={dateOfBirth}
                onValueChange={setDateOfBirth}
                variant="bordered"
                classNames={{ inputWrapper: "glass-input" }}
              />

              <Button
                type="submit"
                color="primary"
                size="lg"
                className="mt-2 font-semibold shadow-lg shadow-primary/30"
                fullWidth
              >
                Next
              </Button>
            </form>

            <p className="text-center text-sm text-default-500 mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-semibold hover:underline"
              >
                Login
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold text-center mb-2">
              Personalize your profile
            </h1>
            <p className="text-default-500 text-center text-sm mb-6">
              Step 2: Choose your unique username
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Username - required */}
              <Input
                label="Username"
                placeholder="your_username"
                value={username}
                onValueChange={setUsername}
                isRequired
                variant="bordered"
                classNames={{ inputWrapper: "glass-input" }}
                startContent={
                  <span className="text-default-400 text-sm">@</span>
                }
                isInvalid={username.length > 0 && !usernameValidation.valid}
                errorMessage={
                  username.length > 0 && !usernameValidation.valid
                    ? usernameValidation.error
                    : undefined
                }
                description="Letters, numbers, and underscores only"
              />

              <Input
                label="Nickname (Optional)"
                placeholder="Display name"
                value={nickname}
                onValueChange={setNickname}
                maxLength={20}
                variant="bordered"
                classNames={{ inputWrapper: "glass-input" }}
              />

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Avatar
                    src={avatarPreview || undefined}
                    className="w-24 h-24 text-large"
                    showFallback
                    fallback={
                      <div className="flex items-center justify-center w-full h-full text-default-400">
                        <CameraIcon />
                      </div>
                    }
                  />
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <CameraIcon />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-xs text-danger hover:underline"
                  >
                    Remove photo
                  </button>
                )}
                <p className="text-xs text-default-400">
                  Click to upload a profile picture (optional)
                </p>
              </div>

              <Textarea
                label="About Me"
                placeholder="Tell us something about yourself..."
                value={aboutMe}
                onValueChange={setAboutMe}
                variant="bordered"
                minRows={3}
                maxRows={5}
                classNames={{ inputWrapper: "glass-input" }}
              />

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  color="default"
                  variant="bordered"
                  size="lg"
                  className="font-semibold"
                  onPress={handleBack}
                  fullWidth
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="font-semibold shadow-lg shadow-primary/30"
                  isLoading={isLoading}
                  isDisabled={!usernameValidation.valid}
                  fullWidth
                >
                  Create Account
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-default-500 mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary font-semibold hover:underline"
              >
                Login
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
