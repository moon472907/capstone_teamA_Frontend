/**
 * 보드게임 칸별 건물 정보 데이터
 * nodeId를 key로 사용하여 해당 노드에 대한 건물 정보를 매핑합니다.
 * 
 * 구조:
 *   name: 건물/장소 이름
 *   image: 이미지 경로 (public 기준)
 *   description: 설명 텍스트 (2~3줄)
 */

const BUILDING_DATA = {
  node12: {
    name: "미래광장",
    image: "/assets/images/buildings/mirae_plaza.png",
    description:
      "미래광장은 대학본부 앞 중심에 자리 잡은 캠퍼스의 상징적인 공간입니다. 넓은 잔디밭과 야외 무대가 있어 평소에는 학생들이 편하게 쉬어가는 쉼터가 되고, 축제 기간에는 활기찬 문화 행사의 장으로 변신하는 만남의 광장입니다.",
  },

  // 다른 건물 정보는 아래에 추가하세요
  // node3: {
  //   name: "중앙도서관",
  //   image: "/assets/images/buildings/library.png",
  //   description: "...",
  // },
};

export default BUILDING_DATA;
