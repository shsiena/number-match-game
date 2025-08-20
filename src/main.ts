import * as PIXI from "pixi.js";

const CELL_SIZE: number = 40; // pixels
const CELL_MARGIN: number = 4; // pixels
const INITIAL_FILL_ROWS: number = 4;
const BOARD_WIDTH = 20;
const INITIAL_BOARD_HEIGHT = 20;

const SELECTED_CELL_COLOR = new PIXI.Color('#45454d');
const UNSELECTED_CELL_COLOR = new PIXI.Color('gray');
const BACKGROUND_COLOR = new PIXI.Color('#232327');

const grid: Array<Array<Cell>> = [];
let firstSelected: Cell | null = null;


const matchAnimationGraphics: PIXI.Graphics = new PIXI.Graphics();
const matchAnimationContainer: PIXI.Container = new PIXI.Container()
  .addChild(matchAnimationGraphics);

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

    this.container.position.x = this.coordinate.x * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN;
    this.container.position.y = this.coordinate.y * (CELL_SIZE + CELL_MARGIN) + CELL_MARGIN;

    this.container.eventMode = 'static';
    this.container.on('pointerdown', () => {
      this.handleClick();
    });
  }

  handleClick() {
    if (this.value !== null) {
      this.selected = !this.selected;
      console.log(`click cell (${this.coordinate.x}, ${this.coordinate.y}), value: ${this.value}, selected ${this.selected}`);
      this.background.clear()
      this.background.rect(CELL_MARGIN, CELL_MARGIN, CELL_SIZE, CELL_SIZE)
      
      this.updateSelected();

      if (this.selected && firstSelected === null) {
        firstSelected = this;
      } else if (firstSelected !== null) {
        tryMatch(firstSelected, this);
      }
    }
  }

  updateSelected() {
    if (this.selected) {
      this.background.fill(SELECTED_CELL_COLOR);
    } else {
      this.background.fill(UNSELECTED_CELL_COLOR);
    }
  }


  draw() {
    this.background.clear();
    this.background.rect(CELL_MARGIN, CELL_MARGIN, CELL_SIZE, CELL_SIZE)
      .fill(UNSELECTED_CELL_COLOR);


    if (this.value !== null) {
      this.display_value.text = this.value;
      this.display_value.anchor.set(0.5);
      
      const center_dist_px = (CELL_SIZE + 2 * CELL_MARGIN) / 2; 

      this.display_value.position.x = center_dist_px;
      this.display_value.position.y = center_dist_px;
    } else {
      this.display_value.text = '';
    }
  }
}


function isMatch(cell1: Cell, cell2: Cell): boolean{
  if (cell1.value === null || cell2.value === null) {
    throw new Error(`isMatch() called with null cell values (cell1: ${cell1.value}, cell2: ${cell2.value})`);
  }

  return cell1.value === cell2.value || cell1.value + cell2.value == 10;
}


function stepCoordinate(coord: Coordinate, step: Coordinate) {
  coord.x += step.x;
  coord.y += step.y;
}


function matchAnimation(startCell: Cell, endCell: Cell, isWrap: boolean): void {

  const MATCH_BEAM_WIDTH = 10;

  function getCellGlobalCenter(cell: Cell): Coordinate {
    return {
      x: cell.coordinate.x * CELL_SIZE + CELL_SIZE / 2 + (cell.coordinate.x + 1) * CELL_MARGIN,
      y: cell.coordinate.y * CELL_SIZE + CELL_SIZE / 2 + (cell.coordinate.y + 1) * CELL_MARGIN
    }
  }

  const startPos: Coordinate = getCellGlobalCenter(startCell);
  const endPos: Coordinate = getCellGlobalCenter(endCell);

  matchAnimationGraphics.clear();

  if (!isWrap) {
    const midpoint: Coordinate = { x: (startPos.x + endPos.x) / 2, y: (startPos.y + endPos.y) / 2 };
    const length: number = Math.sqrt(Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2));
    matchAnimationGraphics.rect(length / -2, MATCH_BEAM_WIDTH / -2, length, MATCH_BEAM_WIDTH)
      .fill('red');

    const dx = (startPos.x - endPos.x);
    const dy = (startPos.y - endPos.y);
    const theta = Math.atan(dy / dx);

    matchAnimationGraphics.position.set(midpoint.x, midpoint.y);
    matchAnimationGraphics.rotation = theta;

    console.log(`
      startPos: (${startPos.x}, ${startPos.y}), 
      endPos: (${endPos.x}, ${endPos.y}),
      dx: ${dx},
      dy: ${dy}
    `);
  } else {
    
  }
}

function failMatch(cell1: Cell, cell2: Cell): void {
  [cell1, cell2].forEach((cell) => {
    cell.selected = false;
    cell.updateSelected();
    cell.draw();
  });
  firstSelected = null;
}


function successMatch(cell1: Cell, cell2: Cell, isWrap: boolean): void {
  matchAnimation(cell1, cell2, isWrap);
  [cell1, cell2].forEach((cell) => {
    cell.value = null;
    cell.updateSelected();
    cell.draw();
  });
  firstSelected = null;
}


function tryMatch(startCell: Cell, endCell: Cell) {
  console.log(`tryMatch call -> (${startCell.coordinate.x}, ${startCell.coordinate.y}), (${endCell.coordinate.x}, ${endCell.coordinate.y})`);
 
  if (!isMatch(startCell, endCell)) {
    startCell.selected = false;
    startCell.updateSelected();
    startCell.draw();
    firstSelected = endCell;
    return;
  }

  const MAX_MATCH_DIST = 500;

  const deltaY = endCell.coordinate.y - startCell.coordinate.y;
  const deltaX = endCell.coordinate.x - startCell.coordinate.x;

  const startCellAbove: boolean = deltaY > 0;
  const startCellLeft: boolean = deltaX > 0;

  const horizontalMatch: boolean = deltaY === 0;
  const verticalMatch: boolean = deltaX === 0;
  const diagonalMatch: boolean = Math.abs(deltaY) === Math.abs(deltaX);

  let firstCell: Cell;
  let secondCell: Cell;

  let tempCoord: Coordinate;
  let stepIncrement: Coordinate;
  let isWrapMatch = false;

  const matchStepDirs: Record<string, Coordinate> = {
    left: {x: 1, y: 0},
    right: {x: -1, y: 0},
    up: {x: 0, y: -1},
    down: {x: 0, y: 1},
    diag_down_right: {x: 1, y: 1},
    diag_down_left: {x: -1, y: 1},
    diag_up_right: {x: 1, y: -1},
    diag_up_left: {x: -1, y: -1},
  }

  // find match type
  if (horizontalMatch) { //horizontal
    console.log(`HORIZONTAL MATCH`);
    [firstCell, secondCell] = startCellLeft ? [startCell, endCell] : [endCell, startCell];
    stepIncrement = matchStepDirs.left;
    
  } else if (verticalMatch) { // vertical
    console.log(`VERTICAL MATCH`);
    [firstCell, secondCell] = startCellAbove ? [startCell, endCell] : [endCell, startCell];
    stepIncrement = matchStepDirs.down;

  } else if (diagonalMatch) { // diagonal
    [firstCell, secondCell] = [startCell, endCell];
    if (startCellAbove) { // down
      if (startCellLeft) { // right
        console.log(`DIAGONAL DOWN RIGHT MATCH`);
        stepIncrement = matchStepDirs.diag_down_right;
      } else { // left
        console.log(`DIAGONAL DOWN LEFT MATCH`);
        stepIncrement = matchStepDirs.diag_down_left;
      }
    } else { // up
      if (startCellLeft) { // right
        console.log(`DIAGONAL UP RIGHT MATCH`);
        stepIncrement = matchStepDirs.diag_up_right;
      } else { // left
        console.log(`DIAGONAL UP LEFT MATCH`);
        stepIncrement = matchStepDirs.diag_up_left;
      }
    }
  } else { // wrap
    [firstCell, secondCell] = startCellAbove ? [startCell, endCell] : [endCell, startCell];
    console.log(`WRAP MATCH`);
    stepIncrement = matchStepDirs.left;
    isWrapMatch = true;
  }

  console.log(`CELL SELECTION FINISHED -> start: ${JSON.stringify(startCell.coordinate)}, end: ${JSON.stringify(endCell.coordinate)}`);

  tempCoord = structuredClone(firstCell.coordinate);
  const endCoord = structuredClone(secondCell.coordinate);
  
  console.log('starting match loop, grid:', grid);

  for (let i = 0; i < MAX_MATCH_DIST; i++) {
    console.log(`stepping test coord -> initial: (${tempCoord.x}, ${tempCoord.y})`);
    stepCoordinate(tempCoord, stepIncrement);
    console.log(`stepping test coord -> result: (${tempCoord.x}, ${tempCoord.y})`);

    if (tempCoord.y < 0 || tempCoord.y >= grid.length) {
      console.log(`MATCH FAILED -> vertical edge reached`);
      failMatch(startCell, endCell);
      break;
    }

    if (tempCoord.x >= BOARD_WIDTH || tempCoord.x < 0) {
      
      // wrap logic
      if (isWrapMatch) {
        if (tempCoord.x < 0) {
          tempCoord = {x: BOARD_WIDTH + 1, y: tempCoord.y - 1}
        } else {
          tempCoord = {x: -1, y: tempCoord.y + 1}
        }

        continue;
      }

      console.log(`MATCH FAILED -> horizontal edge reached, not wrap match`);
      failMatch(startCell, endCell);
      break;
    }

    if (tempCoord.x === endCoord.x && tempCoord.y === endCoord.y) {
      successMatch(startCell, endCell, isWrapMatch);
      console.log(`SUCCESSFUL MATCH`);
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

  await app.init({ background: BACKGROUND_COLOR, resizeTo: window });

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const mainContainer = new PIXI.Container();
  app.stage.addChild(mainContainer);

  for (let i = 0; i < INITIAL_BOARD_HEIGHT; i++) {
    grid.push([]);
    for (let j = 0; j < BOARD_WIDTH; j++) {
      const temp_cell = new Cell({x: j, y: i});
      grid[i].push(temp_cell);

      mainContainer.addChild(temp_cell.container);
      if (i < INITIAL_FILL_ROWS) {
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
