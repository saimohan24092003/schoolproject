"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui";

type Props = {
  name?: string | null;
  showLabel?: boolean;
};

const AccountControls = ({ name, showLabel = true }: Props) => {
  return (
    <div className="flex items-center gap-x-3 w-full">
      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-10 w-10 border-2 border-blue-100",
            },
          }}
        />
        {showLabel && (
          <div className="flex flex-col">
            <span className="text-sm font-bold">{name || "Student"}</span>
            <span className="text-xs text-gray-500 font-semibold">Target: A*</span>
          </div>
        )}
      </SignedIn>

      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard">
          <Button size="sm" variant="primaryOutline">
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
    </div>
  );
};

export default AccountControls;
