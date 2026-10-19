"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import { Calendar } from "@/components/ui/calendar";
import { TimePickerDemo } from "@/components/time-picker-demo";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker";

export function DateTimePicker({
  bigger,
  date,
  onSetDate,
  includeTime,
  setIncludeTime,
  isEditing,
  onBlur,
  isFilter = false,
}: {
  bigger?: boolean;
  date?: DateRange;
  onSetDate?: (d: DateRange | undefined) => void | Promise<void>;
  includeTime?: boolean;
  setIncludeTime?: (c: boolean) => void;
  isEditing?: boolean;
  isFilter?: boolean;
  onBlur?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={(c) => {
        setOpen(c);

        if (!c) {
          onBlur?.();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant={isFilter ? "outline" : "ghost"}
          size={bigger || isFilter ? "sm" : "fit"}
          className={cn(
            "shrink-0 basis-52 justify-start gap-2 overflow-hidden truncate text-left text-sm font-normal disabled:opacity-85 md:flex-1 md:basis-auto",
            !date && "text-sm text-muted-foreground",
            bigger && "text-sm",
            isFilter && "w-full",
          )}
          disabled={!isEditing}
        >
          {bigger && (
            <div className="flex w-36 items-center gap-2">
              <CalendarDays className={cn("h-4 w-4 text-foreground")} />
              <span className="mr-2">Due date</span>
            </div>
          )}
          {date?.from ? (
            date.to ? (
              <p className="overflow-hidden truncate">
                {format(
                  date.from,
                  includeTime ? "LLL dd, yy HH:mm" : "LLL dd, y",
                )}{" "}
                -{" "}
                {format(
                  date.to,
                  includeTime ? "LLL dd, yy HH:mm" : "LLL dd, y",
                )}
              </p>
            ) : (
              format(date.from, includeTime ? "LLL dd, yy HH:mm" : "LLL dd, y")
            )
          ) : (
            <>
              {!bigger && !isFilter && (
                <CalendarDays
                  className={cn("h-4 w-4 text-foreground", bigger && "h-4 w-4")}
                />
              )}
              <span>{bigger ? "Empty" : isFilter ? "Due" : "Add Due"}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={bigger ? "center" : "start"}
        className=" w-auto p-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={date}
          onSelect={onSetDate}
          initialFocus
          weekStartsOn={6}
        />

        <div className="space-y-4 border-t border-border p-3">
          <div className="flex items-center justify-between gap-1 ">
            <Label htmlFor="time-toggle" className="text-sm">
              Include time
            </Label>
            <Switch
              id="time-toggle"
              checked={includeTime}
              onCheckedChange={(c) => {
                setIncludeTime?.(c);

                if (!c) {
                  onSetDate?.({
                    from: date?.from
                      ? new Date(new Date(date?.from).setHours(0, 0, 0, 0))
                      : undefined,
                    to: date?.to
                      ? new Date(new Date(date?.to).setHours(0, 0, 0, 0))
                      : undefined,
                  });
                }
              }}
            />
          </div>

          {includeTime && (
            <div className="flex w-full flex-col justify-between gap-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm">From</Label>
                <TimePickerDemo
                  disabled={!includeTime}
                  setDate={(d) => {
                    onSetDate?.({
                      from: d,
                      to: date?.to,
                    });
                  }}
                  date={date?.from && new Date(date.from)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>To</Label>
                <TimePickerDemo
                  disabled={!includeTime}
                  setDate={(d) => {
                    onSetDate?.({
                      to: d,
                      from: date?.from,
                    });
                  }}
                  date={date?.to && new Date(date.to)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 border-t border-border p-1">
          <Button
            className="w-full"
            variant="ghost"
            size="fit"
            onClick={() => {
              onSetDate?.(undefined);
            }}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
