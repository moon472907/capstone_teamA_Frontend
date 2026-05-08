export default class BoardManager {
  constructor(scene) {
    this.scene = scene;
    this.nodeMap = {};
    this.mapScale = 1;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
  }

  createBoard() {
    // Get actual dimensions from the scene's scale manager
    const BOARD_W = this.scene.scale.width;
    const BOARD_H = this.scene.scale.height;
    const IMG_W = 1672, IMG_H = 941;

    // Use Math.min for FIT effect to ensure the whole map is visible 
    // within the available screen space without any cropping.
    this.mapScale = Math.min(BOARD_W / IMG_W, BOARD_H / IMG_H);
    
    const dispW = IMG_W * this.mapScale;
    const dispH = IMG_H * this.mapScale;
    
    this.mapOffsetX = (BOARD_W - dispW) / 2;
    this.mapOffsetY = (BOARD_H - dispH) / 2;

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
