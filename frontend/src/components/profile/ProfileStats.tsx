"use client";

interface ProfileStatsProps {
  followersCount: number;
  followingCount: number;
  activitiesCount: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onActivitiesClick?: () => void;
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PersonPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function ProfileStats({
  followersCount,
  followingCount,
  activitiesCount,
  onFollowersClick,
  onFollowingClick,
  onActivitiesClick,
}: ProfileStatsProps) {
  const stats = [
    { label: "Followers", value: followersCount, onClick: onFollowersClick, icon: <PeopleIcon /> },
    { label: "Following", value: followingCount, onClick: onFollowingClick, icon: <PersonPlusIcon /> },
    { label: "Activities", value: activitiesCount, onClick: onActivitiesClick, icon: <ActivityIcon /> },
  ];

  return (
    <div className="flex items-center justify-around py-3 my-2 border-y border-default-200/50">
      {stats.map((stat) => (
        <button
          key={stat.label}
          onClick={stat.onClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors hover:bg-default-100/50 cursor-pointer"
        >
          <span className="text-primary">{stat.icon}</span>
          <span className="text-sm font-bold">{stat.value}</span>
          <span className="text-xs text-default-500">{stat.label}</span>
        </button>
      ))}
    </div>
  );
}
