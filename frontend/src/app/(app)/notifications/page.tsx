"use client";

import { motion } from "framer-motion";
import { NotificationList } from "@/components/notifications/NotificationList";

export default function NotificationsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold">Notifications</h1>
      <NotificationList />
    </motion.div>
  );
}
