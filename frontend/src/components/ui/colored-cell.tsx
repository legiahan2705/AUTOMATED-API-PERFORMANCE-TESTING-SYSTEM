// components/ui/colored-cell.tsx
import clsx from "clsx";

interface ColoredCellProps {
  value: number | string | null;
  getColor: (value: number) => string;
  suffix?: string;
}

export default function ColoredCell({
  value,
  getColor,
  suffix = "",
}: ColoredCellProps) {
  const num = typeof value === "number" ? value : parseFloat(`${value}`);
  const hasValue = value !== null && !isNaN(num);

  return (
    <div
      className={clsx(
        "inline-block px-2 py-1 rounded-xl text-sm w-fit mx-auto",
        hasValue ? getColor(num) : ""
      )}
    >
      {hasValue ? `${num.toFixed(1)}${suffix}` : "-"}
    </div>
  );
}
