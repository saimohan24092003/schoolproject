import Image from "next/image";
import { Button } from "@/components/ui";

const Footer = () => {
  return (
    <footer className="hidden h-20 w-full border-t-2 border-slate-200 p-2 lg:block">
      <div className="mx-auto flex h-full max-w-screen-lg items-center justify-between px-4">
        <p className="text-sm text-slate-500">
          © 2026 ExamPrep. All rights reserved.
        </p>
        <div className="flex gap-x-4">
          <Button size="sm" variant="defaultOutline" className="text-slate-500 border-none hover:bg-transparent">
            Privacy Policy
          </Button>
          <Button size="sm" variant="defaultOutline" className="text-slate-500 border-none hover:bg-transparent">
            Terms of Service
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
