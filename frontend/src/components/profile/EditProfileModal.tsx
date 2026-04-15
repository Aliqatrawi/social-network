"use client";

import { useState, useEffect, useRef } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Avatar,
  Switch,
} from "@heroui/react";
import {
  updateProfile,
  uploadFile,
  type User,
  type UpdateProfilePayload,
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { validateUsername } from "@/lib/validators";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onProfileUpdated?: (user: User) => void;
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onProfileUpdated,
}: EditProfileModalProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [username, setUsername] = useState(user.username);
  const [aboutMe, setAboutMe] = useState(user.aboutMe || "");

  // File upload state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Privacy state
  const [isPublic, setIsPublic] = useState(user.isPublic);
  const [showPrivacyConfirm, setShowPrivacyConfirm] = useState(false);
  const [pendingPrivacy, setPendingPrivacy] = useState<boolean | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  // Sync form when modal reopens
  useEffect(() => {
    if (isOpen) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setUsername(user.username);
      setAboutMe(user.aboutMe || "");
      setIsPublic(user.isPublic);
      setAvatarFile(null);
      setAvatarPreview(null);
      setBannerFile(null);
      setBannerPreview(null);
      setShowPrivacyConfirm(false);
      setPendingPrivacy(null);
    }
  }, [isOpen, user]);

  const hasChanges =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    username !== user.username ||
    aboutMe !== (user.aboutMe || "") ||
    isPublic !== user.isPublic ||
    avatarFile !== null ||
    bannerFile !== null;

  const usernameValidation = validateUsername(username);
  const isValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    usernameValidation.valid;

  function handleFileSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast({
        title: "Invalid file",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP).",
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

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (type === "avatar") {
        setAvatarFile(file);
        setAvatarPreview(dataUrl);
      } else {
        setBannerFile(file);
        setBannerPreview(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  function removeBanner() {
    setBannerFile(null);
    setBannerPreview(null);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  }

  function handlePrivacyToggle(checked: boolean) {
    setPendingPrivacy(checked);
    setShowPrivacyConfirm(true);
  }

  function confirmPrivacyChange() {
    if (pendingPrivacy !== null) {
      setIsPublic(pendingPrivacy);
    }
    setShowPrivacyConfirm(false);
    setPendingPrivacy(null);
  }

  function cancelPrivacyChange() {
    setShowPrivacyConfirm(false);
    setPendingPrivacy(null);
  }

  async function handleSave() {
    if (!isValid) return;

    setIsSaving(true);

    const payload: UpdateProfilePayload = {};
    if (firstName !== user.firstName) payload.firstName = firstName.trim();
    if (lastName !== user.lastName) payload.lastName = lastName.trim();
    if (username !== user.username) payload.username = username.trim();
    if (aboutMe !== (user.aboutMe || "")) payload.aboutMe = aboutMe.trim();
    if (isPublic !== user.isPublic) payload.isPublic = isPublic;

    // Upload avatar file if selected
    if (avatarFile) {
      const uploadResult = await uploadFile(avatarFile);
      if (uploadResult.error) {
        showToast({
          title: "Avatar upload failed",
          description: uploadResult.error,
          color: "danger",
        });
        setIsSaving(false);
        return;
      }
      payload.avatarUrl = uploadResult.data!.url;
    }

    // Upload banner file if selected
    if (bannerFile) {
      const uploadResult = await uploadFile(bannerFile);
      if (uploadResult.error) {
        showToast({
          title: "Banner upload failed",
          description: uploadResult.error,
          color: "danger",
        });
        setIsSaving(false);
        return;
      }
      payload.bannerUrl = uploadResult.data!.url;
    }

    const result = await updateProfile(payload);

    if (result.error) {
      showToast({
        title: "Update failed",
        description: result.error,
        color: "danger",
      });
      setIsSaving(false);
      return;
    }

    showToast({ title: "Profile updated!", color: "success" });
    setIsSaving(false);
    onClose();

    if (result.data) {
      onProfileUpdated?.(result.data);
    }
  }

  // Determine what to show for avatar src
  const avatarSrc = avatarPreview || user.avatarUrl || undefined;
  // Determine what to show for banner
  const bannerSrc = bannerPreview || user.bannerUrl || null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" size="lg" disableAnimation>
      <ModalContent>
        <ModalHeader>Edit Profile</ModalHeader>
        <ModalBody className="gap-4">
          {/* Banner upload */}
          <div className="flex flex-col gap-2">
            <div
              className="relative rounded-xl overflow-hidden h-28 cursor-pointer group"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerSrc ? (
                <img
                  src={bannerSrc}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="profile-cover w-full h-full" />
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-white flex flex-col items-center gap-1">
                  <CameraIcon />
                  <span className="text-xs">Change banner</span>
                </div>
              </div>
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "banner")}
            />
          </div>

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 -mt-12">
            <div
              className="relative cursor-pointer group"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Avatar
                src={avatarSrc}
                name={`${firstName} ${lastName}`}
                className="w-20 h-20 text-large ring-4 ring-background"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <CameraIcon />
              </div>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => handleFileSelect(e, "avatar")}
            />
            <p className="text-xs text-default-400">
              Click to change profile picture
            </p>
            {avatarPreview && (
              <button
                type="button"
                onClick={removeAvatar}
                className="text-xs text-danger hover:underline"
              >
                Remove new photo
              </button>
            )}
            {bannerPreview && (
              <button
                type="button"
                onClick={removeBanner}
                className="text-xs text-danger hover:underline"
              >
                Remove new banner
              </button>
            )}
          </div>

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="First name"
              value={firstName}
              onValueChange={setFirstName}
              variant="bordered"
              isRequired
              isInvalid={firstName.trim().length === 0}
              errorMessage={
                firstName.trim().length === 0 ? "Required" : undefined
              }
              classNames={{ inputWrapper: "glass-input" }}
            />
            <Input
              label="Last Name"
              placeholder="Last name"
              value={lastName}
              onValueChange={setLastName}
              variant="bordered"
              isRequired
              isInvalid={lastName.trim().length === 0}
              errorMessage={
                lastName.trim().length === 0 ? "Required" : undefined
              }
              classNames={{ inputWrapper: "glass-input" }}
            />
          </div>

          {/* Username */}
          <Input
            label="Username"
            placeholder="your_username"
            value={username}
            onValueChange={setUsername}
            variant="bordered"
            isRequired
            isInvalid={!usernameValidation.valid}
            errorMessage={!usernameValidation.valid ? usernameValidation.error : undefined}
            startContent={
              <span className="text-default-400 text-sm">@</span>
            }
            classNames={{ inputWrapper: "glass-input" }}
          />

          {/* About me */}
          <Textarea
            label="About Me"
            placeholder="Tell people about yourself..."
            value={aboutMe}
            onValueChange={setAboutMe}
            variant="bordered"
            minRows={3}
            maxRows={6}
            classNames={{ inputWrapper: "glass-input" }}
          />

          {/* Privacy toggle */}
          <div className="flex items-center justify-between rounded-xl border border-default-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {isPublic ? "Public Profile" : "Private Profile"}
              </p>
              <p className="text-xs text-default-400">
                {isPublic
                  ? "Everyone can see your profile"
                  : "Only followers can see your full profile"}
              </p>
            </div>
            <Switch
              isSelected={isPublic}
              onValueChange={handlePrivacyToggle}
              size="sm"
              color="primary"
              aria-label="Toggle profile visibility"
            />
          </div>

          {/* Privacy confirmation modal */}
          <Modal
            isOpen={showPrivacyConfirm}
            onClose={cancelPrivacyChange}
            placement="center"
            size="sm"
            disableAnimation
          >
            <ModalContent>
              <ModalHeader>
                {pendingPrivacy ? "Make profile public?" : "Make profile private?"}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  {pendingPrivacy
                    ? "Your profile, posts, and activity will be visible to everyone. Anyone can follow you without approval."
                    : "Only your followers will be able to see your full profile and posts. New followers will need your approval."}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={cancelPrivacyChange}>
                  Cancel
                </Button>
                <Button
                  color={pendingPrivacy ? "primary" : "warning"}
                  onPress={confirmPrivacyChange}
                >
                  {pendingPrivacy ? "Yes, make public" : "Yes, make private"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isLoading={isSaving}
            isDisabled={!hasChanges || !isValid}
            onPress={handleSave}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
