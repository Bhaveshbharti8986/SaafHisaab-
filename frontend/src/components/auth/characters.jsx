
import React from "react";

// SaafHisaab Character Components
// Original architecture preserved.
// SVG viewBox: 160 x 130

export function SethCharacter({
  className = "",
  title = "Mandi owner with ledger",
}) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 160 130"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFDDB9" />
          <stop offset="1" stopColor="#CF895F" />
        </linearGradient>

        <linearGradient id={`${uid}-turban`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFE16A" />
          <stop offset="1" stopColor="#E99A00" />
        </linearGradient>

        <linearGradient id={`${uid}-vest`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#347EE2" />
          <stop offset="1" stopColor="#153C85" />
        </linearGradient>
      </defs>

      {/* Background */}
      <circle cx="80" cy="73" r="61" fill="#DBEAFE" />
      <circle cx="80" cy="73" r="51" fill="#EFF6FF" />

      {/* Mandi weighing scale */}
      <g opacity=".65" transform="translate(5 49)">
        <path
          d="M25 18V64M10 26H40M25 18V10"
          stroke="#397DBD"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M10 26L3 43H17Z" fill="#FBBF24" stroke="#397DBD" />
        <path d="M40 26L33 43H47Z" fill="#FBBF24" stroke="#397DBD" />
        <path
          d="M3 43Q10 51 17 43M33 43Q40 51 47 43"
          fill="none"
          stroke="#397DBD"
          strokeWidth="2"
        />
        <path d="M12 65H38" stroke="#397DBD" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Body and clothing */}
      <path
        d="M22 132C25 101 42 83 80 81C119 81 137 103 140 132Z"
        fill="#FFF5E5"
      />

      <path
        d="M42 91C52 83 64 80 80 80C96 80 110 84 120 94L137 132H25Z"
        fill={`url(#${uid}-vest)`}
      />

      {/* Shirt */}
      <path d="M69 83L80 99L91 83L86 132H74Z" fill="#FFF4DE" />

      <path d="M80 103V127" stroke="#D6A44D" strokeWidth="1.5" />
      <circle cx="80" cy="109" r="2" fill="#EAB65B" />
      <circle cx="80" cy="119" r="2" fill="#EAB65B" />

      {/* Neck */}
      <path
        d="M67 70H93V92Q80 105 67 92Z"
        fill={`url(#${uid}-skin)`}
      />

      {/* Face */}
      <ellipse cx="80" cy="52" rx="24" ry="29" fill={`url(#${uid}-skin)`} />

      {/* Ears */}
      <ellipse cx="56" cy="54" rx="5" ry="8" fill="#DFA078" />
      <ellipse cx="104" cy="54" rx="5" ry="8" fill="#DFA078" />

      {/* Hairline */}
      <path
        d="M57 43C60 32 70 26 80 26C92 26 101 33 103 43"
        fill="none"
        stroke="#493020"
        strokeWidth="4"
      />

      {/* Eyes */}
      <path
        d="M64 47Q70 43 76 47M84 47Q90 43 96 47"
        stroke="#493020"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="70" cy="53" rx="3" ry="4" fill="#302019" />
      <ellipse cx="90" cy="53" rx="3" ry="4" fill="#302019" />
      <circle cx="71" cy="52" r="1.2" fill="#FFFFFF" />
      <circle cx="91" cy="52" r="1.2" fill="#FFFFFF" />

      {/* Nose */}
      <path
        d="M78 54L75 64Q80 68 85 64"
        stroke="#BD7955"
        strokeWidth="1.5"
        fill="none"
      />

      {/* Thick moustache */}
      <path
        d="M79 68C73 62 64 64 60 69C66 81 75 77 80 73C85 77 94 81 100 69C96 64 87 62 81 68Z"
        fill="#33251D"
      />

      {/* Smile */}
      <path
        d="M75 77Q80 80 85 77"
        stroke="#994F34"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Yellow turban */}
      <path
        d="M54 42C51 25 63 13 81 12C100 11 111 24 108 43C97 37 91 34 80 34C69 34 61 38 54 42Z"
        fill={`url(#${uid}-turban)`}
      />

      <path
        d="M54 34C67 24 91 22 106 34M53 42C69 31 91 31 108 41M62 19C70 12 91 11 101 20"
        stroke="#E99A00"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M106 23Q122 25 116 44Q111 41 106 40Z"
        fill="#F5AE1D"
      />

      {/* Folded arms */}
      <path
        d="M35 104C47 91 61 95 78 107L91 116L80 129H37Z"
        fill="#174A9C"
      />

      <path
        d="M124 104C112 91 98 95 82 107L68 117L80 130H122Z"
        fill="#245DB5"
      />

      <path
        d="M53 108Q75 119 108 105"
        stroke="#E7B78F"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M67 118L94 118"
        stroke="#F0C49E"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}


// ==========================================
// MUNSHI CHARACTER
// ==========================================

export function MunshiCharacter({
  className = "",
  title = "Accountant or clerk with clipboard",
}) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 160 130"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFD9B8" />
          <stop offset="1" stopColor="#CD916A" />
        </linearGradient>

        <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#20AD9C" />
          <stop offset="1" stopColor="#08645E" />
        </linearGradient>
      </defs>

      {/* Background */}
      <circle cx="80" cy="73" r="61" fill="#CCF5EA" />
      <circle cx="80" cy="73" r="51" fill="#E8FBF5" />

      {/* Calculator */}
      <g transform="translate(8 69)">
        <rect x="0" y="0" width="34" height="45" rx="6" fill="#56BDAF" />
        <rect x="5" y="5" width="24" height="10" rx="2" fill="#D8FFF4" />

        <g fill="#E5FFF7">
          <rect x="5" y="20" width="5" height="5" rx="1" />
          <rect x="14" y="20" width="5" height="5" rx="1" />
          <rect x="23" y="20" width="5" height="5" rx="1" />
          <rect x="5" y="29" width="5" height="5" rx="1" />
          <rect x="14" y="29" width="5" height="5" rx="1" />
          <rect x="23" y="29" width="5" height="5" rx="1" />
        </g>
      </g>

      {/* Body */}
      <path
        d="M20 132C24 101 45 83 80 82C117 82 138 104 141 132Z"
        fill={`url(#${uid}-shirt)`}
      />

      {/* Shirt collar */}
      <path d="M64 84L80 103L96 84L88 78H72Z" fill="#FFFFFF" />
      <path d="M80 102V130" stroke="#075E57" strokeWidth="2" />
      <circle cx="80" cy="111" r="2" fill="#FDE68A" />
      <circle cx="80" cy="122" r="2" fill="#FDE68A" />

      {/* Neck */}
      <path
        d="M68 70H92V91Q80 101 68 91Z"
        fill={`url(#${uid}-skin)`}
      />

      {/* Face */}
      <ellipse cx="80" cy="51" rx="23" ry="28" fill={`url(#${uid}-skin)`} />

      {/* Ears */}
      <ellipse cx="57" cy="54" rx="5" ry="8" fill="#D99E79" />
      <ellipse cx="103" cy="54" rx="5" ry="8" fill="#D99E79" />

      {/* Hair */}
      <path
        d="M56 44C55 24 65 14 80 14C97 14 106 27 104 46C99 35 92 31 83 31C72 31 65 37 56 44Z"
        fill="#202B37"
      />

      <path
        d="M65 25Q76 15 91 23"
        stroke="#475569"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* Glasses */}
      <rect
        x="61" y="46" width="17" height="15" rx="6"
        fill="#FFFFFF" fillOpacity=".35"
        stroke="#124E4A" strokeWidth="2.5"
      />

      <rect
        x="82" y="46" width="17" height="15" rx="6"
        fill="#FFFFFF" fillOpacity=".35"
        stroke="#124E4A" strokeWidth="2.5"
      />

      <path
        d="M78 52H82M57 49L61 51M99 51L103 49"
        stroke="#124E4A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="70" cy="54" rx="2.3" ry="3" fill="#263238" />
      <ellipse cx="90" cy="54" rx="2.3" ry="3" fill="#263238" />
      <circle cx="71" cy="53" r="1" fill="#FFFFFF" />
      <circle cx="91" cy="53" r="1" fill="#FFFFFF" />

      {/* Nose */}
      <path
        d="M79 55L76 64Q80 67 84 64"
        fill="none"
        stroke="#BD7955"
        strokeWidth="1.5"
      />

      {/* Smile */}
      <path
        d="M73 72Q80 78 87 72"
        fill="none"
        stroke="#934D36"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Clipboard */}
      <g transform="rotate(-5 120 110)">
        <rect x="101" y="82" width="43" height="52" rx="4" fill="#7B5135" />
        <rect x="105" y="88" width="35" height="43" rx="2" fill="#FFFDF5" />
        <rect x="115" y="78" width="16" height="11" rx="3" fill="#A6F3DE" stroke="#11665F" strokeWidth="1.5" />

        <path
          d="M110 99L113 102L118 96M122 100H135M110 112L113 115L118 109M122 113H135M110 124H135"
          stroke="#159A88"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Hand holding clipboard */}
      <path
        d="M101 113Q107 107 113 114L117 122Q112 130 105 125Z"
        fill={`url(#${uid}-skin)`}
      />

      {/* Pen */}
      <path d="M91 102L102 119" stroke="#263F52" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M90 101L94 105" stroke="#E6B64A" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}


// ==========================================
// LABOUR CHARACTER
// ==========================================

export function LabourCharacter({
  className = "",
  title = "Weighing staff with sack",
}) {
  const uid = React.useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 160 130"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F6C795" />
          <stop offset="1" stopColor="#B9764B" />
        </linearGradient>

        <linearGradient id={`${uid}-shirt`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F28B35" />
          <stop offset="1" stopColor="#BD4C12" />
        </linearGradient>

        <linearGradient id={`${uid}-sack`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F4DEB4" />
          <stop offset="1" stopColor="#C6A16D" />
        </linearGradient>

        <linearGradient id={`${uid}-head`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FFD34D" />
          <stop offset="1" stopColor="#E99B15" />
        </linearGradient>
      </defs>

      {/* Background */}
      <circle cx="80" cy="73" r="61" fill="#FFEDD8" />
      <circle cx="80" cy="73" r="51" fill="#FFF6E8" />

      {/* Farm silhouette */}
      <g opacity=".45" fill="#E9C28C">
        <path d="M5 102L23 87L41 102V118H5Z" />
        <path d="M2 87L23 72L45 87Z" />
        <path d="M14 105H22V118H14Z" fill="#B9854D" />
      </g>

      {/* Body */}
      <path
        d="M24 132C28 102 47 84 80 83C115 83 135 105 139 132Z"
        fill={`url(#${uid}-shirt)`}
      />

      {/* Shirt details */}
      <path d="M65 86L80 103L95 86" stroke="#A83F0E" strokeWidth="3" fill="none" />
      <path d="M80 103V130" stroke="#A83F0E" strokeWidth="2" />
      <circle cx="80" cy="112" r="2" fill="#FFE0A3" />
      <circle cx="80" cy="123" r="2" fill="#FFE0A3" />

      {/* Neck */}
      <path
        d="M68 71H92V92Q80 101 68 92Z"
        fill={`url(#${uid}-skin)`}
      />

      {/* Face */}
      <ellipse cx="80" cy="52" rx="23" ry="28" fill={`url(#${uid}-skin)`} />

      {/* Ears */}
      <ellipse cx="57" cy="55" rx="5" ry="8" fill="#C88B5D" />
      <ellipse cx="103" cy="55" rx="5" ry="8" fill="#C88B5D" />

      {/* Eyes */}
      <path
        d="M64 48Q70 44 76 48M84 48Q90 44 96 48"
        stroke="#493020"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="70" cy="54" rx="2.5" ry="3.5" fill="#302019" />
      <ellipse cx="90" cy="54" rx="2.5" ry="3.5" fill="#302019" />
      <circle cx="71" cy="53" r="1" fill="#FFFFFF" />
      <circle cx="91" cy="53" r="1" fill="#FFFFFF" />

      {/* Nose */}
      <path
        d="M79 56L76 65Q80 68 84 65"
        fill="none"
        stroke="#A96846"
        strokeWidth="1.5"
      />

      {/* Friendly smile */}
      <path
        d="M71 71Q80 79 89 71"
        stroke="#873F2A"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Head scarf */}
      <path
        d="M54 42C51 28 63 17 80 16C98 15 110 28 106 44C97 37 90 35 80 35C69 35 62 38 54 42Z"
        fill={`url(#${uid}-head)`}
      />

      <path
        d="M55 34Q80 22 106 34M54 41Q80 29 106 41"
        stroke="#D98712"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      <path d="M104 27Q120 30 112 48L105 43Z" fill="#F5B82D" />

      {/* Grain sack */}
      <path
        d="M111 76C111 65 119 59 132 61C145 63 153 73 152 87L151 127H111Z"
        fill={`url(#${uid}-sack)`}
      />

      <path
        d="M115 75Q131 68 148 78M113 91Q131 84 151 93"
        stroke="#B58D58"
        strokeWidth="2"
        fill="none"
      />

      <path
        d="M114 67Q130 53 145 68"
        stroke="#D1AE7B"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Sack label */}
      <path d="M119 98H144V119H119Z" fill="#E9D4AC" />

      <text
        x="131.5"
        y="112"
        fontSize="10"
        fontWeight="800"
        textAnchor="middle"
        fill="#8C5B2C"
        fontFamily="Arial, sans-serif"
      >
        50kg
      </text>

      {/* Arm and hand */}
      <path
        d="M38 103Q51 90 64 100L77 119L69 130H35Z"
        fill="#E7792D"
      />

      <path
        d="M96 96Q105 88 116 85"
        stroke="#C78357"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M101 91Q109 83 116 78"
        stroke={`url(#${uid}-skin)`}
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx="112" cy="79" rx="7" ry="9" fill={`url(#${uid}-skin)`} />
    </svg>
  );
}


// ==========================================
// ROLE-BASED CHARACTER SELECTOR
// ==========================================

export function CharacterForRole({ role, className = "" }) {
  if (role === "munshi") {
    return <MunshiCharacter className={className} />;
  }

  if (role === "labour") {
    return <LabourCharacter className={className} />;
  }

  return <SethCharacter className={className} />;
}
