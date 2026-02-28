import { Suspense } from "react";

import { ProfilePageSkeleton } from "../../components/page-skeletons";
import Profile from "../../components/profile";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfilePageSkeleton />}>
      <Profile />
    </Suspense>
  );
}
