import "leaflet/dist/leaflet.css";
import "./style.css";
import leaflet from "leaflet";
import luck from "./luck";
import "./leafletWorkaround";
import { Board, Geocache, Cell, Coin } from "./board";

const MERRILL_CLASSROOM = leaflet.latLng({
  lat: 36.9995,
  lng: -122.0533,
});

const NULL_ISLAND = leaflet.latLng({
  lat: 0,
  lng: 0,
});

const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 1e-3;
//const NEIGHBORHOOD_SIZE = 8;
const PIT_SPAWN_PROBABILITY = 0.1;

const mapBoard = new Board(TILE_DEGREES, NEIGHBORHOOD_SIZE);

const mapContainer = document.querySelector<HTMLElement>("#map")!;
const momentos = new Map<Cell, string>();
let currPits: leaflet.Rectangle[] = [];
const currCoins: Coin[] = [];

const map = leaflet.map(mapContainer, {
  center: NULL_ISLAND,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      // eslint-disable-next-line @typescript-eslint/quotes
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerPos = leaflet.latLng(MERRILL_CLASSROOM);
const playerMarker = leaflet.marker(MERRILL_CLASSROOM);
moveMapToPlayer();
playerMarker.bindTooltip("That's you!");
playerMarker.addTo(map);

function moveMapToPlayer() {
  currPits.forEach((pit) => pit.remove());
  currPits = [];
  spawnCache(playerPos);
  map.setView(playerMarker.getLatLng());
}

const sensorButton = document.querySelector("#sensor")!;
sensorButton.addEventListener("click", () => {
  navigator.geolocation.watchPosition((position) => {
    playerPos.lat = position.coords.latitude;
    playerPos.lng = position.coords.longitude;
    moveMapToPlayer();
  });
});

const moveSouthButton = document.querySelector("#south")!;
moveSouthButton.addEventListener("click", () => {
  moveMapToPlayer();
  playerMarker.getLatLng().lat -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const moveNorthButton = document.querySelector("#north")!;
moveNorthButton.addEventListener("click", () => {
  moveMapToPlayer();
  playerMarker.getLatLng().lat += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const moveEastButton = document.querySelector("#east")!;
moveEastButton.addEventListener("click", () => {
  moveMapToPlayer();
  playerMarker.getLatLng().lng += 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

const moveWestButton = document.querySelector("#west")!;
moveWestButton.addEventListener("click", () => {
  moveMapToPlayer();
  playerMarker.getLatLng().lng -= 0.0001;
  const markerLatLng = playerMarker.getLatLng();
  playerMarker.setLatLng(markerLatLng);
  map.setView(playerMarker.getLatLng());
});

/*
let points = 0;
const coins: string[] = [];
*/
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = "No points yet...";

function makePit(cell: Cell) {
  const allCache: Geocache = new Geocache(cell, mapBoard);

  if (momentos.has(cell)) {
    allCache.fromMomento(momentos.get(cell)!);
  }

  const currBounds = mapBoard.getCellBounds(cell);
  const pit = leaflet.rectangle(currBounds);
  currPits.push(pit);

  pit.bindPopup(() => {
    const container = document.createElement("div");
    const popUp = document.createElement("span");
    popUp.innerHTML = `Coins in cache: <span id="cellCoords">${cell.i}, ${
      cell.j
    }</span> contains <span id="numCoins">${allCache.getNumCoins()} coins</span>`;
    const deposit = document.createElement("button");
    deposit.innerHTML = "Deposit";
    const currButton = document.createElement("div");

    /*
    popUp.innerHTML = `Cache: <span id="cellCoords">${cell.i}, ${
      cell.j
    }</span> contains <span id="numCoins">${allCache.getNumCoins()} coins</span>`;*/

    allCache.getCoinNames().forEach((currCoin) => {
      //const const currButton = createButton
      const thisButton = document.createElement("button");
      thisButton.innerText = currCoin;
      thisButton.addEventListener("click", () => {
        const holdingCoin = allCache.removeCoin(currCoin);
        if (holdingCoin != undefined) {
          currCoins.push(holdingCoin);
          statusPanel.innerText = `withdrawn coin: ${holdingCoin.toNameString()}`;
          thisButton.hidden = true;
          container.querySelector<HTMLSpanElement>("#numCoins")!.innerText =
            `${allCache.getNumCoins().toString()} coins`;
          statusPanel.innerText = `${currCoins.length} points accumulated`;
          momentos.set(cell, allCache.toMomento());
        }
      });
      currButton.append(thisButton);
    });

    deposit.addEventListener("click", () => {
      const holdingCoin = currCoins.pop();
      if (holdingCoin !== undefined) {
        allCache.addCoin(holdingCoin);
        statusPanel.innerText = `deposited coin: ${holdingCoin.toNameString()}`;
        //const button = createButton(holdingCoin.toNameString());

        const thisButton = document.createElement("button");
        thisButton.innerText = holdingCoin.toNameString();
        thisButton.addEventListener("click", () => {
          const newholdingCoin = allCache.removeCoin(
            holdingCoin.toNameString(),
          );
          if (newholdingCoin != undefined) {
            currCoins.push(newholdingCoin);
            statusPanel.innerText = `withdrawn coin: ${newholdingCoin.toNameString()}`;
            thisButton.hidden = true;
            container.querySelector<HTMLSpanElement>("#numCoins")!.innerText =
              `${allCache.getNumCoins().toString()} coins`;
            statusPanel.innerText = `${currCoins.length} points accumulated`;
            momentos.set(cell, allCache.toMomento());
          }
        });

        currButton.append(thisButton);
      }
    });

    container.append(popUp, deposit, currButton);
    return container;
  });

  pit.addTo(map);
}

function spawnCache(currPos: leaflet.LatLng) {
  const nearbyCells = mapBoard.getCellsNearPoint(currPos);
  nearbyCells.forEach((cell) => {
    if (luck([cell.i, cell.j].toString()) < PIT_SPAWN_PROBABILITY) {
      makePit(cell);
    }
  });
}
