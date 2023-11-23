import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  knownCells: Map<string, string>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map();
  }

  getCanonicalCell(cell: Cell): Cell {
    const cache = new Geocache(cell);
    const key = [cell.i, cell.j].toString();
    if (!this.knownCells.has(key)) {
      cache.cellCoins(cell);
      this.knownCells.set(key, cache.toMomento());
    }
    return cache.cell;
  }

  updateCurrCells(currBoard: string[][]) {
    currBoard.forEach((cache) => {
      this.knownCells.set(cache[0], cache[1]);
    });
  }

  getCacheForPoint(cell: Cell): Geocache {
    const key = [cell.i, cell.j].toString();
    return new Geocache(cell).fromMomento(this.knownCells.get(key)!);
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Number(point.lat.toFixed(4)),
      j: Number(point.lng.toFixed(4)),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i, cell.j],
      [cell.i + this.tileWidth, cell.j + this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (let currLatMod = -1; currLatMod < 2; currLatMod++) {
      for (let currLongMod = -1; currLongMod < 2; currLongMod++) {
        resultCells.push(
          this.getCanonicalCell({
            i: originCell.i + currLatMod,
            j: originCell.j + currLongMod,
          }),
        );
      }
    }
    return resultCells;
  }
}

export class Coin {
  cell: Cell;
  serial: number;
  id: string;

  constructor(cell: Cell, serial: number) {
    this.cell = cell;
    this.serial = serial;
    this.id = [this.cell.i, this.cell.j, serial].toString();
  }

  toString(): string {
    return this.id;
  }

  toNameString(): string {
    return `${this.cell.i}:${this.cell.j}#${this.serial}`;
  }
}

export class Geocache {
  cell: Cell;
  currCoins: Coin[];
  constructor(cell: Cell) {
    this.cell = cell;
    this.currCoins = [];
  }

  addCoin(coin: Coin) {
    this.currCoins.push(coin);
  }

  removeCoin(currCoin: Coin) {
    this.currCoins.forEach((item, index) => {
      if (item == currCoin) {
        this.currCoins.splice(index, 1);
      }
    });
  }

  cellCoins(currCell: Cell) {
    const totalValue = Math.floor(
      luck([currCell.i, currCell.j, "initialValue"].toString()) * 5,
    );
    for (let currValue = 0; currValue < totalValue + 1; currValue++) {
      const currCoin = new Coin(currCell, currValue);
      this.addCoin(currCoin);
    }
  }

  toMomento() {
    return JSON.stringify(this);
  }

  fromMomento(momento: string) {
    const recoveredGeocache = JSON.parse(momento) as Geocache;
    this.cell = recoveredGeocache.cell;
    this.currCoins = recoveredGeocache.currCoins;
    return this;
  }
}
