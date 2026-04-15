"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
} from "@heroui/react";
import { createGroupEvent, type GroupEvent } from "@/lib/api";
import { showToast } from "@/lib/toast";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onEventCreated?: (event: GroupEvent) => void;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

export function CreateEventModal({ isOpen, onClose, groupId, onEventCreated }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [options, setOptions] = useState<string[]>(["Going", "Not Going"]);
  const [isCreating, setIsCreating] = useState(false);

  // Minimum datetime = now, formatted for datetime-local input
  const now = new Date();
  const minDateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Helper function to validate if a date string is valid
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const isPastDate = dateTime ? (isValidDate(dateTime) && new Date(dateTime) < new Date()) : false;
  const validOptions = options.filter((o) => o.trim().length > 0);
  const hasValidOptions = validOptions.length >= MIN_OPTIONS;

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length < MAX_OPTIONS) {
      setOptions((prev) => [...prev, ""]);
    }
  }

  function removeOption(index: number) {
    if (options.length > MIN_OPTIONS) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleCreate() {
    if (!title.trim() || !description.trim() || !dateTime || !hasValidOptions) return;

    // Validate date is valid
    if (!isValidDate(dateTime)) {
      showToast({ title: "Invalid date", description: "Please enter a valid date and time", color: "danger" });
      return;
    }

    if (isPastDate) {
      showToast({ title: "Invalid date", description: "Event date must be in the future", color: "danger" });
      return;
    }

    setIsCreating(true);
    const result = await createGroupEvent({
      groupId,
      title: title.trim(),
      description: description.trim(),
      dateTime: new Date(dateTime).toISOString(),
      options: validOptions,
    });

    if (result.error) {
      showToast({ title: "Create failed", description: result.error, color: "danger" });
      setIsCreating(false);
      return;
    }

    showToast({ title: "Event created!", color: "success" });
    setTitle("");
    setDescription("");
    setDateTime("");
    setOptions(["Going", "Not Going"]);
    setIsCreating(false);
    onClose();

    if (result.data) {
      onEventCreated?.(result.data);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} placement="center" disableAnimation>
      <ModalContent>
        <ModalHeader>Create Event</ModalHeader>
        <ModalBody>
          <Input
            label="Event name"
            placeholder="e.g. Sprint Planning"
            value={title}
            onValueChange={(value) => {
              if (value.length <= 100) {
                setTitle(value);
              }
            }}
            maxLength={100}
            variant="bordered"
            classNames={{ inputWrapper: "glass-input" }}
            description={`${title.length}/100`}
          />
          <Textarea
            label="Description"
            placeholder="What's this event about?"
            value={description}
            onValueChange={setDescription}
            variant="bordered"
            minRows={2}
            maxRows={4}
            classNames={{ inputWrapper: "glass-input" }}
          />
          <Input
            label="Date & Time"
            type="datetime-local"
            placeholder=" "
            value={dateTime}
            onValueChange={setDateTime}
            variant="bordered"
            labelPlacement="outside"
            min={minDateTime}
            isInvalid={isPastDate || (dateTime ? !isValidDate(dateTime) : false)}
            errorMessage={
              dateTime && !isValidDate(dateTime)
                ? "Invalid date and time"
                : isPastDate
                  ? "Event date must be in the future"
                  : undefined
            }
            classNames={{ inputWrapper: "glass-input" }}
          />

          {/* Response options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-default-600">
                Response Options ({options.length}/{MAX_OPTIONS})
              </p>
              {options.length < MAX_OPTIONS && (
                <Button size="sm" variant="light" color="primary" onPress={addOption} className="min-w-0 h-6 px-2 text-xs">
                  + Add
                </Button>
              )}
            </div>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  size="sm"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onValueChange={(v) => updateOption(i, v)}
                  maxLength={30}
                  variant="bordered"
                  classNames={{ inputWrapper: "glass-input" }}
                  className="flex-1"
                />
                {options.length > MIN_OPTIONS && (
                  <Button
                    size="sm"
                    isIconOnly
                    variant="light"
                    color="danger"
                    onPress={() => removeOption(i)}
                    className="min-w-0 h-8 w-8"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <p className="text-[11px] text-default-400">
              Min {MIN_OPTIONS}, max {MAX_OPTIONS} options. Members will choose one.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isLoading={isCreating}
            isDisabled={!title.trim() || !description.trim() || !dateTime || isPastDate || !hasValidOptions}
            onPress={handleCreate}
          >
            Create
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
