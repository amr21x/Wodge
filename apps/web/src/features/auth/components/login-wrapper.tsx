import Link from "next/link";

import { EmailWrapper } from "./email-wrapper";
import { OAuth } from "./oauth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function LoginWrapper() {
  return (
    <Card className="z-20  flex w-fit max-w-96 flex-col justify-center border-none bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Enter your email below to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-8">
        <EmailWrapper />

        <div className="relative flex justify-center ">
          <div className="absolute inset-0 flex items-center px-0.5">
            <Separator />
          </div>

          <div className="relative flex w-fit justify-center bg-background text-xs uppercase">
            <span className="bg-page px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="px-0.5">
          <OAuth />
        </div>
      </CardContent>

      {/* <CardFooter className="mt-4 flex px-8 text-sm text-muted-foreground">
        <p className="px-0.5">
          By logging in, you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </CardFooter> */}
    </Card>
  );
}
