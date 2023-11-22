import leaflet from "leaflet";
import luck from "./luck";

export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius / this.tileWidth;
    this.knownCells = new Map();
  }

  getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i: i, j: j });
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: Math.floor(point.lat / this.tileWidth),
      j: Math.floor(point.lng / this.tileWidth),
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return leaflet.latLngBounds([
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [(cell.i + 1) * this.tileWidth, (cell.j + 1) * this.tileWidth],
    ]);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let currLatMod = -this.tileVisibilityRadius;
      currLatMod < this.tileVisibilityRadius;
      currLatMod++
    ) {
      for (
        let currLongMod = -this.tileVisibilityRadius;
        currLongMod < this.tileVisibilityRadius;
        currLongMod++
      ) {
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

interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Coin {
  cell: Cell;
  serial: number;

  constructor(cell: Cell, serial: number) {
    this.cell = cell;
    this.serial = serial;
  }

  toNameString(): string {
    return `${this.cell.i}:${this.cell.j}#${this.serial}`;
  }
}

export class Geocache implements Momento<string> {
  cell: Cell;
  private currCoins: Coin[];
  private board: Board;
  constructor(cell: Cell, board: Board, coinArray?: Coin[]) {
    this.cell = cell;
    this.board = board;
    if (coinArray != undefined) {
      this.currCoins = coinArray;
      return this;
    }
    this.currCoins = [];
    const startCoinNum = Math.floor(
      luck([cell.i, cell.j, "startNum"].toString()) * 5,
    );
    for (let serialNum = 0; serialNum < startCoinNum; serialNum++) {
      this.addCoin(new Coin(cell, serialNum));
    }
  }

  addCoin(coin: Coin) {
    this.currCoins.push(coin);
  }

  removeCoin(currCoin: string): Coin | undefined {
    const removedCoin = this.currCoins.find((coin) => {
      return coin.toNameString() == currCoin;
    });
    if (removedCoin != undefined) {
      this.currCoins = this.currCoins.filter((coin) => coin != removedCoin);
    }
    return removedCoin;
  }

  getNumCoins(): number {
    return this.currCoins.length;
  }

  getCoinNames(): string[] {
    return this.currCoins.map((coin) => coin.toNameString());
  }

  toMomento() {
    return JSON.stringify(this);
  }

  fromJSON(json: string): Geocache {
    const data = JSON.parse(json) as Geocache;
    const geocache = new Geocache(
      this.board.getCanonicalCell({
        i: data.cell.i,
        j: data.cell.j,
      }),
      this.board,
      data.currCoins,
    );
    const currCoins: Coin[] = [];
    geocache.currCoins.forEach((_coin, index) =>
      currCoins.push(new Coin(geocache.cell, index)),
    );
    geocache.currCoins = currCoins;
    return geocache;
  }

  fromMomento(momento: string) {
    const recoveredGeocache = JSON.parse(momento) as Geocache;
    this.cell = recoveredGeocache.cell;
    this.currCoins = recoveredGeocache.currCoins;
  }
}
