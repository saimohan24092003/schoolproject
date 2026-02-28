import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";

const Header = () => (
  <header className="h-20 w-full border-b-2 border-slate-200 px-6">
    <div className="mx-auto flex h-full items-center justify-between lg:max-w-screen-lg">
      <div className="flex items-center gap-x-3">
        <Image src="/linga-logo.svg" height={40} width={40} alt="Linga logo" />

        <h1 className="text-2xl font-extrabold tracking-wide text-blue-600">
          ExamPrep
        </h1>
      </div>

      <div className="flex items-center gap-x-3">
        <Link href="/dashboard">
          <Button size="lg" variant="secondary">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  </header>
);


export default Header;
