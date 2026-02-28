import { X } from "lucide-react";

import { Progress } from "@/components/ui";
import { useExitModal } from "@/store/use-exit-modal";

type HeaderProps = {
  percentage: number;
};

const Header = ({ percentage }: HeaderProps) => {
  const { open } = useExitModal();

  return (
    <header className="flex items-center justify-between max-w-[1140px] gap-x-7 mx-auto w-full px-6 md:px-10 pt-[20px] lg:pt-[50px]">
      <X
        onClick={open}
        className="text-slate-500 hover:opacity-75 transition cursor-pointer shrink-0"
      />

      <Progress value={percentage} className="w-full" />
    </header>
  );
};

export default Header;
