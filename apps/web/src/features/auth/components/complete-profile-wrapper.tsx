import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompleteProfileForm } from "./complete-profile-form";

export function CompleteProfileWrapper() {
  return (
    <Card className="flex w-full flex-col items-center border-none bg-transparent shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl">Complete your profile</CardTitle>
        <CardDescription>
          You can change your profile at anytime
        </CardDescription>
      </CardHeader>

      <CardContent className="flex w-4/6 flex-col justify-center p-0">
        <CompleteProfileForm />
      </CardContent>
    </Card>
  );
}
