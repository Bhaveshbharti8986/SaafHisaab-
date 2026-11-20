import React from "react";

import sethImage from "../assets/characters/seth.png";
import munshiImage from "../assets/characters/munshi.png";
import labourImage from "../assets/characters/labour.png";
import { useTranslation } from "../lib/i18n.jsx";

export function SethCharacter({
  className = "",
  title = "Mandi owner with ledger",
}) {
  const { t } = useTranslation();

  return (
    <img
      src={sethImage}
      alt={t(title)}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}

export function MunshiCharacter({
  className = "",
  title = "Accountant or clerk with clipboard",
}) {
  const { t } = useTranslation();

  return (
    <img
      src={munshiImage}
      alt={t(title)}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}

export function LabourCharacter({
  className = "",
  title = "Weighing staff with sack",
}) {
  const { t } = useTranslation();

  return (
    <img
      src={labourImage}
      alt={t(title)}
      className={`${className} object-contain`}
      draggable={false}
    />
  );
}

export function CharacterForRole({ role, className = "" }) {
  if (role === "munshi") {
    return <MunshiCharacter className={className} />;
  }

  if (role === "labour") {
    return <LabourCharacter className={className} />;
  }

  return <SethCharacter className={className} />;
}
