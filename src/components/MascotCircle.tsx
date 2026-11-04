import React from 'react';

export const APP_MASCOT_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

interface MascotCircleProps {
  /** 내가 그린 프로필 이미지(없으면 기본 꼬마 화가 캐릭터) */
  customImage?: string;
  alt?: string;
  /** 크기·테두리·그림자 등 바깥 동그라미 스타일 (예: "w-24 h-24 border-4 border-amber-300") */
  className?: string;
}

/**
 * 첫 화면 / 그림 선택 화면 / 나만의 프로필에서 공통으로 쓰는 동그라미 캐릭터.
 * 기본 캐릭터 원본(1408x768, 여백 큼)을 동그라미 안에 꽉 차게 보여줍니다.
 */
export const MascotCircle: React.FC<MascotCircleProps> = ({
  customImage,
  alt = '다 그렸어요 캐릭터',
  className = '',
}) => {
  const isDefault = !customImage || customImage === APP_MASCOT_URL;

  return (
    <div className={`rounded-full overflow-hidden shrink-0 ${isDefault ? 'bg-[#f5f5f0]' : 'bg-white'} ${className}`}>
      <img
        src={isDefault ? APP_MASCOT_URL : customImage}
        alt={alt}
        className={`w-full h-full block ${isDefault ? 'object-cover scale-[1.15]' : 'object-contain'}`}
      />
    </div>
  );
};
