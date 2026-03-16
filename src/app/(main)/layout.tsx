import { Fragment, PropsWithChildren } from "react";
import { Sidebar } from "@/components";
import BottomNav from "@/components/BottomNav";
import HelpButton from "@/components/HelpButton";

const MainLayout = ({ children }: PropsWithChildren) => (
  <Fragment>
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-20 -left-24 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl" />
      <div className="absolute top-12 right-[-5rem] h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />
    </div>

    <Sidebar className="hidden md:flex" />

    <main className="min-h-screen pb-24 pt-4 md:pb-8 md:pl-[280px]">
      <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 lg:px-8">{children}</div>
    </main>

    <BottomNav />
    <HelpButton />
  </Fragment>
);

export default MainLayout;
