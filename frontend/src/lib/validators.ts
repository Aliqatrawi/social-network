export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRequired(
  value: string,
  fieldName: string,
): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required" };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must include an uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must include a lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must include a number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must include a special character (!@#$...)",
    };
  }
  return { valid: true };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: "danger" | "warning" | "primary" | "success";
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 25, label: "Weak", color: "danger" };
  if (score <= 3) return { score: 50, label: "Fair", color: "warning" };
  if (score <= 5) return { score: 75, label: "Good", color: "primary" };
  return { score: 100, label: "Strong", color: "success" };
}

export function validatePasswordMatch(
  password: string,
  confirmPassword: string,
): ValidationResult {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { valid: false, error: "Please confirm your password" };
  }
  if (password !== confirmPassword) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

export function validateDateOfBirth(date: string): ValidationResult {
  if (!date) {
    return { valid: false, error: "Date of birth is required" };
  }
  const dob = new Date(date);
  const now = new Date();

  if (isNaN(dob.getTime())) {
    return { valid: false, error: "Please enter a valid date" };
  }

  if (dob >= now) {
    return { valid: false, error: "Date of birth must be in the past" };
  }

  const age = now.getFullYear() - dob.getFullYear();
  if (age > 120) {
    return { valid: false, error: "Please enter a valid date of birth" };
  }

  return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
  if (username.trim().length === 0) {
    return {
      valid: false,
      error: "Username is required",
    };
  }
  if (username.trim().length < 3) {
    return {
      valid: false,
      error: "Username must be at least 3 characters",
    };
  }
  if (username.trim().length > 20) {
    return {
      valid: false,
      error: "Username must be 20 characters or less",
    };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return {
      valid: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }
  return { valid: true };
}
