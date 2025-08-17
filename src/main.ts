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
      this.handleClick();
    });
  }

  handleClick() {
    if (this.value !== null) {
      this.selected = !this.selected;
      console.log(`click cell (${this.coordinate.x}, ${this.coordinate.y}), value: ${this.value}, selected ${this.selected}`);
      this.background.clear()
      this.background.rect(cell_margin_px, cell_margin_px, cell_size_px, cell_size_px)
      
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
    throw new Error(`isMatch() called with null cell values (cell1: ${cell1.value}, cell2: ${cell2.value})`);
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

function matchAnimation(startCell: Cell, endCell: Cell, isWrap: boolean): void {

  const MATCH_BEAM_WIDTH = 10;

  function getCellGlobalCenter(cell: Cell): Coordinate {
    return {
      x: cell.coordinate.x * cell_size_px + cell_size_px / 2 + (cell.coordinate.x + 1) * cell_margin_px,
      y: cell.coordinate.y * cell_size_px + cell_size_px / 2 + (cell.coordinate.y + 1) * cell_margin_px
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
  
  const MAX_MATCH_DIST = 500;

  console.log('starting match loop, grid:', grid);

  for (let i = 0; i < MAX_MATCH_DIST; i++) {
    console.log(`stepping test coord -> initial: (${tempCoord.x}, ${tempCoord.y})`);
    stepTestCoord(tempCoord, stepIncrement);
    console.log(`stepping test coord -> result: (${tempCoord.x}, ${tempCoord.y})`);

    if (tempCoord.y < 0 || tempCoord.y >= grid.length) {
      console.log(`MATCH FAILED -> vertical edge reached`);
      failMatch(startCell, endCell);
      break;
    }

    if (tempCoord.x >= board_width || tempCoord.x < 0) {
      
      // wrap logic
      if (isWrapMatch) {
        if (tempCoord.x < 0) {
          tempCoord = {x: board_width + 1, y: tempCoord.y - 1}
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

  await app.init({ background: "white", resizeTo: window });

  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const mainContainer = new PIXI.Container();
  app.stage.addChild(mainContainer);

  for (let i = 0; i < initial_board_height; i++) {
    grid.push([]);
    for (let j = 0; j < board_width; j++) {
      const temp_cell = new Cell({x: j, y: i});
      grid[i].push(temp_cell);

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
