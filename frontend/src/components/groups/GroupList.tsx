"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, CardBody, Tabs, Tab } from "@heroui/react";
import { AnimatePresence } from "framer-motion";
import { GroupCard } from "./GroupCard";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupCardSkeletonList } from "@/components/skeletons/GroupCardSkeleton";
import { getAllGroups, getMyGroups, type Group } from "@/lib/api";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function GroupList() {
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    const [allResult, myResult] = await Promise.all([
      getAllGroups(),
      getMyGroups(),
    ]);
    if (allResult.data) setAllGroups(allResult.data);
    if (myResult.data) setMyGroups(myResult.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const myGroupIds = new Set(myGroups.map((g) => g.id));

  function handleGroupCreated(group: Group) {
    setAllGroups((prev) => [group, ...prev]);
    setMyGroups((prev) => [group, ...prev]);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <GroupCardSkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div />
        <Button
          size="sm"
          color="primary"
          startContent={<PlusIcon />}
          className="font-semibold shadow-md shadow-primary/20"
          onPress={() => setIsModalOpen(true)}
        >
          Create Group
        </Button>
      </div>

      <Tabs
        aria-label="Group tabs"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
          cursor: "bg-primary",
        }}
      >
        <Tab key="browse" title="Browse All">
          {allGroups.length > 0 ? (
            <div className="space-y-3 pt-2">
              <AnimatePresence mode="popLayout">
                {allGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isMember={group.isMember || myGroupIds.has(group.id)}
                    hasRequested={group.hasRequested}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="glass-card mt-2">
            <CardBody className="p-8 text-center">
              <p className="text-default-400 text-sm">
                No groups yet. Be the first to create one!
              </p>
            </CardBody>
            </Card>
          )}
        </Tab>
        <Tab key="my" title="My Groups">
          {myGroups.length > 0 ? (
            <div className="space-y-3 pt-2">
              <AnimatePresence mode="popLayout">
                {myGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isMember={true}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card className="glass-card mt-2">
            <CardBody className="p-8 text-center">
              <p className="text-default-400 text-sm">
                You haven&apos;t joined any groups yet.
              </p>
            </CardBody>
            </Card>
          )}
        </Tab>
      </Tabs>

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}
