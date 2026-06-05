// 캐릭터 로스터 단일 소스.
//
// 서버는 멀티플레이에서 고정된 characterKey(gomduri/narae/...)로 캐릭터를 배정하므로
// 서버로 전송되는 `id`(=characterKey)는 그대로 유지하고,
// 각 id 에 새 에셋(이름/아이콘/idle·run 스프라이트시트)을 입힌다.
//
// 에셋 메타데이터는 scripts/process_characters.py 가 생성하는 characterManifest.json 에서 온다.
import manifest from './characterManifest.json';

export const CHARACTER_MANIFEST = manifest;

// 서버 characterKey  ->  에셋 키  매핑 (1:1)
const ROSTER = [
  { id: 'gomduri',  assetKey: 'agriculture_duri', desc: '밀밭을 일구는 농학두리' },
  { id: 'narae',    assetKey: 'graduate_duri',    desc: '학위를 받은 졸업두리' },
  { id: 'daramji',  assetKey: 'gym_duri',         desc: 'KNU 점퍼의 헬스두리' },
  { id: 'bunny',    assetKey: 'medical_duri',     desc: '청진기를 든 의학두리' },
  { id: 'fox',      assetKey: 'nurse_duri',       desc: '환자를 돌보는 간호두리' },
  { id: 'cat',      assetKey: 'laboratory_duri',  desc: '실험에 진심인 연구두리' },
];

export const CHARACTERS = ROSTER.map(({ id, assetKey, desc }) => {
  const m = manifest[assetKey] || {};
  return {
    id,
    assetKey,
    name: m.name || id,
    icon: m.icon || '',   // 이미지 URL (이모지가 아님)
    desc,
  };
});

const BY_KEY = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

// 서버 characterKey(또는 로컬 캐릭터 id) -> 에셋 키
export const assetKeyFor = (characterKey) =>
  BY_KEY[characterKey]?.assetKey || CHARACTERS[0].assetKey;

// 서버 characterKey -> 아이콘 이미지 URL
export const iconFor = (characterKey) =>
  BY_KEY[characterKey]?.icon || CHARACTERS[0].icon;
