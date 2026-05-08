const fs = require('fs');
const path = require('path');

const srcDir = path.join('src', 'phaser');

function processFile(filePath, addPhaserImport, addExportClass, extraImports = '') {
  let content = fs.readFileSync(filePath, 'utf8');
  if (addPhaserImport && !content.includes("import Phaser")) {
    content = "import Phaser from 'phaser';\n" + extraImports + content;
  } else {
    content = extraImports + content;
  }
  
  if (addExportClass && content.includes('class ')) {
    content = content.replace(/class (\w+)/, 'export default class $1');
  }
  fs.writeFileSync(filePath, content);
}

processFile(path.join(srcDir, 'logic', 'GameManager.js'), false, true);
processFile(path.join(srcDir, 'logic', 'DiceManager.js'), true, true);
processFile(path.join(srcDir, 'logic', 'BoardManager.js'), false, true);
processFile(path.join(srcDir, 'logic', 'PlayerManager.js'), true, true);

processFile(path.join(srcDir, 'scenes', 'PreloadScene.js'), true, true);
processFile(path.join(srcDir, 'scenes', 'MenuScene.js'), true, true);
processFile(path.join(srcDir, 'scenes', 'MiniGameScene.js'), true, true);

const boardSceneImports = 
  "import GameManager from '../logic/GameManager.js';\n" +
  "import BoardManager from '../logic/BoardManager.js';\n" +
  "import DiceManager from '../logic/DiceManager.js';\n" +
  "import PlayerManager from '../logic/PlayerManager.js';\n";
processFile(path.join(srcDir, 'scenes', 'BoardScene.js'), true, true, boardSceneImports);
