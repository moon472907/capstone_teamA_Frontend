const RAW_EVENTS = [
  // 공격 카드 (12장)
  {
    type: 'attack', emoji: '🚔',
    title: '캠퍼스 폴리스에 적발!',
    description: '개인형 이동장치 안전 수칙 미이행으로 단속에 딱 걸렸습니다.',
    count: 3,
  },
  {
    type: 'attack', emoji: '😴',
    title: '팀프로젝트 무임승차 빌런',
    description: '조원이 잠수 모드에 들어갔습니다.',
    count: 2,
  },
  {
    type: 'attack', emoji: '😱',
    title: '수강신청 대 실패',
    description: '수강신청날 늦게 일어난 당신, 무한한 우주 공간에 갇혔습니다.',
    count: 2,
  },
  {
    type: 'attack', emoji: '🍻',
    title: '회식의 저주',
    description: '시험 끝난 기념으로 밤새 달리다가 다음 날 1교시 전공 수업을 못 갔습니다.',
    count: 2,
  },
  {
    type: 'attack', emoji: '🏃',
    title: '출튀한 사람',
    description: '수업시간에 출튀한 사람을 발견하여 교수님에게 말씀드렸습니다.',
    count: 1,
  },
  {
    type: 'attack', emoji: '💔',
    title: '그렇게 과CC를...',
    description: '과CC를 하다가 헤어진 당신, 무인도로 가서 쉬십시오.',
    count: 2,
  },
  // 방어 카드 (8장)
  {
    type: 'defense', emoji: '🐻‍❄️',
    title: '백령 곰두리의 수호',
    description: '강원대학교의 마스코트 곰두리가 당신을 보호합니다!\n점수 차감과 공격을 모두 방어합니다.',
    count: 8,
  },
  // 장학금 카드 (10장)
  {
    type: 'scholarship', emoji: '🏆',
    title: '성적우수 장학금',
    description: '학점 관리에 성공하여 전공 수석을 차지하고 등록금 전액을 면제받았습니다.',
    count: 2,
  },
  {
    type: 'scholarship', emoji: '🌍',
    title: 'KNU미래글로벌인재 장학금',
    description: '우수한 수능 및 직전 학기 성적을 인정받아 미래 글로벌 인재로 선발되었습니다.',
    count: 2,
  },
  {
    type: 'scholarship', emoji: '💼',
    title: '학과사랑 근로장학금',
    description: '학과장님의 은밀한 호출! 든든한 일꾼으로 발탁되었습니다.',
    count: 2,
  },
  {
    type: 'scholarship', emoji: '🎖️',
    title: '국가유공자 및 자녀장학금',
    description: '국가를 위해 헌신하신 숭고한 뜻을 이어받습니다!',
    count: 2,
  },
];

// 확률 가중 덱: count 만큼 반복
const DECK = RAW_EVENTS.flatMap(e => Array(e.count).fill(e));

export function pickRandomEvent() {
  return DECK[Math.floor(Math.random() * DECK.length)];
}

export const EVENT_NODES = new Set([
  'node3', 'node9', 'node13', 'node34', 'node44', 'node47', 'node48', 'node49',
]);

export const EVENT_TYPE_LABEL = {
  attack:      '공격 카드',
  defense:     '방어 카드',
  scholarship: '장학금 카드',
};
