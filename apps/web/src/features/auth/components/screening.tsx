import { useTheme } from "next-themes";
import { Logo } from "../../../components/logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, MoonStar, Sun } from "lucide-react";
import { cn } from "@/lib/utils/index";

function Wrapper({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="-mb-6 border-none bg-transparent text-center shadow-none">
      <CardHeader className="flex flex-col items-center">
        <Logo />
        <CardTitle className="text-4xl">{title}</CardTitle>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function Welcome() {
  return (
    <Wrapper
      title="Welcome onboard!"
      description="Wodge helps you collaborate, communicate, and manage your knowledge in one place."
    />
  );
}

export function Outro() {
  return (
    <Wrapper
      title="You're all set!"
      description="Maximizing your team productivity is just a click away"
    />
  );
}

export function Themes() {
  const { setTheme, theme } = useTheme();

  return (
    <Card className="-mb-6 border-none bg-transparent text-center shadow-none">
      <CardHeader className="flex flex-col items-center">
        <Logo />
        <CardTitle className="text-4xl">Choose your theme</CardTitle>
        <CardDescription className="text-base">
          You can change the theme later
        </CardDescription>

        <CardContent>
          <div className="-mb-5 mt-2 flex h-full items-center gap-2">
            <Button
              variant="outline"
              className={cn(
                "h-full w-20 flex-col gap-1",
                theme === "dark" && "bg-accent",
              )}
              onClick={() => setTheme("dark")}
            >
              <MoonStar className="h-6 w-6" />
              <span>Dark</span>
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-full w-20 flex-col gap-1",
                theme === "light" && "bg-accent",
              )}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-6 w-6" />
              <span>Light</span>
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-full w-20 flex-col gap-1",
                theme === "system" && "bg-accent",
              )}
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-6 w-6" />
              <span>System</span>
            </Button>
          </div>
        </CardContent>
      </CardHeader>
    </Card>
  );
}
