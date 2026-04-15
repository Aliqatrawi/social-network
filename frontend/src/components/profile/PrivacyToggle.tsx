"use client";

import { useState } from "react";
import { Switch } from "@heroui/react";
import { updateProfile } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface PrivacyToggleProps {
  isPublic: boolean;
  onToggle?: (isPublic: boolean) => void;
}

export function PrivacyToggle({ isPublic, onToggle }: PrivacyToggleProps) {
  const [value, setValue] = useState(isPublic);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleToggle(checked: boolean) {
    setIsUpdating(true);
    const result = await updateProfile({ isPublic: checked });

    if (result.error) {
      showToast({
        title: "Update failed",
        description: result.error,
        color: "danger",
      });
      setIsUpdating(false);
      return;
    }

    setValue(checked);
    onToggle?.(checked);
    showToast({
      title: checked ? "Profile is now public" : "Profile is now private",
      description: checked
        ? "Anyone can see your profile."
        : "Only followers can see your full profile.",
      color: "primary",
    });
    setIsUpdating(false);
  }

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <div>
        <p className="text-sm font-medium">
          {value ? "Public Profile" : "Private Profile"}
        </p>
        <p className="text-xs text-default-400">
          {value
            ? "Everyone can see your profile"
            : "Only followers can see your full profile"}
        </p>
      </div>
      <Switch
        isSelected={value}
        onValueChange={handleToggle}
        isDisabled={isUpdating}
        size="sm"
        color="primary"
        aria-label="Toggle profile visibility"
      />
    </div>
  );
}
