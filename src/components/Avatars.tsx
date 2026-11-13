import { useId, type ReactNode } from 'react';

/**
 * 扁平插畫風格頭像（手繪 SVG，不需要圖片檔）。
 * 頭像本身是插圖，所以顏色寫在這裡、不走主題 token，深淺色主題都一樣。
 */

const INK = '#2B2238';
const BLUSH = '#F28B82';

interface Look {
  bg: string;
  shirt: string;
  collar?: string;
  skin: string;
  skinShade: string;
  hair: string;
  /** 臉後面的頭髮（長髮、包頭） */
  hairBack?: ReactNode;
  /** 蓋在臉上的瀏海／短髮 */
  hairFront: ReactNode;
  extra?: ReactNode;
}

function Face({ look }: { look: Look }) {
  return (
    <>
      <rect width="64" height="64" fill={look.bg} />
      {look.hairBack}
      {/* 肩膀與衣服 */}
      <path d="M8 66 C9 52 19 46 32 46 C45 46 55 52 56 66 Z" fill={look.shirt} />
      {look.collar && <path d="M26 46.5 L32 53 L38 46.5 Z" fill={look.collar} />}
      {/* 脖子 */}
      <path d="M27.5 39 h9 v8.5 c0 2.5 -9 2.5 -9 0 Z" fill={look.skinShade} />
      {/* 耳朵 + 臉 */}
      <circle cx="20.6" cy="31" r="2.6" fill={look.skin} />
      <circle cx="43.4" cy="31" r="2.6" fill={look.skin} />
      <ellipse cx="32" cy="30" rx="11.2" ry="12.6" fill={look.skin} />
      {/* 腮紅、眼睛、鼻子、微笑 */}
      <circle cx="25.6" cy="34.4" r="2.1" fill={BLUSH} opacity="0.45" />
      <circle cx="38.4" cy="34.4" r="2.1" fill={BLUSH} opacity="0.45" />
      <ellipse cx="27.8" cy="30.6" rx="1.25" ry="1.55" fill={INK} />
      <ellipse cx="36.2" cy="30.6" rx="1.25" ry="1.55" fill={INK} />
      <path d="M31.6 32.6 q-0.9 1.9 0.6 2.3" fill="none" stroke={look.skinShade} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M28.8 37 q3.2 2.6 6.4 0" fill="none" stroke={INK} strokeWidth="1.3" strokeLinecap="round" />
      {look.hairFront}
      {look.extra}
    </>
  );
}

export const AVATARS: { id: number; name: string; look: Look }[] = [
  {
    id: 0,
    name: '橘髮小包頭',
    look: {
      bg: '#FBE3D3',
      shirt: '#F7B538',
      skin: '#F7CBAE',
      skinShade: '#E8A985',
      hair: '#E8573A',
      hairBack: (
        <>
          <circle cx="42" cy="13" r="6.2" fill="#E8573A" />
          <path d="M18.5 33 C16 19 23.5 11.5 32 11.5 C41 11.5 48 18.5 45.6 33 C46.5 40 44 45 40.5 45 L23.5 45 C20 45 17.6 40 18.5 33 Z" fill="#E8573A" />
        </>
      ),
      hairFront: <path d="M20.8 29.5 C21 19.5 27 15.6 33.6 15.8 C40 16 44 21 43.3 29 C39.6 23.8 34.6 21.4 28.4 22.6 C25 23.3 22.4 26 20.8 29.5 Z" fill="#E8573A" />,
    },
  },
  {
    id: 1,
    name: '深色短髮',
    look: {
      bg: '#DCEFE0',
      shirt: '#F2765A',
      skin: '#C98B5E',
      skinShade: '#A96F47',
      hair: '#1F2340',
      hairFront: (
        <path d="M20.4 30 C19 18.5 25 12.6 32.8 12.6 C41.5 12.6 46.4 18.6 44.6 28.4 C43.6 24 40.6 21.4 36.4 21 C33 20.8 30 22.4 27.4 21.6 C24.4 23.4 21.8 26.2 20.4 30 Z" fill="#1F2340" />
      ),
    },
  },
  {
    id: 2,
    name: '紫衣刺蝟頭',
    look: {
      bg: '#E8E1FB',
      shirt: '#B9A3F5',
      collar: '#FFFFFF',
      skin: '#F3C9A6',
      skinShade: '#DDA884',
      hair: '#23263A',
      hairFront: (
        <path d="M20.2 29.6 C18.8 18 24.6 11.8 32 11.6 C40.4 11.4 46.2 17.6 44.4 28.6 L41.8 22.6 L38.8 25.4 L36 19.8 L32.4 24.2 L29.4 19.4 L26.4 24.6 L23.4 22.4 Z" fill="#23263A" />
      ),
    },
  },
  {
    id: 3,
    name: '眼鏡丸子頭',
    look: {
      bg: '#D9F2EA',
      shirt: '#9ED99A',
      skin: '#F4D0B2',
      skinShade: '#E0AE8C',
      hair: '#2A2433',
      hairBack: (
        <>
          <circle cx="32" cy="10.4" r="6" fill="#2A2433" />
          <path d="M19.2 32 C17.6 19.6 24.6 13.2 32 13.2 C40 13.2 46.6 19.6 44.8 32 C44.6 36 43.4 38.4 43.4 38.4 L20.6 38.4 C20.6 38.4 19.4 36 19.2 32 Z" fill="#2A2433" />
        </>
      ),
      hairFront: <path d="M20.6 28.6 C21.4 19.4 26.8 16 32.4 16 C38.8 16 43.4 20.4 43.4 27.4 C40.8 23.2 37 21.2 32.6 21.6 L31 19.8 C28 22.2 24 24.4 20.6 28.6 Z" fill="#2A2433" />,
      extra: (
        <g fill="none" stroke={INK} strokeWidth="1.15">
          <circle cx="27.8" cy="30.6" r="3.6" />
          <circle cx="36.2" cy="30.6" r="3.6" />
          <path d="M31.4 30.4 h1.2" />
        </g>
      ),
    },
  },
  {
    id: 4,
    name: '捲髮藍衣',
    look: {
      bg: '#FFF1D6',
      shirt: '#5FB3D9',
      skin: '#8D5A3B',
      skinShade: '#6E422A',
      hair: '#2B1D17',
      hairFront: (
        <g fill="#2B1D17">
          <circle cx="22" cy="25" r="5.4" />
          <circle cx="26.4" cy="18.4" r="5.8" />
          <circle cx="33" cy="15.6" r="6.2" />
          <circle cx="39.8" cy="18.6" r="5.8" />
          <circle cx="43.4" cy="25.2" r="5" />
          <circle cx="20.2" cy="30.6" r="3.6" />
          <circle cx="44.6" cy="30.6" r="3.4" />
          <circle cx="29.8" cy="21.4" r="4.2" />
          <circle cx="36.6" cy="21.2" r="4.2" />
        </g>
      ),
    },
  },
];

export function avatarById(id: number | undefined) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/** 圓形插畫頭像；label 為空時視為裝飾（aria-hidden） */
export function AvatarSvg({ id, label }: { id: number | undefined; label?: string }) {
  const a = avatarById(id);
  // useId 會產生含冒號的 id，放進 url(#…) 前先去掉
  const clip = 'av' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg className="avatar-svg" viewBox="0 0 64 64" role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <Face look={a.look} />
      </g>
    </svg>
  );
}
