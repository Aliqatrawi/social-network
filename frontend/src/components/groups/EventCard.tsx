"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Tab,
  Tabs,
} from "@heroui/react";
import { motion } from "framer-motion";
import {
  respondToGroupEvent,
  getEventRespondents,
  type GroupEvent,
  type EventOption,
  type EventRespondent,
} from "@/lib/api";
import { showToast } from "@/lib/toast";

interface EventCardProps {
  event: GroupEvent;
  onUpdate?: () => void;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isEventEnded(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

// Cycle through colors for option buttons
const OPTION_COLORS: ("success" | "danger" | "primary" | "warning")[] = ["success", "danger", "primary", "warning"];

function RespondentList({ users, emptyText }: { users: EventRespondent[]; emptyText: string }) {
  if (users.length === 0) {
    return <p className="text-default-400 text-sm text-center py-4">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl">
          <Avatar
            src={user.avatarUrl}
            name={`${user.firstName} ${user.lastName}`}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.firstName} {user.lastName}
            </p>
            {user.username && (
              <p className="text-xs text-default-400 truncate">@{user.username}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface OptionRespondents {
  id: string;
  label: string;
  respondents: EventRespondent[];
}

export function EventCard({ event, onUpdate }: EventCardProps) {
  const [myResponse, setMyResponse] = useState<string | null>(event.userResponse || null);
  const [optionCounts, setOptionCounts] = useState<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    (event.options || []).forEach((opt) => { counts[opt.id] = opt.count; });
    return counts;
  });
  const [isResponding, setIsResponding] = useState(false);
  const [showRespondents, setShowRespondents] = useState(false);
  const [optionRespondents, setOptionRespondents] = useState<OptionRespondents[]>([]);
  const [isLoadingRespondents, setIsLoadingRespondents] = useState(false);

  const hasEventEnded = isEventEnded(event.dateTime);
  const options = event.options || [];
  const totalResponses = Object.values(optionCounts).reduce((a, b) => a + b, 0);

  async function handleRespond(optionId: string) {
    setIsResponding(true);
    const result = await respondToGroupEvent(event.id, optionId);

    if (result.error) {
      showToast({ title: "Response failed", description: result.error, color: "danger" });
      setIsResponding(false);
      return;
    }

    // Toggle: if same option clicked, remove response; otherwise switch
    setOptionCounts((prev) => {
      const next = { ...prev };
      if (myResponse === optionId) {
        // Un-selecting current choice
        next[optionId] = Math.max(0, (next[optionId] || 0) - 1);
      } else {
        // Remove from old option
        if (myResponse && next[myResponse] !== undefined) {
          next[myResponse] = Math.max(0, next[myResponse] - 1);
        }
        // Add to new option
        next[optionId] = (next[optionId] || 0) + 1;
      }
      return next;
    });

    setMyResponse((prev) => (prev === optionId ? null : optionId));
    setIsResponding(false);
    onUpdate?.();
  }

  async function handleShowRespondents() {
    setShowRespondents(true);
    setIsLoadingRespondents(true);
    const result = await getEventRespondents(event.id);
    if (result.data?.options) {
      setOptionRespondents(result.data.options);
    } else if (result.data) {
      // Fallback for legacy data
      const legacy: OptionRespondents[] = [];
      if (result.data.going) legacy.push({ id: "going", label: "Going", respondents: result.data.going });
      if (result.data.notGoing) legacy.push({ id: "not_going", label: "Not Going", respondents: result.data.notGoing });
      setOptionRespondents(legacy);
    }
    setIsLoadingRespondents(false);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="glass-card shadow-sm">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <Avatar
                name={event.title.charAt(0)}
                size="sm"
                className="shrink-0 bg-secondary/20 text-secondary"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{event.title}</h3>
                <p className="text-xs text-default-500 mt-0.5">{event.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-default-400">
                  <CalendarIcon />
                  <span>{formatEventDate(event.dateTime)}</span>
                </div>
                <p className="text-[10px] text-default-400 mt-1">
                  by {event.createdBy?.firstName} {event.createdBy?.lastName}
                </p>
              </div>
            </div>

            {/* Response buttons */}
            {hasEventEnded ? (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-default-400 text-center py-2">
                  Event has ended
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                {options.map((opt, i) => (
                  <Button
                    key={opt.id}
                    size="sm"
                    variant={myResponse === opt.id ? "solid" : "flat"}
                    color={OPTION_COLORS[i % OPTION_COLORS.length]}
                    isDisabled={isResponding}
                    onPress={() => handleRespond(opt.id)}
                    className="flex-1 min-w-[80px]"
                  >
                    {opt.label} ({optionCounts[opt.id] || 0})
                  </Button>
                ))}
              </div>
            )}

            {/* See responses link */}
            {totalResponses > 0 && (
              <button
                onClick={handleShowRespondents}
                className="flex items-center gap-1.5 mt-2 text-xs text-primary hover:text-primary-400 transition-colors cursor-pointer"
              >
                <UsersIcon />
                <span>See responses</span>
              </button>
            )}
          </CardBody>
        </Card>
      </motion.div>

      {/* Respondents Modal */}
      <Modal
        isOpen={showRespondents}
        onClose={() => setShowRespondents(false)}
        placement="center"
        scrollBehavior="inside"
        disableAnimation
      >
        <ModalContent>
          <ModalHeader>Event Responses</ModalHeader>
          <ModalBody className="pb-6">
            {isLoadingRespondents ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs variant="underlined" fullWidth classNames={{ tabList: "gap-4" }}>
                {optionRespondents.map((opt) => (
                  <Tab
                    key={opt.id}
                    title={
                      <div className="flex items-center gap-1.5">
                        <span>{opt.label} ({opt.respondents.length})</span>
                      </div>
                    }
                  >
                    <RespondentList users={opt.respondents} emptyText={`No one chose "${opt.label}" yet.`} />
                  </Tab>
                ))}
              </Tabs>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
