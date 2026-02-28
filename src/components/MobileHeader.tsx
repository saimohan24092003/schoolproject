import { MobileSidebar } from "@/components";
import AccountControls from "@/components/AccountControls";

const MobileHeader = () => (
  <nav className="fixed top-0 z-50 flex h-[60px] w-full items-center justify-between border-b bg-blue-600 px-6 md:hidden">
    <MobileSidebar />

    <div className="flex items-center">
      <div className="[&_.cl-userButtonAvatarBox]:h-9 [&_.cl-userButtonAvatarBox]:w-9 [&_.cl-userButtonAvatarBox]:border-2 [&_.cl-userButtonAvatarBox]:border-white/40">
        <AccountControls showLabel={false} />
      </div>
    </div>
  </nav>
);

export default MobileHeader;
