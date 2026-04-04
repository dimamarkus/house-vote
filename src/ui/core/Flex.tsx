import * as React from "react";
import { cn } from "../utils/cn";

type Align = "start" | "center" | "end" | "stretch";
type Justify =
  | "start"
  | "center"
  | "end"
  | "between"
  | "around"
  | "evenly";

type FlexProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: Align;
  justify?: Justify;
};

function getAlignClass(align: Align) {
  return {
    center: "items-center",
    end: "items-end",
    start: "items-start",
    stretch: "items-stretch",
  }[align];
}

function getJustifyClass(justify: Justify) {
  return {
    around: "justify-around",
    between: "justify-between",
    center: "justify-center",
    end: "justify-end",
    evenly: "justify-evenly",
    start: "justify-start",
  }[justify];
}

function Row({
  align = "stretch",
  className,
  justify = "start",
  ...props
}: FlexProps) {
  return (
    <div
      className={cn("flex", getAlignClass(align), getJustifyClass(justify), className)}
      {...props}
    />
  );
}

function Column({
  align = "stretch",
  className,
  justify = "start",
  ...props
}: FlexProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        getAlignClass(align),
        getJustifyClass(justify),
        className,
      )}
      {...props}
    />
  );
}

export const Flex = {
  Column,
  Row,
};
