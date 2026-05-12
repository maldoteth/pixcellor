import { CSSProperties } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Override the field name if you suspect bots are wise to "website". */
  name?: string;
}

const hiddenStyle: CSSProperties = {
  position: "absolute",
  left: "-10000px",
  top: "auto",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

/**
 * Off-screen honeypot input. Real users never see or fill it; bots usually do.
 * Pair with `useAntiSpam()` from "@/lib/anti-spam".
 */
export default function HoneypotField({ value, onChange, name = "website" }: Props) {
  return (
    <div aria-hidden="true" style={hiddenStyle}>
      <label>
        Leave this field empty
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
