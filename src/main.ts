import * as PIXI from "pixi.js";

const cell_size_px: number = 40;
const cell_margin_px: number = 4;
const initial_fill_rows: number = 4;

let firstSelected: Cell | null = null;


type Coordinate = {x: number, y: number};


class Cell {
  value: number | null = null;
  container: PIXI.Container = new PIXI.Container();
  background: PIXI.Graphics = new PIXI.Graphics();
  display_value: PIXI.Text = new PIXI.Text();
  coordinate: Coordinate;
  selected: boolean = false;


  constructor(coord: Coordinate) {
    this.container.addChild(this.background);
    this.container.addChild(this.display_value);
    this.coordinate = coord;

    this.display_value.position.x = 10;
    this.display_value.position.y = 10;

    this.container.position.x = this.coordinate.x * (cell_size_px + cell_margin_px) + cell_margin_px;
    this.container.position.y = this.coordinate.y * (cell_size_px + cell_margin_px) + cell_margin_px;

    this.container.eventMode = 'static';
    this.container.on('pointerdown', () => {
      if (this.value !== null) {
        console.log(`click: selected ${this.selected}`);
        this.selected = !this.selected;
        this.background.clear()
        this.background.rect(cell_margin_px, cell_margin_px, cell_size_px, cell_size_px)
        
        this.update();

        if (this.selected && firstSelected === null) {
          firstSelected = this;
        } else if (firstSelected !== null) {
          tryMatch(firstSelected, this);
        }
      }
    });
  }

  update() {
    if (this.selected) {
      this.background.fill('gray');
    } else {
      this.background.fill('#dee2e6');
    }
  }


  draw() {
    this.background.clear();
    this.background.rect(cell_margin_px, cell_margin_px, cell_size_px, cell_size_px)
      .fill('#dee2e6');


    if (this.value !== null) {
      this.display_value.text = this.value;
      this.display_value.anchor.set(0.5);
      
      const center_dist_px = (cell_size_px + 2 * cell_margin_px) / 2; 

      this.display_value.position.x = center_dist_px;
      this.display_value.position.y = center_dist_px;
    } else {
      this.display_value.text = '';
    }
  }
}



const grid: Array<Array<Cell>> = [];
const board_width = 20;
const initial_board_height = 20;

function isMatch(cell1: Cell, cell2: Cell): boolean{
  if (cell1.value === null || cell2.value === null) {
    throw new Error(`isMatch() called with undefined cell values (cell1: ${cell1.value}, cell2: ${cell2.value})`);
  }

  return cell1.value === cell2.value || cell1.value + cell2.value == 10;
}


function stepTestCoord(coord: Coordinate, step: Coordinate) {
  coord.x += step.x;
  coord.y += step.y;
}

const matchAnimationContainer: PIXI.Container = new PIXI.Container();
const matchAnimationGraphics: PIXI.Graphics = new PIXI.Graphics();
matchAnimationContainer.addChild(matchAnimationGraphics);

function matchAnimation(startCell: Cell, endCell: Cell, wrap: boolean): void {
  function getCellGlobalCenter(cell: Cell): Coordinate {
    return {
      x: cell.coordinate.x * cell_size_px + cell_size_px / 2 + (cell.coordinate.x + 1) * cell_margin_px,
      y: cell.coordinate.y * cell_size_px + cell_size_px / 2 + (cell.coordinate.y + 1) * cell_margin_px
    }
  }

  const startPos: Coordinate = getCellGlobalCenter(startCell);
  const endPos: Coordinate = getCellGlobalCenter(endCell);

  const midpoint: Coordinate = { x: (startPos.x + endPos.x) / 2, y: (startPos.y + endPos.y) / 2 };
  const length: number = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));

  const MATCH_BEAM_WIDTH = 10;

  matchAnimationGraphics.clear()
    .rect(length / -2, MATCH_BEAM_WIDTH / -2, length, MATCH_BEAM_WIDTH)
    .fill('red');

  const dx = (startPos.x - endPos.x);
  const dy = (startPos.y - endPos.y);

  console.log(`
    startPos: (${startPos.x}, ${startPos.y}), 
    endPos: (${endPos.x}, ${endPos.y}),
    dx: ${dx},
    dy: ${dy}
  `);

  const theta = Math.atan(dy / dx);

  matchAnimationGraphics.position.set(midpoint.x, midpoint.y);
  matchAnimationGraphics.rotation = theta;
}

function failMatch(cell1: Cell, cell2: Cell): void {
  
}

function successMatch(cell1: Cell, cell2: Cell): void {
  [cell1, cell2].forEach((cell) => {
    cell.value = null;
    cell.update();
    cell.draw();
  })
}


function tryMatch(startCell: Cell, endCell: Cell) {
  if (!isMatch(startCell, endCell)) {
    startCell.selected = false;
    firstSelected = endCell;
    return;
  }

  const deltaY = endCell.coordinate.y - startCell.coordinate.y;
  const deltaX = endCell.coordinate.x - startCell.coordinate.x;

  let firstCell: Cell;
  let secondCell: Cell;

  let tempCoord: Coordinate;
  let stepIncrement: Coordinate;
  let isWrapMatch = false;

  // find match type
  if (deltaY === 0) { //horizontal
    [firstCell, secondCell] = deltaX > 0 ? [startCell, endCell] : [firstCell, secondCell] = [endCell, startCell];
    stepIncrement = {x: 1, y: 0};
    
  } else if (deltaX === 0) { // vertical
    [firstCell, secondCell] = deltaY > 0 ? [startCell, endCell] : [firstCell, secondCell] = [endCell, startCell];
    stepIncrement = {x: 0, y: 1};

  } else if (Math.abs(deltaY) === Math.abs(deltaX)) { // diagonal
    [firstCell, secondCell] = deltaY > 0 ? [startCell, endCell] : [firstCell, secondCell] = [endCell, startCell];
    if (deltaY > 0) { // down
      if (deltaX > 0) { // right
        stepIncrement = {x: 1, y: 1};
      } else { // left
        stepIncrement = {x: -1, y: 1};
      }
    } else { // up
      if (deltaX > 0) { // right
        stepIncrement = {x: 1, y: -1};
      } else { // left
        stepIncrement = {x: -1, y: -1};
      }
    }
  } else { // wrap
    stepIncrement = {x: 1, y: 0};
    isWrapMatch = true;
  }

  // begin check
  tempCoord = startCell.coordinate;
  const endCoord = endCell.coordinate;
  
  // while valid
  
  const MAX_MATCH_DIST = 500;

  for (let i = 0; i < MAX_MATCH_DIST; i++) {
    stepTestCoord(tempCoord, stepIncrement);


    if (tempCoord.x >= board_width) {
      if (isWrapMatch) {
        tempCoord = {x: 0, y: tempCoord.y - 1}
        continue;
      }

      failMatch(startCell, endCell);
      break;
    }

    if (tempCoord.x === endCoord.x && tempCoord.y === endCoord.y) {
      successMatch(startCell, endCell);
      break;
    }

    if (grid[tempCoord.y][tempCoord.x].value !== null) {
      failMatch(startCell, endCell);
      break;
    }

  }
}


(async () => {
  const app = new PIXI.Application();

  // @ts-ignore
  globalThis.__PIXI_APP__ = app;

  await app.init({ background: "white", resizeTo: window });

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const mainContainer = new PIXI.Container();
  app.stage.addChild(mainContainer);

  for (let i = 0; i < initial_board_height; i++) {
    grid.push([]);
    for (let j = 0; j < board_width; j++) {
      const temp_cell = new Cell({x: j, y: i});

      mainContainer.addChild(temp_cell.container);
      if (i < initial_fill_rows) {
        temp_cell.value = Math.floor(Math.random() * 9) + 1;
      }
      temp_cell.draw();

      grid[i].push();
    }
  }

  mainContainer.addChild(matchAnimationContainer);


  app.ticker.add(() => {
  });
})();
