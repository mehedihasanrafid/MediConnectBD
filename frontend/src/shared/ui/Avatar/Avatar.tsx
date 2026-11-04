import { useState } from "react";
import clsx from "clsx";
import styles from "./Avatar.module.css";
import { apiAssetUrl } from "../../utils/apiAssetUrl";

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Avatar(props: AvatarProps) {
  return <AvatarImage key={props.src ?? props.name} {...props} />;
}

function AvatarImage({ name, src, size = "md", className }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const resolved = apiAssetUrl(src);
  const showImage = Boolean(resolved) && !hasError;

  return (
    <span data-size={size} className={clsx(styles.root, className)} aria-hidden={!showImage}>
      {showImage ? (
        <img
          src={resolved}
          alt={name}
          className={styles.img}
          onError={() => setHasError(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
