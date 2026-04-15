"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardBody, Tabs, Tab } from "@heroui/react";
import { motion } from "framer-motion";
import { getGroupDetail, type GroupDetailResponse } from "@/lib/api";
import { GroupHeader } from "@/components/groups/GroupHeader";
import { GroupDetailSkeleton } from "@/components/skeletons/GroupDetailSkeleton";
import { GroupPostsList } from "@/components/groups/GroupPostsList";
import { EventList } from "@/components/groups/EventList";
import { MemberList } from "@/components/groups/MemberList";

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadGroup = useCallback(async () => {
    setIsLoading(true);
    const result = await getGroupDetail(groupId);
    if (result.data) setGroup(result.data);
    setIsLoading(false);
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  if (isLoading) {
    return <GroupDetailSkeleton />;
  }

  if (!group) {
    return (
      <Card className="glass-card">
      <CardBody className="p-8 text-center">
        <h3 className="font-semibold mb-1">Group not found</h3>
        <p className="text-default-400 text-sm">This group may have been deleted.</p>
      </CardBody>
      </Card>
    );
  }

  const canViewContent = group.isMember || group.isCreator;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <GroupHeader group={group} onUpdate={loadGroup} />

      {canViewContent ? (
        <Tabs
          aria-label="Group sections"
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-6",
            cursor: "bg-primary",
          }}
        >
          <Tab key="posts" title="Posts">
            <div className="pt-2">
              <GroupPostsList groupId={groupId} isMember={canViewContent} />
            </div>
          </Tab>
          <Tab key="events" title="Events">
            <div className="pt-2">
              <EventList groupId={groupId} isMember={canViewContent} />
            </div>
          </Tab>
          <Tab key="members" title="Members">
            <div className="pt-2">
              <MemberList
                groupId={groupId}
                isCreator={group.isCreator}
                isMember={canViewContent}
              />
            </div>
          </Tab>
        </Tabs>
      ) : (
        <Card className="glass-card">
        <CardBody className="p-8 text-center">
          <p className="text-default-400 text-sm">
            Join this group to see posts, events, and members.
          </p>
        </CardBody>
        </Card>
      )}
    </motion.div>
  );
}
