import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";

import { courses } from "@/server/db/schema";

interface UserProgressProps {
  activeCourse: typeof courses.$inferSelect;
  points: number;
}

const UserProgress = ({
  activeCourse,
  points,
}: UserProgressProps) => (
  <div className="flex w-full items-center justify-between md:gap-x-0.5 lg:gap-x-2">
    <Link href="/dashboard">
      <Button variant="defaultOutline">
        <Image
          alt={activeCourse.title}
          src={activeCourse.imageSrc}
          height={32}
          width={32}
          className="rounded-md border object-cover"
        />
      </Button>
    </Link>

    <Link href="/shop">
      <Button variant="defaultOutline" className="text-orange-500 w-full flex-1 ml-2 justify-center flex">
        <Image
          alt="Points"
          src="/points.svg"
          height={28}
          width={28}
          className="mr-2"
        />
        {points}
      </Button>
    </Link>
  </div>
);

export default UserProgress;
