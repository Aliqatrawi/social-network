"use client";

import { motion } from "framer-motion";
import { GroupList } from "@/components/groups/GroupList";

export default function GroupsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold">Groups</h1>
      <GroupList />
    </motion.div>
  );
}
