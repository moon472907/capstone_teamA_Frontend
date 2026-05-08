class BoardManager {
  constructor(scene) {
    this.scene = scene;
    this.nodeMap = {};
    this.mapScale = 1;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
  }

  createBoard() {
    // Board display area: y 54~640 (height 586), width 900
    const BOARD_Y = 54, BOARD_H = 586, BOARD_W = 900;
    const IMG_W = 1672, IMG_H = 941;

    this.mapScale = Math.min(BOARD_W / IMG_W, BOARD_H / IMG_H);
    const dispW = IMG_W * this.mapScale;
    const dispH = IMG_H * this.mapScale;
    this.mapOffsetX = (BOARD_W - dispW) / 2;
    this.mapOffsetY = BOARD_Y + (BOARD_H - dispH) / 2;

    // Map background image
    this.scene.add.image(
      this.mapOffsetX + dispW / 2,
      this.mapOffsetY + dispH / 2,
      "map"
    ).setDisplaySize(dispW, dispH).setDepth(5);

    // Parse nodes from Tiled JSON
    const mapData = this.scene.cache.json.get("mapData");
    const objLayer = mapData.layers.find(l => l.type === "objectgroup");
    if (!objLayer) return;

    objLayer.objects.forEach(obj => {
      const props = {};
      (obj.properties || []).forEach(p => { props[p.name] = p.value; });

      const nexts = [];
      if (props.next)  nexts.push(props.next);
      if (props.next2) nexts.push(props.next2);

      this.nodeMap[obj.name] = {
        id:     obj.name,
        x:      obj.x * this.mapScale + this.mapOffsetX,
        y:      obj.y * this.mapScale + this.mapOffsetY,
        next:   nexts.filter(n => n !== obj.name), // remove self-loops
        status: props.status || null
      };
    });
  }

  getNodeById(id) {
    return this.nodeMap[id] || null;
  }
}
