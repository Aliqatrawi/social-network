"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, CardBody } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { EventCard } from "./EventCard";
import { CreateEventModal } from "./CreateEventModal";
import { EventCardSkeletonList } from "@/components/skeletons/EventCardSkeleton";
import { getGroupEvents, type GroupEvent } from "@/lib/api";

interface EventListProps {
  groupId: string;
  isMember: boolean;
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function EventList({ groupId, isMember }: EventListProps) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    const result = await getGroupEvents(groupId);
    if (result.data) setEvents(result.data);
    setIsLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function handleEventCreated(event: GroupEvent) {
    setEvents((prev) => [...prev, event]);
  }

  if (isLoading) {
    return <EventCardSkeletonList count={3} />;
  }

  return (
    <div className="space-y-4">
      {isMember && (
        <div className="flex justify-end">
          <Button
            size="sm"
            color="primary"
            startContent={<PlusIcon />}
            className="font-semibold shadow-md shadow-primary/20"
            onPress={() => setIsModalOpen(true)}
          >
            Create Event
          </Button>
        </div>
      )}

      {events.length > 0 ? (
        <AnimatePresence mode="popLayout">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onUpdate={loadEvents} />
          ))}
        </AnimatePresence>
      ) : (
        <Card className="glass-card">
        <CardBody className="p-8 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-12 h-12 mx-auto text-default-300 mb-4"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h3 className="font-semibold mb-1">No events</h3>
          <p className="text-default-400 text-sm">
            {isMember ? "Create the first event for this group!" : "No events scheduled yet."}
          </p>
        </CardBody>
        </Card>
      )}

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        groupId={groupId}
        onEventCreated={handleEventCreated}
      />
    </div>
  );
}
