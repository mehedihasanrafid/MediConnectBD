import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import styles from "./PortalHeader.module.css";

function dateTime() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString("en-US", {
      timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", hour12: true,
    }),
    date: now.toLocaleDateString("en-GB", {
      timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short", year: "numeric",
    }),
  };
}

export function DhakaClock() {
  const [value, setValue] = useState(dateTime);
  useEffect(() => {
    const timer = window.setInterval(() => setValue(dateTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className={styles.clock} aria-label={`Dhaka time: ${value.time}, ${value.date}`}>
    <span><Clock size={12} aria-hidden="true" /> Asia/Dhaka {value.time}</span>
    <small>{value.date}</small>
  </div>;
}
