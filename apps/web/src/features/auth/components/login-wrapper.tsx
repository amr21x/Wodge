import { OAuth } from "./oauth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginWrapper() {
  return (
    <Card className="z-20 flex w-fit max-w-96 flex-col justify-center border-none bg-transparent shadow-none">
      <CardHeader>
        <CardTitle className="text-center text-2xl">Welcome Back</CardTitle>
        <CardDescription className="text-center">
          Continue with your Google or GitHub account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-8">
        <OAuth />
      </CardContent>
    </Card>
  );
}
